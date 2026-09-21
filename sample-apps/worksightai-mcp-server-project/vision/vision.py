# vision.py
import cv2
import numpy as np
from ultralytics import YOLO
import requests
import time
import os
import threading
from concurrent.futures import ThreadPoolExecutor

# ------------------ CONFIGURATION ------------------
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000/api")

# Break logic: If NO faces are detected for this many seconds, trigger a break.
BREAK_THRESHOLD_SECONDS = 5

# How often to send attendance updates (in seconds)
ATTENDANCE_INTERVAL = 10

# Phone alert cooldown (in seconds) to prevent API spamming
PHONE_ALERT_COOLDOWN = 5.0

# YOLO Classes: 0 = person, 67 = cell phone
FACE_CLASS_ID = 0
PHONE_CLASS_ID = 67

# ThreadPoolExecutor for Non-blocking (Async) HTTP API calls
api_executor = ThreadPoolExecutor(max_workers=3)

# ------------------ 60 FPS MJPEG STREAM SERVER FOR NITROSTACK ------------------
from flask import Flask, Response
stream_app = Flask("vision_mjpeg_stream")
latest_stream_frame = None

def gen_mjpeg_stream():
    global latest_stream_frame
    while True:
        if latest_stream_frame is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + latest_stream_frame + b'\r\n')
        time.sleep(0.03)

@stream_app.route('/video_feed')
def video_feed():
    res = Response(gen_mjpeg_stream(), mimetype='multipart/x-mixed-replace; boundary=frame')
    res.headers['Access-Control-Allow-Origin'] = '*'
    res.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return res

def _start_mjpeg_server():
    stream_app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False, threaded=True)

threading.Thread(target=_start_mjpeg_server, daemon=True).start()
print("📡 Dedicated 60 FPS MJPEG Streamer running on http://localhost:5001/video_feed")
# ---------------------------------------------------------------------------------

# ------------------ FAST DECOUPLED CAMERA THREAD ------------------
class AsyncCameraStream:
    """
    Dedicated thread for reading frames from camera or DroidCam stream.
    Supports camera indices (0, 1, 2, 3) and DroidCam WiFi URLs (e.g. http://192.168.1.X:4747/video).
    """
    def __init__(self, source=0):
        self.source = source
        if isinstance(source, str):
            # IP Camera / DroidCam URL
            self.cap = cv2.VideoCapture(source)
        else:
            # DirectShow on Windows or default backend
            self.cap = cv2.VideoCapture(source, cv2.CAP_DSHOW)
            if not self.cap.isOpened():
                self.cap = cv2.VideoCapture(source)

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        self.ret, self.frame = self.cap.read()
        self.running = True
        self.lock = threading.Lock()
        
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()

    def _capture_loop(self):
        while self.running:
            ret, frame = self.cap.read()
            if ret and frame is not None:
                with self.lock:
                    self.ret = ret
                    self.frame = frame.copy()
            time.sleep(0.005)  # Fast poll without spinning CPU

    def read(self):
        with self.lock:
            if not self.ret or self.frame is None:
                return False, None
            return True, self.frame.copy()

    def stop(self):
        self.running = False
        if self.thread.is_alive():
            self.thread.join(timeout=1.0)
        self.cap.release()

def init_async_camera():
    # 1. Check for explicit DroidCam URL or CAMERA_SOURCE env var
    droidcam_source = os.getenv("DROIDCAM_URL") or os.getenv("CAMERA_SOURCE")
    if droidcam_source:
        print(f"📷 Connecting to DroidCam source: {droidcam_source}")
        source_val = int(droidcam_source) if droidcam_source.isdigit() else droidcam_source
        stream = AsyncCameraStream(source_val)
        time.sleep(0.5)
        ret, frame = stream.read()
        if ret and frame is not None:
            print(f"✅ DroidCam connected smoothly on {droidcam_source}")
            return stream
        stream.stop()

    # 2. Auto-scan indices [0, 1, 2, 3, 4] for DroidCam virtual camera or webcams
    for idx in [0, 1, 2, 3, 4]:
        print(f"Scanning camera index {idx} for DroidCam / Webcam...")
        stream = AsyncCameraStream(idx)
        time.sleep(0.3)
        ret, frame = stream.read()
        if ret and frame is not None:
            print(f"✅ Camera / DroidCam connected on index {idx}")
            return stream
    print("⚠️ Warning: Could not immediately connect to camera on indices 0-4. Retrying camera connection...")
    for retry in range(5):
        time.sleep(1.0)
        for idx in [0, 1, 2, 3]:
            stream = AsyncCameraStream(idx)
            time.sleep(0.3)
            ret, frame = stream.read()
            if ret and frame is not None:
                print(f"✅ Camera / DroidCam connected on index {idx} after retry!")
                return stream
            stream.stop()
    return None

cam_stream = init_async_camera()
if cam_stream is None:
    print("❌ ERROR: Could not access DroidCam or Webcam. Please start DroidCam or connect your camera.")
    exit(1)

# ------------------ ASYNC YOLO INFERENCE THREAD ------------------
print("Loading YOLO model...")
model = YOLO("yolov8n.pt")
print("YOLO model loaded successfully!")

# Shared detection state
detection_lock = threading.Lock()
cached_boxes = []
cached_face_ids = set()
cached_phone_detected = False
yolo_running = True

def yolo_inference_loop():
    """
    Runs YOLO detection in a separate background thread so inference NEVER delays camera rendering!
    """
    global cached_boxes, cached_face_ids, cached_phone_detected, yolo_running
    
    while yolo_running:
        ret, frame = cam_stream.read()
        if not ret or frame is None:
            time.sleep(0.05)
            continue

        try:
            # Resize frame for sub-10ms inference
            small_frame = cv2.resize(frame, (320, 240))
            results = model(small_frame, imgsz=256, verbose=False)
            
            boxes = results[0].boxes
            new_detected_face_ids = set()
            new_phone_detected = False
            new_box_render_list = []

            h_scale = frame.shape[0] / 240.0
            w_scale = frame.shape[1] / 320.0

            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                
                if conf < 0.45:
                    continue

                sx1, sy1, sx2, sy2 = map(float, box.xyxy[0])
                x1, y1, x2, y2 = int(sx1 * w_scale), int(sy1 * h_scale), int(sx2 * w_scale), int(sy2 * h_scale)

                if cls_id == PHONE_CLASS_ID:
                    new_phone_detected = True
                    new_box_render_list.append(("phone", x1, y1, x2, y2, None))

                elif cls_id == FACE_CLASS_ID:
                    frame_width = frame.shape[1]
                    if x1 < frame_width // 3:
                        student_id = 1
                    elif x1 < 2 * frame_width // 3:
                        student_id = 2
                    else:
                        student_id = 3
                    
                    new_detected_face_ids.add(student_id)
                    new_box_render_list.append(("face", x1, y1, x2, y2, student_id))

            with detection_lock:
                cached_boxes = new_box_render_list
                cached_face_ids = new_detected_face_ids
                cached_phone_detected = new_phone_detected

        except Exception as e:
            print(f"Warning in YOLO worker: {e}")

        time.sleep(0.08)  # Run detection ~12 times per second in background

inference_thread = threading.Thread(target=yolo_inference_loop, daemon=True)
inference_thread.start()

# ------------------ ASYNC API DISPATCHERS ------------------
def _do_post(url, json_payload):
    try:
        requests.post(url, json=json_payload, timeout=2)
    except Exception as e:
        print(f"Warning: Background API request failed ({url}): {e}")

def _do_post_raw(url, data_bytes):
    try:
        requests.post(url, data=data_bytes, headers={'Content-Type': 'application/octet-stream'}, timeout=1)
    except Exception:
        pass

def send_attendance_async(student_id, status="present"):
    url = f"{API_BASE_URL}/attendance"
    payload = {"student_id": student_id, "status": status}
    api_executor.submit(_do_post, url, payload)
    print(f"[Async] Attendance queued: Student {student_id} ({status})")

total_phone_alerts_count = 0

def send_phone_alert_async():
    global total_phone_alerts_count
    total_phone_alerts_count += 1
    url = f"{API_BASE_URL}/phone-alert"
    api_executor.submit(_do_post, url, {})
    print("[Async] Phone alert logged!")

def send_vision_state_async(faces_detected, phone_detected, is_break):
    url = f"{API_BASE_URL}/vision-state"
    payload = {
        "faces_detected": faces_detected,
        "phone_detected": phone_detected,
        "phone_alerts": total_phone_alerts_count,
        "is_break": is_break
    }
    api_executor.submit(_do_post, url, payload)

def send_break_async(action):
    url = f"{API_BASE_URL}/break"
    payload = {"action": action}
    api_executor.submit(_do_post, url, payload)
    print(f"[Async] Break {action} logged!")

def get_students():
    try:
        response = requests.get(f"{API_BASE_URL}/students", timeout=2)
        if response.status_code == 200:
            students = response.json()
            print(f"Fetched {len(students)} students from API")
            return students
    except Exception as e:
        print(f"Warning: Could not fetch students from API: {e}. Using fallback roster.")
    return [{"id": i, "name": f"Student {i}"} for i in range(1, 21)]

students = get_students()

# State variables
last_attendance_update = time.time()
last_phone_alert_time = 0.0
last_face_time = time.time()
last_vision_state_sync = 0.0
break_active = False

prev_frame_time = time.time()
fps = 0.0

print("🚀 Fully Threaded Vision Service Started! (Zero Latency Mode)")

# ------------------ MAIN RENDER LOOP (60 FPS UNBLOCKED) ------------------
try:
    while True:
        ret, frame = cam_stream.read()
        if not ret or frame is None:
            time.sleep(0.01)
            continue

        curr_time = time.time()
        time_diff = curr_time - prev_frame_time
        if time_diff > 0:
            fps = 0.9 * fps + 0.1 * (1.0 / time_diff) if fps > 0 else (1.0 / time_diff)
        prev_frame_time = curr_time

        # Read latest detection state thread-safely
        with detection_lock:
            current_boxes = list(cached_boxes)
            current_face_ids = set(cached_face_ids)
            current_phone_detected = cached_phone_detected

        # Sync live detection state to Flask API every 0.8 seconds
        if curr_time - last_vision_state_sync >= 0.8:
            send_vision_state_async(len(current_face_ids), current_phone_detected, break_active)
            last_vision_state_sync = curr_time

        # Render bounding boxes instantly
        for item in current_boxes:
            btype, x1, y1, x2, y2, sid = item
            if btype == "phone":
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(frame, "PHONE DETECTED!", (x1, max(y1 - 10, 20)), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            elif btype == "face":
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, f"Student {sid}", (x1, max(y1 - 10, 20)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # Break tracking
        if len(current_face_ids) > 0:
            last_face_time = curr_time
            if break_active:
                send_break_async("end")
                break_active = False
                print("Class resumed!")
        else:
            if not break_active and (curr_time - last_face_time) > BREAK_THRESHOLD_SECONDS:
                send_break_async("start")
                break_active = True
                print("Break started!")

        # Periodic attendance update
        if curr_time - last_attendance_update >= ATTENDANCE_INTERVAL:
            for sid in current_face_ids:
                send_attendance_async(sid, "present")
            last_attendance_update = curr_time

        # Phone alert cooldown
        if current_phone_detected and (curr_time - last_phone_alert_time >= PHONE_ALERT_COOLDOWN):
            send_phone_alert_async()
            last_phone_alert_time = curr_time

        # Display UI stats
        status_text = "Active" if len(current_face_ids) > 0 else "No Faces"
        if break_active:
            status_text = "BREAK"

        cv2.putText(frame, f"Status: {status_text}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        cv2.putText(frame, f"Faces: {len(current_face_ids)} | Phone: {'YES' if current_phone_detected else 'NO'}", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.putText(frame, f"FPS: {fps:.1f}", (frame.shape[1] - 120, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        # Stream frame to 60 FPS MJPEG server on port 5001 for NitroStack Web Widget
        ret_jpg, jpeg_buf = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
        if ret_jpg:
            latest_stream_frame = jpeg_buf.tobytes()

        cv2.imshow("Attendance AI - Vision Service", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

finally:
    yolo_running = False
    cam_stream.stop()
    cv2.destroyAllWindows()
    api_executor.shutdown(wait=False)
    print("Vision service stopped gracefully.")
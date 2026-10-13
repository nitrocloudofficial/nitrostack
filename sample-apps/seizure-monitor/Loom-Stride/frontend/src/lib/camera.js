export class CameraHelper {
  constructor() {
    this.stream = null;
  }

  async startCamera(videoElement) {
    if (this.stream) {
      this.stopCamera();
    }

    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = this.stream;
      await videoElement.play();
      return true;
    } catch (error) {
      console.warn('Camera access failed, falling back to upload:', error);
      return false;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  async compressImage(dataUrl, maxWidth = 1000, maxHeight = 1000) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Aggressive compression to 0.65 quality (produces ~100KB payload)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
        // Strip data url prefix for clean base64 string
        const cleanBase64 = compressedDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        resolve(cleanBase64);
      };
      img.onerror = () => {
        const fallback = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        resolve(fallback);
      };
      img.src = dataUrl;
    });
  }

  async capturePhoto(videoElement) {
    if (!this.stream) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const compressedDataUrl = await this.compressImage(rawDataUrl);

    return {
      fileName: `foot-capture-${Date.now()}.jpg`,
      fileType: 'image/jpeg',
      fileContent: compressedDataUrl
    };
  }

  async processUploadedFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const compressed = await this.compressImage(e.target.result);
          resolve({
            fileName: file.name,
            fileType: 'image/jpeg', // output is jpeg after compression
            fileContent: compressed
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
}

export const camera = new CameraHelper();

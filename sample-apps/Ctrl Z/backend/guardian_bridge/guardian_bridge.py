import serial

SERIAL_PORT = "COM5"
BAUD_RATE = 921600

print("Opening serial port...")

ser = serial.Serial(
    SERIAL_PORT,
    BAUD_RATE,
    timeout=0.1
)

print("Connected!")

while True:
    try:
        data = ser.read(4096)

        if data:
            print(repr(data))

    except KeyboardInterrupt:
        print("Stopped.")
        break
import serial

ser = serial.Serial("COM5", 921600, timeout=1)

print("Connected!")

while True:
    try:
        line = ser.readline()
        print(line)
    except Exception as e:
        print(e)
        break
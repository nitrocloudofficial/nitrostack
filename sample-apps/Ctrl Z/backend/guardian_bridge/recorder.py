from runtime import GuardianRuntime
from pathlib import Path

ACTIVITIES = {
    "1": "walking",
    "2": "sitting",
    "3": "standing",
    "4": "breathing",
    "5": "fall",
    "6": "empty_room"
}


def get_next_filename(activity):

    folder = Path("../../datasets/raw") / activity

    folder.mkdir(parents=True, exist_ok=True)

    existing = list(folder.glob("*.jsonl"))

    filename = f"{activity}_{len(existing)+1:03d}.jsonl"

    return folder / filename


def main():

    print("=" * 50)
    print(" GuardianSense Dataset Recorder ")
    print("=" * 50)

    print()

    for key, value in ACTIVITIES.items():

        print(f"{key}. {value.replace('_', ' ').title()}")

    print()

    choice = input("Select Activity: ").strip()

    if choice not in ACTIVITIES:

        print("Invalid choice.")

        return

    activity = ACTIVITIES[choice]

    duration = int(input("Recording Duration (seconds): "))

    output = get_next_filename(activity)

    runtime = GuardianRuntime()

    runtime.start(str(output))

    print(f"\nRecording {activity}...\n")

    packets = runtime.record(duration)

    runtime.stop()

    print()

    print("=" * 50)

    print("Recording Complete!")

    print(f"Packets Captured : {packets}")

    print(f"Saved To         : {output}")

    print("=" * 50)


if __name__ == "__main__":

    main()
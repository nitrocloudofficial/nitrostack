from app import app


def display_response(result):
    """
    Display AEIOS-X responses in a user-friendly format.
    """

    print("AEIOS-X >")

    if not result.get("success"):
        print(f"❌ Error: {result.get('error')}")
        return

    response = result.get("result")

    # If handler returns EnterpriseResponse.to_dict()
    if isinstance(response, dict):

        answer = response.get("result")

        if isinstance(answer, str):
            print(answer)

        elif isinstance(answer, dict):
            for key, value in answer.items():
                print(f"{key}: {value}")

        elif isinstance(answer, list):
            for item in answer:
                print(item)

        else:
            print(answer)

        return

    # If handler returns EnterpriseResponse object
    if hasattr(response, "result"):
        print(response.result)
        return

    # Plain string
    print(response)


def main():
    print("=" * 70)
    print("        AEIOS-X Enterprise Assistant")
    print("=" * 70)
    print("Type 'exit' to quit.\n")

    app.start()

    try:
        while True:

            prompt = input("You > ").strip()

            if prompt.lower() in ("exit", "quit"):
                break

            if not prompt:
                continue

            print("\nAEIOS-X is thinking...\n")

            result = app.run_task(
                task_name="enterprise_assistant",
                payload={
                    "prompt": prompt,
                },
                priority=5,
            )

            display_response(result)
            print()

    except KeyboardInterrupt:
        print("\n\nInterrupted by user.")

    finally:
        app.stop()


if __name__ == "__main__":
    main()
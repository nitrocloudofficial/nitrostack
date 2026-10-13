"""Base connectivity check: Groq via LangChain using ChatGroq.

Run from project root:
    source hack/bin/activate
    export GROQ_API_KEY=...
    python agent_base.py
"""
import os
import sys

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

MODEL_NAME = "qwen/qwen3.6-27b"


def get_groq_llm(model: str = MODEL_NAME, temperature: float = 0.2) -> ChatGroq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        sys.stderr.write(
            "GROQ_API_KEY env var missing. "
            "export GROQ_API_KEY=<your-key> before running.\n"
        )
        sys.exit(1)
    return ChatGroq(model=model, temperature=temperature, api_key=api_key)


def main() -> None:
    llm = get_groq_llm()
    messages = [
        SystemMessage(content="You are a terse, friendly assistant."),
        HumanMessage(content="Reply with one short sentence: confirm you can hear me."),
    ]
    print(f"Connecting to Groq model: {MODEL_NAME}\n")
    response = llm.invoke(messages)
    print("LLM response:")
    print(response.content)
    print("\nConnectivity OK.")


if __name__ == "__main__":
    main()

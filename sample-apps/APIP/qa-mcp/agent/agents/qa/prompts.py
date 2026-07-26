class PromptManager:
    @staticmethod
    def get_prompt(prompt_type: str, context: dict) -> str:
        # Dynamic loader logic can be added here
        return f"Prompt for {prompt_type} with {context}"

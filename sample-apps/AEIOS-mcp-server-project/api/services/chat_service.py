from kernel.bootstrap import Bootstrap


class ChatService:

    def __init__(self):

        self.bootstrap = Bootstrap()

        self.kernel = self.bootstrap.start()

    def chat(self, message: str):

        return self.kernel.run(

            task_name="enterprise_assistant",

            payload={
                "query": message,
            },

            priority=5,
        )


chat_service = ChatService()
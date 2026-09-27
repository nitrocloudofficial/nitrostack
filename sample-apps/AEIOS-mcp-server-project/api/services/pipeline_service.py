from kernel.bootstrap import Bootstrap


class PipelineService:

    def __init__(self):

        self.bootstrap = Bootstrap()

        self.kernel = self.bootstrap.start()

    def status(self):

        return {
            "pipeline": "Enterprise Pipeline",
            "status": "running" if self.kernel.is_running() else "stopped",
            "version": self.kernel.VERSION,
        }

    def info(self):

        return self.kernel.kernel_info()

    def execute(self, query: str):

        result = self.kernel.run(

            task_name="enterprise_assistant",

            payload={
                "query": query,
            },

            priority=5,
        )

        return result

    def reset(self):

        self.kernel.reset()

        return {
            "success": True,
            "message": "Pipeline reset successfully."
        }

    def workflows(self):

        return {
            "workflows": [
                "Enterprise Workflow"
            ]
        }

    def history(self):

        return {
            "history": []
        }


pipeline_service = PipelineService()
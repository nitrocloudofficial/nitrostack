import requests
from deepeval.metrics import AnswerRelevancyMetric, ContextualRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase
from deepeval.models import DeepEvalBaseLLM

class LocalOllamaJudge(DeepEvalBaseLLM):
    """
    Custom DeepEval model wrapper to route judge evaluations 
    to a local Ollama instance instead of OpenAI.
    """
    def __init__(self, model_name: str = "llama3.1"):
        self.model_name = model_name

    def load_model(self):
        # DeepEval requires this method, but we manage state via the Ollama API
        return self.model_name

    def generate(self, prompt: str) -> str:
        """Synchronous generation call to local Ollama."""
        try:
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False
                }
            )
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception as e:
            print(f"Error communicating with local Ollama: {e}")
            return ""

    async def a_generate(self, prompt: str) -> str:
        """Asynchronous generation call (DeepEval relies heavily on async)."""
        # For local Ollama, falling back to the sync call is generally fine,
        # but you could use aiohttp here for true async performance if needed later.
        return self.generate(prompt)

    def get_model_name(self):
        return self.model_name


def run_deepeval_suite(
    input_query: str,
    actual_output: str,
    retrieval_context: list[str],
    threshold: float = 0.7,
    judge_model: str = "llama3.1"
) -> dict[str, float]:
    """
    Evaluates a RAG-grounded clinical report with Faithfulness, Answer Relevancy,
    and Contextual Relevancy metrics using a local Ollama model as the judge,
    returning a dict of metric name -> score.
    """
    # Initialize the local judge
    local_judge = LocalOllamaJudge(model_name=judge_model)

    test_case = LLMTestCase(
        input=input_query,
        actual_output=actual_output,
        retrieval_context=retrieval_context,
    )

    # Inject the local judge into all DeepEval metrics
    metrics = [
        FaithfulnessMetric(threshold=threshold, model=local_judge, include_reason=True),
        AnswerRelevancyMetric(threshold=threshold, model=local_judge, include_reason=True),
        ContextualRelevancyMetric(threshold=threshold, model=local_judge, include_reason=True),
    ]

    scores: dict[str, float] = {}
    for metric in metrics:
        metric.measure(test_case)
        scores[metric.__class__.__name__] = float(metric.score) if metric.score is not None else 0.0

    return scores
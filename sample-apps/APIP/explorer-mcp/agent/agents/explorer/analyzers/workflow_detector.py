"""Workflow detector tracking multi-step user interaction paths."""

from typing import List, Optional
from agents.explorer.models.action import ActionTarget
from agents.explorer.models.workflow import WorkflowStep, WorkflowSequence
from agents.explorer.interfaces import AbstractWorkflowDetector
from agents.explorer.utils.helpers import compute_element_hash
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class WorkflowDetector(AbstractWorkflowDetector):
    """Detects and constructs high-level multi-step functional workflows."""

    def __init__(self):
        self._current_sequence: List[WorkflowStep] = []
        self._completed_workflows: List[WorkflowSequence] = []
        self._step_counter = 0

    def record_transition(self, from_url: str, action: ActionTarget, to_url: str) -> None:
        """Record an action transition step."""
        self._step_counter += 1
        desc = f"Execute {action.action_type.value} on {action.css_selector}"

        step = WorkflowStep(
            step_number=len(self._current_sequence) + 1,
            page_url=from_url,
            action=action,
            description=desc,
            result_page_url=to_url
        )
        self._current_sequence.append(step)

        # Detect terminal workflow boundary (e.g. state change to confirmation, creation, or returning to list)
        if from_url != to_url or action.action_type.value in ("click", "upload_file"):
            if len(self._current_sequence) >= 2:
                self._finalize_current_workflow()

    def _finalize_current_workflow(self) -> None:
        if not self._current_sequence:
            return

        start_url = self._current_sequence[0].page_url
        end_url = self._current_sequence[-1].result_page_url or self._current_sequence[-1].page_url

        wf_id = f"wf_{compute_element_hash('wf', start_url + end_url + str(len(self._completed_workflows)))}"
        name = f"Workflow: {start_url} -> {end_url}"

        sequence = WorkflowSequence(
            workflow_id=wf_id,
            name=name,
            start_url=start_url,
            end_url=end_url,
            steps=list(self._current_sequence),
            is_completed=True
        )

        self._completed_workflows.append(sequence)
        logger.info(f"Detected workflow: '{name}' with {len(sequence.steps)} steps.")
        # Reset current sequence for next workflow
        self._current_sequence = []

    def get_detected_workflows(self) -> List[WorkflowSequence]:
        """Return all detected workflows."""
        # Finalize any pending active sequence
        if len(self._current_sequence) >= 2:
            self._finalize_current_workflow()
        return self._completed_workflows

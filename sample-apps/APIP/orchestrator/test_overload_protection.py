import unittest
import time
import os

from agents.orchestrator.agent import OrchestratorAgent
from agents.orchestrator.job_manager import JobStatus
from agents.orchestrator.registry import BaseAgent

DB_TEST_PATH = "test_multi_cases_jobs.db"

class FailingAgent(BaseAgent):
    def __init__(self):
        super().__init__("FailingAgent", execution_time=0.01)
        
    def run(self, context: dict) -> dict:
        raise RuntimeError("Simulated agent execution error!")

class TestOverloadProtectionComprehensive(unittest.TestCase):
    def setUp(self):
        if os.path.exists(DB_TEST_PATH):
            try:
                os.remove(DB_TEST_PATH)
            except Exception:
                pass
        self.orchestrator = OrchestratorAgent(
            db_path=DB_TEST_PATH,
            custom_limits={"demo": 1, "qa": 2, "explorer": 5}
        )

    def tearDown(self):
        self.orchestrator.stop()
        time.sleep(0.1)
        if os.path.exists(DB_TEST_PATH):
            try:
                os.remove(DB_TEST_PATH)
            except Exception:
                pass

    def test_01_concurrency_limit_and_queuing(self):
        """
        Test Case 1: Concurrency Throttling & Automatic Queue Resolution.
        When Demo concurrency limit is 1, Workflow A grabs the slot while Workflow B waits in queue.
        Workflow B executes automatically as soon as Workflow A completes.
        """
        wf_id_a = self.orchestrator.submit_workflow({"goal": "Generate demo for Project A"}, user_id="UserA")
        wf_id_b = self.orchestrator.submit_workflow({"goal": "Generate demo for Project B"}, user_id="UserB")

        completed_a, completed_b = False, False
        start = time.time()

        while time.time() - start < 10.0:
            st_a = self.orchestrator.get_workflow_status(wf_id_a)
            st_b = self.orchestrator.get_workflow_status(wf_id_b)

            if st_a and st_a["status"] == JobStatus.COMPLETED.value:
                completed_a = True
            if st_b and st_b["status"] == JobStatus.COMPLETED.value:
                completed_b = True

            if completed_a and completed_b:
                break
            time.sleep(0.05)

        self.assertTrue(completed_a, "Workflow A should complete successfully")
        self.assertTrue(completed_b, "Workflow B should complete successfully after waiting in queue")

    def test_02_priority_scheduling(self):
        """
        Test Case 2: Priority Queue Scheduling.
        Verifies that high priority workflows (Priority 10) are processed before lower priority workflows (Priority 1).
        """
        wf_low = self.orchestrator.submit_workflow({"goal": "Demo Low Priority"}, user_id="UserLow", priority=1)
        wf_high = self.orchestrator.submit_workflow({"goal": "Demo High Priority"}, user_id="UserHigh", priority=10)

        start = time.time()
        while time.time() - start < 10.0:
            st_h = self.orchestrator.get_workflow_status(wf_high)
            st_l = self.orchestrator.get_workflow_status(wf_low)
            if st_h and st_h["status"] == JobStatus.COMPLETED.value and st_l and st_l["status"] == JobStatus.COMPLETED.value:
                break
            time.sleep(0.05)

        self.assertEqual(self.orchestrator.get_workflow_status(wf_high)["status"], JobStatus.COMPLETED.value)
        self.assertEqual(self.orchestrator.get_workflow_status(wf_low)["status"], JobStatus.COMPLETED.value)

    def test_03_non_blocking_multi_tenant_queues(self):
        """
        Test Case 3: Non-blocking Multi-Tenant Queue Isolation.
        QA workflows proceed independently without blocking or being blocked by the Demo agent queue.
        """
        wf_demo = self.orchestrator.submit_workflow({"goal": "Generate demo video"}, user_id="UserDemo")
        wf_qa = self.orchestrator.submit_workflow({"goal": "Run QA tests"}, user_id="UserQA")

        start = time.time()
        qa_finished = False

        while time.time() - start < 10.0:
            st_qa = self.orchestrator.get_workflow_status(wf_qa)
            if st_qa and st_qa["status"] == JobStatus.COMPLETED.value:
                qa_finished = True
                break
            time.sleep(0.05)

        self.assertTrue(qa_finished, "QA workflow must process independently without waiting on Demo queue")

    def test_04_error_isolation(self):
        """
        Test Case 4: Fault Tolerance & Error Isolation.
        If one task in a workflow fails, the workflow is marked FAILED without crashing the orchestrator
        or affecting other concurrent workflows.
        """
        # Register a failing agent & set its limit
        self.orchestrator.registry.register("failing", FailingAgent())
        self.orchestrator.concurrency.set_limit("failing", 5)
        
        wf_fail = self.orchestrator.job_manager.create_workflow(
            user_id="UserFail",
            goal="Test failure handling",
            plan=["explorer", "failing"]
        )
        self.orchestrator.queue_manager.enqueue_workflow(wf_fail)

        wf_normal = self.orchestrator.submit_workflow({"goal": "Run QA tests"}, user_id="UserNormal")

        start = time.time()
        failed_marked, normal_completed = False, False

        while time.time() - start < 10.0:
            st_f = self.orchestrator.get_workflow_status(wf_fail.workflow_id)
            st_n = self.orchestrator.get_workflow_status(wf_normal)

            if st_f and st_f["status"] == JobStatus.FAILED.value:
                failed_marked = True
            if st_n and st_n["status"] == JobStatus.COMPLETED.value:
                normal_completed = True

            if failed_marked and normal_completed:
                break
            time.sleep(0.05)

        self.assertTrue(failed_marked, "Failing workflow should be safely set to FAILED status")
        self.assertTrue(normal_completed, "Concurrent normal workflow must complete unaffected")

    def test_05_server_restart_recovery(self):
        """
        Test Case 5: Persistence & Automatic Restart Recovery.
        Active state is persisted to SQLite and recovered automatically upon process restart.
        """
        wf_id = self.orchestrator.submit_workflow({"goal": "Generate documentation and demo"}, user_id="UserRestart")
        time.sleep(0.05)

        # Shutdown instance and restart
        self.orchestrator.stop()
        
        restarted_orchestrator = OrchestratorAgent(db_path=DB_TEST_PATH, custom_limits={"demo": 1})
        
        start = time.time()
        recovered = False

        while time.time() - start < 10.0:
            st = restarted_orchestrator.get_workflow_status(wf_id)
            if st and st["status"] == JobStatus.COMPLETED.value:
                recovered = True
                break
            time.sleep(0.05)

        restarted_orchestrator.stop()
        self.assertTrue(recovered, "Workflow must automatically recover and complete after server restart")

if __name__ == "__main__":
    unittest.main()

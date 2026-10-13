from runtime import GuardianRuntime

runtime = GuardianRuntime()
runtime.start("../../datasets/raw/test_session.jsonl")
runtime.stop()

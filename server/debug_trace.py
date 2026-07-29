import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from services.execution.step_executor import StepExecutor

INFINITE_LOOP_CODE = """
while True:
    pass
"""
res = StepExecutor.trace(INFINITE_LOOP_CODE, timeout_ms=5000)
print(res)

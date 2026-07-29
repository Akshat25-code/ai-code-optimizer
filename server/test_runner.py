import os
import sys

# Adjust python path to be able to import services
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.execution.sandbox_runner import run_python

# Force docker usage flag
os.environ["USE_DOCKER_SANDBOX"] = "1"
os.environ["SANDBOX_IMAGE_PYTHON"] = "python:3.12-alpine"

# Run a simple Python script
print("Testing run_python...")
res = run_python("print('Hello Sandbox!')")
print("OK:", res.ok)
print("STDOUT:", repr(res.stdout))
print("STDERR:", repr(res.stderr))
print("TIME:", res.exec_time_ms)

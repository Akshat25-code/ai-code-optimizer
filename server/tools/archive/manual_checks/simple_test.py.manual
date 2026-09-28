import requests
import json

# Test health check
print("Testing health check...")
response = requests.get("http://127.0.0.1:8000/")
print(f"Status: {response.status_code}, Response: {response.json()}")

# Test analyze-code with OpenAI
print("\nTesting OpenAI integration...")
test_data = {
    "code": "def hello():\n    print('Hello world')\n    return True",
    "task": "optimize",
    "language": "python"
}

response = requests.post("http://127.0.0.1:8000/analyze-code", json=test_data)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    result = response.json()
    print(f"AI Response: {result['result'][:200]}...")
else:
    print(f"Error: {response.text}")

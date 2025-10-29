"""
Quick test for language validation
"""

import requests

# Test 1: Supported Languages
print("Testing supported languages endpoint...")
try:
    response = requests.get("http://127.0.0.1:8001/supported-languages")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Popular languages: {data.get('popular_languages', [])}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception: {e}")

# Test 2: Valid Language
print("\nTesting valid language (Python)...")
try:
    response = requests.post("http://127.0.0.1:8001/analyze-code", json={
        "language": "Python",
        "code": "print('hello')",
        "task": "optimize"
    })
    print(f"Status: {response.status_code}")
    if response.status_code != 200:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Exception: {e}")

# Test 3: Invalid Language
print("\nTesting invalid language (English)...")
try:
    response = requests.post("http://127.0.0.1:8001/analyze-code", json={
        "language": "English",
        "code": "This is English text",
        "task": "optimize"
    })
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Exception: {e}")

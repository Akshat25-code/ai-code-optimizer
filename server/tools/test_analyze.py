import json
import sys
import httpx

URL = 'http://127.0.0.1:8001/analyze-code'
DATA = {
    'code': 'print(1)',
    'language': 'python',
    'task': 'analysis'
}

try:
    r = httpx.post(URL, json=DATA, timeout=20.0)
    print(r.status_code)
    print(r.text)
except Exception as e:
    print('ERROR')
    print(str(e))
    sys.exit(1)

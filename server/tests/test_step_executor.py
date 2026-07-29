import pytest
from services.execution.step_executor import StepExecutor

BUBBLE_SORT_CODE = """
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

bubble_sort([64, 34, 25, 12, 22, 11, 90])
"""

BINARY_SEARCH_CODE = """
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

binary_search([2, 3, 4, 10, 40], 10)
"""

INFINITE_LOOP_CODE = """
while True:
    pass
"""

def test_trace_bubble_sort():
    res = StepExecutor.trace(BUBBLE_SORT_CODE, timeout_ms=5000)
    assert res["ok"] is True
    assert res["pattern"] == "sorting"
    assert res["step_count"] > 10
    assert res["truncated"] is False

    # Check if there are some swap operations detected
    has_swap = any(s.get("operation") == "swap" for s in res["steps"])
    assert has_swap

def test_trace_binary_search():
    res = StepExecutor.trace(BINARY_SEARCH_CODE, timeout_ms=5000)
    assert res["ok"] is True
    assert res["pattern"] == "binary_search"
    assert res["step_count"] > 0
    assert res["truncated"] is False

    has_narrow = any(s.get("operation") == "narrow" for s in res["steps"])
    assert has_narrow

def test_trace_infinite_loop():
    res = StepExecutor.trace(INFINITE_LOOP_CODE, timeout_ms=5000)
    assert res["ok"] is False
    # Should hit the MAX_STEPS = 10000 limit
    assert res["step_count"] == 10000
    assert res["truncated"] is True

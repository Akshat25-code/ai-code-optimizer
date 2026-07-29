"""Tests for deterministic local code intelligence."""


def test_inspect_code_reports_risky_python_findings(client):
    code = """
def risky(user_input):
    password = "super-secret-value"
    total = 0
    for i in range(10):
        for j in range(10):
            total += eval(user_input)
    return total
""".strip()

    resp = client.post("/inspect-code", json={
        "code": code,
        "language": "Python",
    })

    assert resp.status_code == 200
    data = resp.json()
    assert data["engine"] == "local-code-intelligence-v1"
    assert data["score"] < 100
    assert data["severity_counts"]["total"] >= 2
    titles = {finding["title"] for finding in data["findings"]}
    assert "Hardcoded secret" in titles
    assert "Unsafe use of eval" in titles
    assert any(badge["label"] == "Security" and badge["status"] == "failed" for badge in data["proof_badges"])


def test_inspect_code_compares_optimized_code(client):
    original = """
def risky(user_input):
    password = "super-secret-value"
    return eval(user_input)
""".strip()
    optimized = """
def safe_sum(values):
    \"\"\"Return the sum of numeric values.\"\"\"
    return sum(values)
""".strip()

    resp = client.post("/inspect-code", json={
        "code": original,
        "optimized_code": optimized,
        "language": "Python",
    })

    assert resp.status_code == 200
    data = resp.json()
    assert "optimized" in data
    assert "comparison" in data
    assert data["optimized"]["score"] > data["score"]
    assert data["comparison"]["score_delta"] > 0


def test_inspect_code_marks_python_syntax_errors(client):
    resp = client.post("/inspect-code", json={
        "code": "def broken(:\n    pass",
        "language": "Python",
    })

    assert resp.status_code == 200
    data = resp.json()
    assert data["quality_gates"]["syntax_valid"]["passed"] is False
    assert data["severity_counts"]["Critical"] == 1
    assert data["proof_badges"][0]["status"] == "failed"


def test_inspect_code_report_returns_markdown(client):
    code = """
def risky(user_input):
    password = "super-secret-value"
    return eval(user_input)
""".strip()

    resp = client.post("/inspect-code/report", json={
        "project_name": "University Demo Proof Report",
        "code": code,
        "language": "Python",
    })

    assert resp.status_code == 200
    assert "text/markdown" in resp.headers["content-type"]
    text = resp.text
    assert "# University Demo Proof Report" in text
    assert "Local Score" in text
    assert "Hardcoded secret" in text
    assert "Unsafe use of eval" in text

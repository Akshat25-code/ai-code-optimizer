async def process_code_with_ai(code: str, mode: str = "analyze") -> str:
    # In real case, this will call Claude/GPT API
    if mode == "analyze":
        return f"Analyzed code: Detected 2 issues in your code snippet."
    elif mode == "optimize":
        return f"Optimized code: Suggested a better version of your code."
    else:
        return "Invalid mode"

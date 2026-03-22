# ai_service.py
from __future__ import annotations
import httpx, json
import os
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from settings import settings

try:
    from ast_analyzer import analyze_python_ast
except ImportError:
    analyze_python_ast = None

HTTP_TIMEOUT = 45  # seconds

def _client():
    return httpx.AsyncClient(timeout=HTTP_TIMEOUT)


def _upstream_error(prefix: str, response: httpx.Response) -> ProviderConfigError:
    """Return a concise, user-actionable provider error with upstream payload snippet."""
    detail = ""
    try:
        payload = response.json()
        detail = json.dumps(payload)
    except Exception:
        detail = response.text or ""
    detail = " ".join(detail.split())
    if len(detail) > 320:
        detail = detail[:320] + "..."
    return ProviderConfigError(f"{prefix} error {response.status_code}: {detail}" if detail else f"{prefix} error {response.status_code}")

def _build_prompt_base(
    task: str,
    language: str,
    code: str,
    user_instructions: str | None = None,
    optimization_focus: list[str] | None = None,
) -> str:
    task = task.lower().strip()

    # Backward-compatible aliases from older clients/scripts
    aliases = {
        "optimize": "optimization",
        "analyse": "analysis",
        "analyze": "analysis",
        "document": "documentation",
        "docs": "documentation",
        "refactor": "refactoring",
    }
    task = aliases.get(task, task)

    
    # Enhanced prompts for better outputs
    if task == "bug_detection":
        return f"""You are an expert static code analyzer. Scan this {language} code for ALL possible issues.

    STRICT OUTPUT RULES:
    - Output must be a single JSON object (no markdown, no code fences, no extra text).
    - DO NOT provide a fixed/rewritten full code block.

    JSON SCHEMA:
    {{
      "summary": {{"Critical": 0, "High": 0, "Medium": 0, "Low": 0, "total": 0}},
      "compile_time_errors": [{{"line": 0, "column": 0, "error_type": "SyntaxError", "error_name": "...", "severity": "High", "message": "...", "code_snippet": "...", "suggested_fix": "..."}}],
      "runtime_errors": [{{"line": 0, "column": 0, "error_type": "...", "error_name": "...", "severity": "...", "message": "...", "code_snippet": "...", "suggested_fix": "..."}}],
      "logic_errors": [{{"line": 0, "column": 0, "error_type": "...", "error_name": "...", "severity": "...", "message": "...", "code_snippet": "...", "suggested_fix": "..."}}],
      "top_priorities": [{{"severity": "...", "line": 0, "message": "...", "suggested_fix": "..."}}]
    }}

    CODE:
    {code}
    """

    if task == "debugging":
        return f"""You are an expert {language} debugger. Find and FIX the bugs in the code.

**Code Analysis Task:**
1. **Syntax Errors**: Check for compilation/interpretation issues
2. **Logic Bugs**: Identify flawed reasoning or incorrect implementations  
3. **Runtime Errors**: Find potential crashes, exceptions, or failures
4. **Edge Cases**: Spot scenarios that might break the code
5. **Performance Issues**: Identify inefficient patterns that could cause problems
6. **Security Vulnerabilities**: Look for potential security risks
7. **Best Practice Violations**: Find deviations from {language} conventions

**Code to Analyze:**
```{language}
{code}
```

**Required Output Format:**
🐛 **Issues Found:**
[List each issue with severity level]

🔧 **Fixed Code:**
```{language}
[Provide the corrected version]
```

💡 **Explanation:**
[Explain what was wrong and why the fixes work]

⚠️ **Prevention Tips:**
[How to avoid similar issues in the future]"""

    elif task == "optimization":
        focus = ", ".join(optimization_focus or [])
        if not user_instructions:
            user_instructions = "Minimize code length while maintaining readability and performance."
        return f"""You are an expert {language} performance engineer. Optimize this code comprehensively. You MUST follow the EXACT required output format. Do not skip any sections.

**User Instructions:**
{user_instructions}

**Optimization Focus Areas (if any):**
{focus or "(none selected)"}

**Optimization Analysis Required:**
1. **Algorithm Efficiency**: Improve time/space complexity
2. **Data Structures**: Use optimal data structures for the use case
3. **Memory Management**: Reduce allocations and improve garbage collection
4. **I/O Operations**: Optimize database calls, file operations, network requests
5. **Concurrency**: Add parallel processing where beneficial

**Code to Optimize:**
```{language}
{code}
```

**CRITICAL: REQUIRED OUTPUT FORMAT:**
You MUST use these exact headings. Do not skip the explanation or analysis.

⚡ **Performance Analysis:**
[Explain the current performance characteristics, bottlenecks, and why your changes improve them. Be detailed!]

🚀 **Optimized Code:**
```{language}
[Fully optimized version with comments explaining improvements. Do not skip this block!]
```

📊 **Improvements Made:**
- **Time Complexity**: [Old] → [New]
- **Space Complexity**: [Old] → [New] 
- **Key Optimizations**: [List major improvements mathematically or logically]"""

    elif task == "auto_fix":
        return f"""You are an expert {language} developer responding to a critical runtime error. Your job is to FIX the following code based ONLY on the error traceback provided. Output ONLY the fully corrected code. DO NOT wrap the code in markdown formatting or include any conversational explanation.
        
**Original Code:**
{code}

**Error Traceback:**
{user_instructions}
"""
    elif task == "explanation":
        return f"""You are an expert {language} teacher. Provide a comprehensive, educational explanation of this code:

**Code to Explain:**
```{language}
{code}
```

**Required Explanation Format:**
🎯 **Purpose & Overview:**
[What this code does and why it exists]

🔍 **Step-by-Step Breakdown:**
[Line-by-line or section-by-section explanation]

🧩 **Key Concepts Used:**
[Important programming concepts demonstrated]

📝 **Code Structure:**
[How the code is organized and why]

💡 **Learning Points:**
[What someone can learn from this code]

✨ **Improvements Suggested:**
[How this code could be made better]

🎓 **Related Concepts:**
[Additional topics someone should learn]"""

    elif task == "analysis":
                return f"""You are a senior code reviewer. Analyze the following {language} code and return ONLY valid JSON.

STRICT OUTPUT RULES:
- Output must be a single JSON object (no markdown, no code fences, no extra text).
- Scores must be numbers from 0 to 10.

JSON SCHEMA (example keys):
{{
    "overall_score": 7.2,
    "detailed_scores": {{
        "code_structure": {{"score": 8, "status": "Good", "issues": ["..."], "recommendations": ["..."]}},
        "performance": {{"score": 6, "status": "Needs Improvement", "issues": ["..."], "recommendations": ["..."]}},
        "security": {{"score": 9, "status": "Excellent", "issues": ["..."], "recommendations": ["..."]}},
        "maintainability": {{"score": 7, "status": "Good", "issues": ["..."], "recommendations": ["..."]}},
        "readability": {{"score": 8, "status": "Good", "issues": ["..."], "recommendations": ["..."]}},
        "best_practices": {{"score": 6, "status": "Needs Work", "issues": ["..."], "recommendations": ["..."]}},
        "complexity": {{"score": 5, "status": "High Complexity", "issues": ["..."], "recommendations": ["..."]}}
    }},
    "strengths": ["..."],
    "top_issues": ["..."],
    "action_plan": ["..."],
    "notes": {{"time_complexity": "...", "space_complexity": "..."}}
}}

GUIDANCE:
- Find concrete, code-specific issues.
- Include language-specific best practices.
- If you cannot infer a complexity precisely, provide a best-effort estimate string.

CODE:
{code}
"""

    elif task == "refactoring":
        return f"""You are a {language} refactoring expert. Improve this code's structure and design.

**Code to Refactor:**
```{language}
{code}
```

**Refactoring Goals:**
1. **Clean Code**: Apply SOLID principles and clean code practices
2. **Design Patterns**: Implement appropriate design patterns where suitable
3. **Modularity**: Break code into logical, reusable components
4. **Testability**: Make code easier to unit test
5. **Extensibility**: Prepare code for future feature additions
6. **Naming**: Use clear, descriptive names throughout
7. **Structure**: Organize code logically and consistently

**IMPORTANT:** Respond ONLY with a single JSON object (no markdown fences, no extra text).

Required JSON structure:
{{{{
  "refactored_code": "<complete refactored code as a string (escape newlines as \\\\n)>",
  "changes": [
    "<description of change 1>",
    "<description of change 2>"
  ],
  "benefits": [
    "<benefit 1>",
    "<benefit 2>"
  ],
  "testing_tips": [
    "<testing tip 1>"
  ]
}}}}

Provide ONLY the JSON object with no surrounding text."""

    elif task == "documentation":
        return f"""You are a {language} documentation specialist. Create comprehensive, structured documentation for this code.

**Code to Document:**
```{language}
{code}
```

**IMPORTANT:** Respond ONLY with a single JSON object (no markdown fences, no extra text).

Required JSON structure:
{{{{
  "overview": "<one-paragraph summary of what the code does>",
  "functions": [
    {{{{
      "name": "<function or method name>",
      "signature": "<full signature with types if available>",
      "description": "<what it does>",
      "params": [{{{{"name": "<param>", "type": "<type>", "description": "<desc>"}}}}],
      "returns": "<return value description>",
      "example": "<short usage example code string>"
    }}}}
  ],
  "classes": [
    {{{{
      "name": "<class name>",
      "description": "<what it represents>",
      "methods": ["<list of method names>"]
    }}}}
  ],
  "usage_examples": ["<complete usage example 1>", "<example 2>"],
  "dependencies": ["<dependency or import needed>"],
  "notes": ["<important note or caveat>"]
}}}}

Provide ONLY the JSON object with no surrounding text."""

    # Default comprehensive analysis
    return f"""You are an expert {language} developer. Provide a comprehensive analysis of this code:

**Code for Analysis:**
```{language}
{code}
```

**Comprehensive Review:**
🔍 **Bug Analysis**: [Check for errors and issues]
⚡ **Optimization Opportunities**: [Performance improvements]  
📚 **Code Explanation**: [What the code does and how]
🏗️ **Structural Improvements**: [Better organization and design]
📖 **Documentation**: [How to improve code documentation]
🎯 **Best Practices**: [Apply {language} conventions and patterns]

Provide detailed, actionable insights for each area."""

def build_prompt(
    task: str,
    language: str,
    code: str,
    user_instructions: str | None = None,
    optimization_focus: list[str] | None = None,
) -> str:
    base = _build_prompt_base(task, language, code, user_instructions, optimization_focus)
    ast_context = ""
    if analyze_python_ast and language.lower() == "python":
        ast_json = analyze_python_ast(code)
        if ast_json:
            ast_context = "\n\n=== AST METADATA (System Context Only) ===\n" + ast_json + "\n"
    return base + ast_context

class TransientAIError(Exception): ...
class ProviderConfigError(Exception): ...

# ---------- OpenAI ----------
@retry(
    retry=retry_if_exception_type(TransientAIError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=True,
)
async def ask_openai(prompt: str) -> str:
    if not settings.openai_api_key:
        raise ProviderConfigError("OpenAI key missing")
    headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
    payload = {
        "model": settings.openai_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    async with _client() as client:
        r = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
    if r.status_code >= 500 or r.status_code == 429:
        raise TransientAIError(f"OpenAI transient error {r.status_code}")
    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"]

# ---------- Anthropic (Claude) ----------
@retry(
    retry=retry_if_exception_type(TransientAIError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=True,
)
async def ask_claude(prompt: str) -> str:
    if not settings.anthropic_api_key:
        raise ProviderConfigError("Anthropic key missing")
    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    candidate_models = [
        settings.anthropic_model,
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-haiku-20240307",
    ]

    last_resp = None
    async with _client() as client:
        for model in dict.fromkeys(candidate_models):
            payload = {
                "model": model,
                "max_tokens": 1200,
                "temperature": 0.2,
                "messages": [{"role": "user", "content": prompt}],
            }
            r = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            last_resp = r
            if r.status_code == 404:
                continue
            if r.status_code >= 500 or r.status_code == 429:
                raise TransientAIError(f"Anthropic transient error {r.status_code}")
            r.raise_for_status()
            data = r.json()
            break
        else:
            # Every model attempt returned 404/not found
            if last_resp is not None:
                last_resp.raise_for_status()
            raise ProviderConfigError("Anthropic model resolution failed")

    # Anthropic returns list of content blocks; concatenate text parts
    parts = []
    for block in data.get("content", []):
        if block.get("type") == "text":
            parts.append(block.get("text", ""))
    return "\n".join(parts).strip()

# ---------- Google Gemini ----------
@retry(
    retry=retry_if_exception_type(TransientAIError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=True,
)
async def ask_gemini(prompt: str) -> str:
    if not settings.gemini_api_key:
        raise ProviderConfigError("Gemini key missing")
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.2}}
    candidate_models = [
        settings.gemini_model,
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro-latest",
        "gemini-2.0-flash",
    ]

    last_resp = None
    async with _client() as client:
        for model in dict.fromkeys(candidate_models):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.gemini_api_key}"
            r = await client.post(url, json=payload)
            last_resp = r
            if r.status_code == 404:
                continue
            if r.status_code >= 500 or r.status_code == 429:
                raise TransientAIError(f"Gemini transient error {r.status_code}")
            r.raise_for_status()
            data = r.json()
            break
        else:
            # Every model attempt returned 404/not found
            if last_resp is not None:
                last_resp.raise_for_status()
            raise ProviderConfigError("Gemini model resolution failed")

    # Extract text safely
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        # Fallback readable error
        return data.get("promptFeedback", {}).get("blockReason", "Unknown Gemini response structure")


# ---------- DeepSeek ----------
@retry(
    retry=retry_if_exception_type(TransientAIError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=True,
)
async def ask_deepseek(prompt: str) -> str:
    if not settings.deepseek_api_key:
        raise ProviderConfigError("DeepSeek key missing")
    headers = {"Authorization": f"Bearer {settings.deepseek_api_key}"}
    payload = {
        "model": settings.deepseek_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    base_url = settings.deepseek_base_url.rstrip("/")
    async with _client() as client:
        r = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
    if r.status_code >= 500 or r.status_code == 429:
        raise TransientAIError(f"DeepSeek transient error {r.status_code}")
    if r.status_code >= 400:
        raise _upstream_error("DeepSeek", r)
    data = r.json()
    return data["choices"][0]["message"]["content"]


# ---------- xAI Grok ----------
@retry(
    retry=retry_if_exception_type(TransientAIError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=True,
)
async def ask_grok(prompt: str) -> str:
    key = settings.grok_api_key or settings.groq_api_key
    if not key:
        raise ProviderConfigError("Grok key missing (set GROK_API_KEY or GROQ_API_KEY)")

    using_groq_fallback = bool(settings.groq_api_key and not settings.grok_api_key)
    headers = {"Authorization": f"Bearer {key}"}
    if using_groq_fallback:
        base_url = settings.groq_base_url.rstrip("/")
        candidate_models = [
            settings.groq_model,
            "llama-3.3-70b-versatile",
            "llama-3.1-70b-versatile",
            "mixtral-8x7b-32768",
        ]
    else:
        base_url = settings.grok_base_url.rstrip("/")
        candidate_models = [
            settings.grok_model,
            "grok-2-latest",
            "grok-beta",
            "grok-2",
            "grok-2-1212",
        ]

    last_resp = None
    async with _client() as client:
        for model in dict.fromkeys(candidate_models):
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
            }
            r = await client.post(f"{base_url}/v1/chat/completions", headers=headers, json=payload)
            last_resp = r
            if r.status_code >= 500 or r.status_code == 429:
                raise TransientAIError(f"Grok transient error {r.status_code}")
            if r.status_code == 400:
                # Commonly indicates model/account mismatch; try next known model.
                continue
            if r.status_code >= 400:
                raise _upstream_error("Grok", r)
            data = r.json()
            break
        else:
            if last_resp is not None:
                raise _upstream_error("Grok", last_resp)
            raise ProviderConfigError("Grok request failed before receiving a response")

    return data["choices"][0]["message"]["content"]

# ---------- Intelligent Provider Selection ----------
def pick_provider(task: str, code: str, language: str = "") -> str:
    """Smart provider selection based on task type, code characteristics, and language"""
    task = task.lower().strip()
    code_length = len(code)
    language = language.lower()
    primary_provider = os.getenv("PRIMARY_AI_PROVIDER", "claude").lower().strip()
    if primary_provider == "anthropic":
        primary_provider = "claude"
    allowed_primary = {"openai", "claude", "gemini"}
    if settings.experimental_providers_enabled:
        allowed_primary.update({"deepseek", "grok"})
    if primary_provider not in allowed_primary:
        primary_provider = "claude"
    
    # Use configured primary provider for optimization to reduce hard failures from one provider quota.
    if task in ["optimization", "refactoring"] or code_length > 2000:
        return primary_provider
    
    # Claude - Best for explanations, documentation, and educational content
    if task in ["explanation", "documentation", "analysis"] or "comment" in task:
        return "claude"
    
    # Language-specific preferences
    if language in ["python", "javascript", "typescript", "java", "cpp"]:
        # Popular languages - OpenAI has excellent training on these
        if task in ["debugging", "optimization"]:
            return "openai"
    
    # Complex algorithms or data structures - OpenAI
    if any(keyword in code.lower() for keyword in ["algorithm", "data structure", "complexity", "async", "thread", "concurrent"]):
        return "openai"
    
    # Educational or explanatory tasks - Claude
    if any(keyword in task.lower() for keyword in ["explain", "teach", "learn", "understand", "document"]):
        return "claude"
    
    # Quick analysis or simple tasks - Gemini (fast and efficient)
    if task in ["bug_detection", "debugging"] and code_length < 1000:
        return "gemini"
    
    # Default: OpenAI for general code tasks
    return "openai"

def count_tokens(text: str) -> int:
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        return 0

async def ask_ai(
    task: str,
    language: str,
    code: str,
    provider: str | None,
    user_instructions: str | None = None,
    optimization_focus: list[str] | None = None,
) -> tuple[str, str, int, int]:
    """Enhanced AI service with intelligent provider selection and better error handling, now tracking tokens."""
    prompt = build_prompt(task, language, code, user_instructions=user_instructions, optimization_focus=optimization_focus)
    prompt_tokens = count_tokens(prompt)

    provider_aliases = {
        "anthropic": "claude",
        "xai": "grok",
    }
    
    # Use provided provider or auto-select the best one
    explicit_provider = bool(provider and provider != "auto")

    if explicit_provider:
        selected = provider_aliases.get((provider or "").lower().strip(), (provider or "").lower().strip())
    else:
        selected = pick_provider(task, code, language)

    if not settings.experimental_providers_enabled and selected in {"deepseek", "grok"}:
        raise ProviderConfigError("Provider is temporarily disabled")
    
    async def run_and_track(p: str, ask_fn):
        res = await ask_fn(prompt)
        return p, res, prompt_tokens, count_tokens(res)

    try:
        if selected == "openai":
            return await run_and_track("openai", ask_openai)
        elif selected == "claude":
            return await run_and_track("claude", ask_claude)
        elif selected == "gemini":
            return await run_and_track("gemini", ask_gemini)
        elif selected == "deepseek":
            return await run_and_track("deepseek", ask_deepseek)
        elif selected == "grok":
            return await run_and_track("grok", ask_grok)
        else:
            # Fallback to auto-selection
            auto_prov = pick_provider(task, code, language)
            if auto_prov == "openai":
                return await run_and_track("openai", ask_openai)
            elif auto_prov == "claude":
                return await run_and_track("claude", ask_claude)
            elif auto_prov == "deepseek":
                return await run_and_track("deepseek", ask_deepseek)
            elif auto_prov == "grok":
                return await run_and_track("grok", ask_grok)
            else:
                return await run_and_track("gemini", ask_gemini)
    except Exception as e:
        if explicit_provider:
            raise

        fallback_providers = ["claude", "openai", "gemini"]
        if settings.experimental_providers_enabled:
            fallback_providers = ["claude", "deepseek", "grok", "openai", "gemini"]
        if selected in fallback_providers:
            fallback_providers.remove(selected)
        
        for fallback in fallback_providers:
            try:
                if fallback == "openai":
                    return await run_and_track("openai(fallback)", ask_openai)
                elif fallback == "claude":
                    return await run_and_track("claude(fallback)", ask_claude)
                elif fallback == "deepseek":
                    return await run_and_track("deepseek(fallback)", ask_deepseek)
                elif fallback == "grok":
                    return await run_and_track("grok(fallback)", ask_grok)
                else:
                    return await run_and_track("gemini(fallback)", ask_gemini)
            except:
                continue
        raise e

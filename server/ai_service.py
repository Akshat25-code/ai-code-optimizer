# ai_service.py
from __future__ import annotations
import httpx, json
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from settings import settings

HTTP_TIMEOUT = 45  # seconds

def _client():
    return httpx.AsyncClient(timeout=HTTP_TIMEOUT)

def build_prompt(task: str, language: str, code: str) -> str:
    task = task.lower().strip()
    
    # Enhanced prompts for better outputs
    if task == "bug_detection" or task == "debugging":
        return f"""You are an expert {language} code analyzer. Carefully examine this code for bugs, errors, and potential issues:

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
[Provide the corrected version]

💡 **Explanation:**
[Explain what was wrong and why the fixes work]

⚠️ **Prevention Tips:**
[How to avoid similar issues in the future]"""

    elif task == "optimization":
        return f"""You are an expert {language} performance engineer. Optimize this code comprehensively:

**Optimization Analysis Required:**
1. **Algorithm Efficiency**: Improve time/space complexity
2. **Data Structures**: Use optimal data structures for the use case
3. **Memory Management**: Reduce allocations and improve garbage collection
4. **I/O Operations**: Optimize database calls, file operations, network requests
5. **Concurrency**: Add parallel processing where beneficial
6. **Caching**: Implement smart caching strategies
7. **Language-Specific**: Use {language}-specific optimizations and patterns
8. **Scalability**: Ensure code scales well with larger inputs

**Code to Optimize:**
```{language}
{code}
```

**Required Output Format:**
⚡ **Performance Analysis:**
[Current performance characteristics and bottlenecks]

🚀 **Optimized Code:**
```{language}
[Fully optimized version with comments explaining improvements]
```

📊 **Improvements Made:**
- **Time Complexity**: [Old] → [New]
- **Space Complexity**: [Old] → [New] 
- **Key Optimizations**: [List major improvements]

🎯 **Performance Impact:**
[Quantify expected performance gains]

🔧 **Implementation Notes:**
[Important considerations for deployment]"""

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
        return f"""You are a senior {language} code reviewer. Provide a comprehensive code analysis:

**Code for Review:**
```{language}
{code}
```

**Required Analysis:**
📋 **Code Quality Assessment:**
- **Readability**: [Score 1-10 with explanation]
- **Maintainability**: [Score 1-10 with explanation]  
- **Performance**: [Score 1-10 with explanation]
- **Security**: [Score 1-10 with explanation]

🔍 **Detailed Review:**
[Thorough examination of code quality, patterns, and practices]

💪 **Strengths:**
[What this code does well]

⚠️ **Areas for Improvement:**
[Specific issues and recommendations]

🏗️ **Architectural Considerations:**
[Comments on overall design and structure]

📈 **Metrics & Complexity:**
[Code complexity analysis and measurements]"""

    elif task == "refactoring":
        return f"""You are a {language} refactoring expert. Improve this code's structure and design:

**Code to Refactor:**
```{language}
{code}
```

**Refactoring Goals:**
1. **Clean Code**: Apply SOLID principles and clean code practices
2. **Design Patterns**: Implement appropriate design patterns
3. **Modularity**: Break code into logical, reusable components
4. **Testability**: Make code easier to unit test
5. **Extensibility**: Prepare code for future feature additions
6. **Naming**: Use clear, descriptive names throughout
7. **Structure**: Organize code logically and consistently

**Required Output:**
🏗️ **Refactored Code:**
```{language}
[Complete refactored version with improved structure]
```

📋 **Changes Made:**
[List of specific refactoring techniques applied]

🎯 **Benefits Achieved:**
[How the refactored code is better]

🧪 **Testing Considerations:**
[How to test the refactored code]"""

    elif task == "documentation":
        return f"""You are a {language} documentation specialist. Create comprehensive documentation for this code:

**Code to Document:**
```{language}
{code}
```

**Required Documentation:**
📚 **Function/Class Documentation:**
[Complete docstrings/comments for all functions and classes]

📖 **Usage Examples:**
```{language}
[Practical examples showing how to use the code]
```

📋 **API Reference:**
[Parameters, return values, exceptions for all public interfaces]

🔧 **Setup & Requirements:**
[Dependencies, installation, configuration needed]

⚠️ **Important Notes:**
[Warnings, limitations, gotchas users should know]

🚀 **Performance Characteristics:**
[Time/space complexity and performance expectations]"""

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
    if r.status_code >= 500:
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
    payload = {
        "model": settings.anthropic_model,
        "max_tokens": 1200,
        "temperature": 0.2,
        "messages": [{"role": "user", "content": prompt}],
    }
    async with _client() as client:
        r = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
    if r.status_code >= 500:
        raise TransientAIError(f"Anthropic transient error {r.status_code}")
    r.raise_for_status()
    data = r.json()
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
    # Generative Language API (v1beta)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.2}}
    async with _client() as client:
        r = await client.post(url, json=payload)
    if r.status_code >= 500:
        raise TransientAIError(f"Gemini transient error {r.status_code}")
    r.raise_for_status()
    data = r.json()
    # Extract text safely
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        # Fallback readable error
        return data.get("promptFeedback", {}).get("blockReason", "Unknown Gemini response structure")

# ---------- Intelligent Provider Selection ----------
def pick_provider(task: str, code: str, language: str = "") -> str:
    """Smart provider selection based on task type, code characteristics, and language"""
    task = task.lower().strip()
    code_length = len(code)
    language = language.lower()
    
    # OpenAI GPT - Best for code optimization, complex logic, and programming tasks
    if task in ["optimization", "refactoring"] or code_length > 2000:
        return "openai"
    
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

async def ask_ai(task: str, language: str, code: str, provider: str | None) -> tuple[str, str]:
    """Enhanced AI service with intelligent provider selection and better error handling"""
    prompt = build_prompt(task, language, code)
    
    # Use provided provider or auto-select the best one
    if provider and provider != "auto":
        selected = provider
    else:
        selected = pick_provider(task, code, language)
    
    try:
        if selected == "openai":
            return "openai", await ask_openai(prompt)
        elif selected == "claude":
            return "claude", await ask_claude(prompt)
        elif selected == "gemini":
            return "gemini", await ask_gemini(prompt)
        else:
            # Fallback to auto-selection
            auto_provider = pick_provider(task, code, language)
            if auto_provider == "openai":
                return "openai", await ask_openai(prompt)
            elif auto_provider == "claude":
                return "claude", await ask_claude(prompt)
            else:
                return "gemini", await ask_gemini(prompt)
    except Exception as e:
        # If primary provider fails, try fallback providers
        fallback_providers = ["openai", "claude", "gemini"]
        if selected in fallback_providers:
            fallback_providers.remove(selected)
        
        for fallback in fallback_providers:
            try:
                if fallback == "openai":
                    return f"{fallback}(fallback)", await ask_openai(prompt)
                elif fallback == "claude":
                    return f"{fallback}(fallback)", await ask_claude(prompt)
                else:
                    return f"{fallback}(fallback)", await ask_gemini(prompt)
            except:
                continue
        
        # If all providers fail, raise the original exception
        raise e

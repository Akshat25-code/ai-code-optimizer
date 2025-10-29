

import os
from dotenv import load_dotenv
import anthropic
from openai import OpenAI
import google.generativeai as genai

load_dotenv()

# Load API keys
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


# Initialize clients
claude_client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)
genai.configure(api_key=GEMINI_API_KEY)

# Claude function
def ask_claude(prompt, model="claude-3.5-sonnet-20241022"):
    try:
        response = claude_client.messages.create(
            model=model,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    except Exception as e:
        return f"Claude error: {str(e)}"

# OpenAI function
def ask_openai(prompt, model="gpt-4o-mini"):
    try:
        response = openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"OpenAI error: {str(e)}"

# Gemini function
def ask_gemini(prompt, model="gemini-pro"):
    try:
        model = genai.GenerativeModel(model)
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Gemini error: {str(e)}"

# Auto-selection
def auto_select_provider(prompt):
    length = len(prompt.split())
    if "code" in prompt.lower() or "program" in prompt.lower():
        return ask_openai(prompt)  # Best for coding
    elif length > 50 or any(word in prompt.lower() for word in ["analyze", "explain", "complex", "reasoning"]):
        return ask_claude(prompt)  # Best for long reasoning
    else:
        return ask_gemini(prompt)  # Fast & casual

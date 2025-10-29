#!/usr/bin/env python3
"""
Simplified Enhanced AI Service for Code Optimization Evaluation
Compatible version without heavy dependencies
"""

from typing import Dict, List, Any
import json
from ai_service import ask_ai

async def evaluate_code_optimization(code: str, language: str, provider: str = None) -> Dict[str, Any]:
    """
    Simplified code optimization evaluation that focuses on AI enhancement
    and basic analysis without heavy performance dependencies
    """
    
    try:
        # Step 1: Get AI optimization
        print(f"🤖 Requesting AI optimization for {language} code...")
        
        # Create optimization task
        optimization_task = f"""
Please optimize this {language} code for better performance, readability, and maintainability.
Provide the optimized code and explain the improvements made.

Original code:
{code}

Please respond with:
1. The optimized code
2. A list of improvements made
3. Performance benefits expected
4. Any additional recommendations
"""
        
        provider_used, ai_response = await ask_ai("optimization", language, code, provider)
        
        # Step 2: Parse AI response and extract optimized code
        # Try to extract code blocks from the response
        optimized_code = extract_code_from_response(ai_response, language)
        
        if not optimized_code:
            optimized_code = code  # Fallback to original if extraction fails
        
        # Step 3: Create simple evaluation metrics
        evaluation_result = {
            "provider_used": provider_used,
            "original_code": code,
            "optimized_code": optimized_code,
            "ai_analysis": ai_response,
            "improvements": {
                "code_structure": analyze_code_structure(code, optimized_code),
                "readability": analyze_readability_simple(code, optimized_code),
                "estimated_performance": estimate_performance_gain(code, optimized_code)
            },
            "recommendations": generate_recommendations(code, language),
            "test_cases": generate_test_cases(code, language),
            "overall_score": calculate_simple_score(code, optimized_code),
            "evaluation_timestamp": get_timestamp()
        }
        
        return evaluation_result
        
    except Exception as e:
        print(f"❌ Error in optimization evaluation: {str(e)}")
        return {
            "error": str(e),
            "provider_used": provider or "unknown",
            "original_code": code,
            "optimized_code": code,
            "overall_score": 5
        }

def extract_code_from_response(response: str, language: str) -> str:
    """Extract code blocks from AI response"""
    try:
        import re
        
        # Look for code blocks with language specification
        pattern = rf'```{language.lower()}(.*?)```'
        matches = re.findall(pattern, response, re.DOTALL | re.IGNORECASE)
        
        if matches:
            return matches[0].strip()
        
        # Look for generic code blocks
        pattern = r'```(.*?)```'
        matches = re.findall(pattern, response, re.DOTALL)
        
        if matches:
            # Return the longest code block (likely the optimized code)
            longest_match = max(matches, key=len)
            return longest_match.strip()
        
        return ""
        
    except Exception:
        return ""

def analyze_code_structure(original: str, optimized: str) -> Dict[str, Any]:
    """Simple code structure analysis"""
    
    def count_lines(code):
        return len([line for line in code.split('\n') if line.strip()])
    
    def count_functions(code):
        return code.count('def ')
    
    def count_loops(code):
        return code.count('for ') + code.count('while ')
    
    original_lines = count_lines(original)
    optimized_lines = count_lines(optimized)
    
    return {
        "original_lines": original_lines,
        "optimized_lines": optimized_lines,
        "line_reduction": original_lines - optimized_lines,
        "original_functions": count_functions(original),
        "optimized_functions": count_functions(optimized),
        "original_loops": count_loops(original),
        "optimized_loops": count_loops(optimized)
    }

def analyze_readability_simple(original: str, optimized: str) -> Dict[str, Any]:
    """Simple readability comparison"""
    
    def calculate_readability(code):
        lines = [line for line in code.split('\n') if line.strip()]
        comments = len([line for line in lines if line.strip().startswith('#')])
        blank_lines = code.count('\n\n')
        long_lines = len([line for line in lines if len(line) > 80])
        
        # Simple readability score (1-10)
        score = 10
        score -= min(3, long_lines)  # Penalize long lines
        score += min(2, comments)    # Reward comments
        score += min(1, blank_lines) # Reward spacing
        
        return max(1, min(10, score))
    
    original_score = calculate_readability(original)
    optimized_score = calculate_readability(optimized)
    
    return {
        "original_score": original_score,
        "optimized_score": optimized_score,
        "improvement": optimized_score - original_score
    }

def estimate_performance_gain(original: str, optimized: str) -> Dict[str, Any]:
    """Estimate performance improvements based on code patterns"""
    
    improvements = []
    estimated_gain = 0
    
    # Check for common optimization patterns
    if 'list comprehension' in optimized.lower() and 'for ' in original and 'append' in original:
        improvements.append("List comprehension optimization")
        estimated_gain += 15
    
    if len(optimized.split('\n')) < len(original.split('\n')):
        improvements.append("Code simplification")
        estimated_gain += 5
    
    if 'enumerate' in optimized and 'range(len(' in original:
        improvements.append("Pythonic iteration")
        estimated_gain += 10
    
    if 'join(' in optimized and '+' in original and 'str' in original:
        improvements.append("String concatenation optimization")
        estimated_gain += 20
    
    return {
        "estimated_gain_percentage": min(estimated_gain, 50),  # Cap at 50%
        "improvements_detected": improvements,
        "confidence": "estimated" if improvements else "low"
    }

def generate_recommendations(code: str, language: str) -> List[Dict[str, str]]:
    """Generate additional optimization recommendations"""
    
    recommendations = []
    
    # Language-specific recommendations
    if language.lower() == 'python':
        if 'for i in range(len(' in code:
            recommendations.append({
                "category": "Pythonic Code",
                "suggestion": "Use enumerate() instead of range(len())",
                "example": "for i, item in enumerate(items): instead of for i in range(len(items)):"
            })
        
        if '.append(' in code and 'for ' in code:
            recommendations.append({
                "category": "Performance",
                "suggestion": "Consider using list comprehension",
                "example": "[process(x) for x in items] instead of loop with append"
            })
    
    elif language.lower() == 'javascript':
        if 'var ' in code:
            recommendations.append({
                "category": "Modern JavaScript",
                "suggestion": "Use const/let instead of var",
                "example": "const value = ... or let counter = ..."
            })
    
    elif language.lower() in ['java', 'c++', 'c']:
        recommendations.append({
            "category": "Performance",
            "suggestion": "Consider algorithm complexity and memory usage",
            "example": "Use appropriate data structures and avoid nested loops when possible"
        })
    
    # General recommendations
    recommendations.append({
        "category": "Documentation",
        "suggestion": "Add comments explaining complex logic",
        "example": "# This function calculates... or /* Algorithm explanation */"
    })
    
    recommendations.append({
        "category": "Error Handling",
        "suggestion": "Add error handling for edge cases",
        "example": "try-catch blocks or input validation"
    })
    
    return recommendations

def generate_test_cases(code: str, language: str) -> List[Dict[str, Any]]:
    """Generate suggested test cases"""
    
    test_cases = []
    
    # Detect function patterns and suggest tests
    if 'def ' in code:  # Python function
        test_cases.extend([
            {"input": "Normal case", "description": "Test with typical input values"},
            {"input": "Edge case", "description": "Test with boundary values (0, 1, empty)"},
            {"input": "Error case", "description": "Test with invalid inputs"}
        ])
    
    elif 'function ' in code or '=>' in code:  # JavaScript function
        test_cases.extend([
            {"input": "Valid data", "description": "Test with expected input format"},
            {"input": "Null/undefined", "description": "Test with null or undefined values"},
            {"input": "Type variations", "description": "Test with different data types"}
        ])
    
    # Add performance test suggestions
    test_cases.append({
        "input": "Large dataset", 
        "description": "Test performance with large input to verify optimization"
    })
    
    return test_cases

def calculate_simple_score(original: str, optimized: str) -> int:
    """Calculate a simple overall optimization score (1-10)"""
    
    score = 5  # Base score
    
    # Code length improvement
    if len(optimized) < len(original):
        score += 1
    
    # Line count improvement
    original_lines = len([l for l in original.split('\n') if l.strip()])
    optimized_lines = len([l for l in optimized.split('\n') if l.strip()])
    
    if optimized_lines < original_lines:
        score += 1
    
    # Check for modern patterns
    if any(pattern in optimized for pattern in ['enumerate', 'comprehension', 'join(']):
        score += 1
    
    # Check for comments (documentation)
    if optimized.count('#') > original.count('#'):
        score += 1
    
    return min(10, max(1, score))

def get_timestamp() -> str:
    """Get current timestamp"""
    from datetime import datetime
    return datetime.now().isoformat()

# Test function for the sample endpoint
async def test_optimization_evaluation():
    """Test function for demonstration"""
    
    sample_code = """
def factorial(n):
    if n <= 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result = result * i
    return result
"""
    
    return await evaluate_code_optimization(sample_code, "python", "openai")

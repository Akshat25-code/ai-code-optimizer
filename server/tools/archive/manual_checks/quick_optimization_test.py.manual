#!/usr/bin/env python3
"""
Quick Optimization Module Test
Tests the basic functionality to verify completeness
"""

import requests
import json

def test_basic_optimization():
    """Test basic optimization functionality"""
    print("🧪 Testing Basic Optimization Module")
    print("=" * 50)
    
    # Simple test case
    test_code = """
def find_sum(numbers):
    total = 0
    for i in range(len(numbers)):
        total = total + numbers[i]
    return total
    """
    
    print("🔍 Testing optimization with inefficient code...")
    
    try:
        response = requests.post("http://localhost:8001/analyze-code", json={
            "code": test_code,
            "language": "python",
            "task": "optimization",
            "provider": "openai"
        })
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ SUCCESS! Provider: {result['provider_used']}")
            print(f"📝 Response length: {len(result['result'])} characters")
            print(f"🔍 Sample response: {result['result'][:200]}...")
            
            # Check for optimization keywords
            optimization_text = result['result'].lower()
            keywords = ['optimize', 'improve', 'efficient', 'better', 'performance']
            found_keywords = [kw for kw in keywords if kw in optimization_text]
            
            print(f"✅ Optimization keywords found: {', '.join(found_keywords)}")
            return True
        else:
            print(f"❌ Failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_different_languages():
    """Test with different programming languages"""
    print("\n🌐 Testing Multiple Languages")
    print("=" * 50)
    
    test_cases = [
        {
            "name": "Python",
            "code": "for i in range(len(arr)): print(arr[i])",
            "language": "python"
        },
        {
            "name": "JavaScript",
            "code": "for (var i = 0; i < arr.length; i++) { console.log(arr[i]); }",
            "language": "javascript"
        },
        {
            "name": "MATLAB",
            "code": "for i = 1:length(data); result(i) = data(i) * 2; end",
            "language": "matlab"
        }
    ]
    
    results = []
    for test_case in test_cases:
        print(f"\n🔍 Testing {test_case['name']}...")
        try:
            response = requests.post("http://localhost:8001/analyze-code", json={
                "code": test_case["code"],
                "language": test_case["language"],
                "task": "optimization",
                "provider": "openai"
            })
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ {test_case['name']}: SUCCESS")
                results.append(True)
            else:
                print(f"❌ {test_case['name']}: HTTP {response.status_code}")
                results.append(False)
                
        except Exception as e:
            print(f"❌ {test_case['name']}: {str(e)}")
            results.append(False)
    
    success_rate = sum(results) / len(results) * 100
    print(f"\n📊 Language support success rate: {success_rate:.1f}%")
    return success_rate

def test_different_tasks():
    """Test different optimization tasks"""
    print("\n🎯 Testing Different Tasks")
    print("=" * 50)
    
    test_code = """
def process_data(data):
    result = []
    for item in data:
        if item > 0:
            result.append(item * 2)
    return result
    """
    
    tasks = ["optimization", "bug_detection", "explanation", "analysis"]
    results = []
    
    for task in tasks:
        print(f"\n🔍 Testing task: {task}...")
        try:
            response = requests.post("http://localhost:8001/analyze-code", json={
                "code": test_code,
                "language": "python",
                "task": task,
                "provider": "openai"
            })
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ {task}: SUCCESS")
                results.append(True)
            else:
                print(f"❌ {task}: HTTP {response.status_code}")
                results.append(False)
                
        except Exception as e:
            print(f"❌ {task}: {str(e)}")
            results.append(False)
    
    success_rate = sum(results) / len(results) * 100
    print(f"\n📊 Task support success rate: {success_rate:.1f}%")
    return success_rate

def main():
    """Run quick optimization module test"""
    print("🚀 Quick Optimization Module Evaluation")
    print("=" * 60)
    
    # Test 1: Basic functionality
    basic_test = test_basic_optimization()
    
    # Test 2: Language support
    language_score = test_different_languages()
    
    # Test 3: Task variety
    task_score = test_different_tasks()
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 QUICK EVALUATION SUMMARY")
    print("=" * 60)
    
    print(f"✅ Basic Optimization: {'PASS' if basic_test else 'FAIL'}")
    print(f"🌐 Language Support: {language_score:.1f}%")
    print(f"🎯 Task Variety: {task_score:.1f}%")
    
    overall_score = (int(basic_test) * 100 + language_score + task_score) / 3
    print(f"🏆 OVERALL SCORE: {overall_score:.1f}%")
    
    if overall_score >= 80:
        print("🎉 EXCELLENT: Your optimization module is working great!")
    elif overall_score >= 60:
        print("👍 GOOD: Your optimization module is functional with room for improvement.")
    else:
        print("⚠️ NEEDS WORK: Consider improving the optimization capabilities.")
    
    print("\n💡 The comprehensive test framework has been created.")
    print("📄 Check test_optimization_complete.py for detailed evaluation.")

if __name__ == "__main__":
    main()

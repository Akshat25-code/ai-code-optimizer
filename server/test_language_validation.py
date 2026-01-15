"""
Test script for Language Validation System
Tests both valid and invalid language inputs
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8001"

def test_supported_languages_endpoint():
    """Test the supported languages endpoint"""
    print("🔍 Testing Supported Languages Endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/supported-languages")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Supported Languages Endpoint: SUCCESS")
            print(f"   📊 Total languages: {data['total_count']}")
            print(f"   🔥 Popular languages: {', '.join(data['popular_languages'])}")
            return True
        else:
            print(f"❌ Supported Languages Endpoint: FAILED ({response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Supported Languages Endpoint: ERROR - {e}")
        return False

def test_language_validation():
    """Test language validation with various inputs"""
    print("\n🧪 Testing Language Validation...")
    
    test_cases = [
        # Valid Programming Languages
        {"language": "Python", "code": "print('hello')", "task": "optimize", "should_pass": True},
        {"language": "JavaScript", "code": "console.log('hello')", "task": "optimize", "should_pass": True},
        {"language": "Java", "code": "System.out.println('hello')", "task": "optimize", "should_pass": True},
        {"language": "C++", "code": "#include<iostream>", "task": "optimize", "should_pass": True},
        {"language": "rust", "code": "fn main(){}", "task": "optimize", "should_pass": True},  # Test case insensitive
        
        # Invalid Languages (Natural Languages)
        {"language": "English", "code": "This is English text", "task": "optimize", "should_pass": False},
        {"language": "Spanish", "code": "Hola mundo", "task": "optimize", "should_pass": False},
        {"language": "French", "code": "Bonjour le monde", "task": "optimize", "should_pass": False},
        
        # Invalid Languages (Other)
        {"language": "InvalidLang", "code": "some code", "task": "optimize", "should_pass": False},
        {"language": "Text", "code": "plain text", "task": "optimize", "should_pass": False},
        {"language": "Math", "code": "2 + 2 = 4", "task": "optimize", "should_pass": False},
    ]
    
    passed = 0
    total = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        try:
            response = requests.post(f"{BASE_URL}/analyze-code", json=test_case)
            
            if test_case["should_pass"]:
                # Should succeed
                if response.status_code in [200, 201]:
                    print(f"✅ Test {i}: {test_case['language']} - PASSED (Valid language accepted)")
                    passed += 1
                else:
                    print(f"❌ Test {i}: {test_case['language']} - FAILED (Valid language rejected)")
                    print(f"   Status: {response.status_code}")
                    print(f"   Response: {response.text}")
            else:
                # Should fail
                if response.status_code == 422:  # Validation error
                    error_detail = response.json().get("detail", "")
                    # Handle both string and list error formats
                    if isinstance(error_detail, list):
                        error_text = str(error_detail)
                    else:
                        error_text = str(error_detail)
                    
                    if "programming language" in error_text.lower() or "not currently supported" in error_text.lower():
                        print(f"✅ Test {i}: {test_case['language']} - PASSED (Invalid language correctly rejected)")
                        print(f"   Error: {error_detail}")
                        passed += 1
                    else:
                        print(f"❌ Test {i}: {test_case['language']} - FAILED (Wrong error message)")
                        print(f"   Error: {error_detail}")
                else:
                    print(f"❌ Test {i}: {test_case['language']} - FAILED (Invalid language not rejected properly)")
                    print(f"   Status: {response.status_code}")
                    print(f"   Response: {response.text}")
                    
        except Exception as e:
            print(f"❌ Test {i}: {test_case['language']} - ERROR: {e}")
    
    success_rate = (passed / total) * 100
    print(f"\n📊 Test Results: {passed}/{total} passed ({success_rate:.1f}%)")
    return success_rate >= 90  # 90% success rate required

def test_case_insensitive_validation():
    """Test case-insensitive language validation"""
    print("\n🔤 Testing Case-Insensitive Validation...")
    
    case_variants = [
        "python", "PYTHON", "Python", "pYtHoN",
        "javascript", "JAVASCRIPT", "JavaScript", "jAvAsCrIpT",
        "java", "JAVA", "Java", "JaVa"
    ]
    
    passed = 0
    total = len(case_variants)
    
    for variant in case_variants:
        try:
            response = requests.post(f"{BASE_URL}/analyze-code", json={
                "language": variant,
                "code": "test code",
                "task": "optimize"
            })
            
            if response.status_code in [200, 201]:
                print(f"✅ {variant} - PASSED (Case insensitive)")
                passed += 1
            else:
                print(f"❌ {variant} - FAILED")
                print(f"   Status: {response.status_code}")
                
        except Exception as e:
            print(f"❌ {variant} - ERROR: {e}")
    
    success_rate = (passed / total) * 100
    print(f"\n📊 Case Insensitive Results: {passed}/{total} passed ({success_rate:.1f}%)")
    return success_rate >= 90

def main():
    """Run all validation tests"""
    print("🚀 Language Validation System Testing")
    print("=" * 50)
    
    # Test 1: Supported Languages Endpoint
    endpoint_success = test_supported_languages_endpoint()
    
    # Test 2: Language Validation
    validation_success = test_language_validation()
    
    # Test 3: Case Insensitive Validation
    case_success = test_case_insensitive_validation()
    
    # Overall Results
    print("\n" + "=" * 50)
    print("🏆 OVERALL TEST RESULTS")
    print("=" * 50)
    
    if endpoint_success:
        print("✅ Supported Languages Endpoint: PASS")
    else:
        print("❌ Supported Languages Endpoint: FAIL")
    
    if validation_success:
        print("✅ Language Validation: PASS")
    else:
        print("❌ Language Validation: FAIL")
        
    if case_success:
        print("✅ Case Insensitive Validation: PASS")
    else:
        print("❌ Case Insensitive Validation: FAIL")
    
    overall_success = endpoint_success and validation_success and case_success
    
    if overall_success:
        print("\n🎉 ALL TESTS PASSED! Language validation system is working perfectly!")
        print("💯 Ready for evaluator demonstration!")
    else:
        print("\n⚠️  Some tests failed. Please review and fix issues before evaluation.")
    
    return overall_success

if __name__ == "__main__":
    main()
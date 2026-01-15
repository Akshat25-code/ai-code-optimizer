#!/usr/bin/env python3
"""Integration tests for all major tasks."""
import asyncio
import sys

# Add current directory to path
sys.path.insert(0, '.')

async def test_all_tasks():
    """Test all major analysis tasks."""
    from ai_service import build_prompt, ask_ai
    
    test_code = '''def add(a, b):
    return a + b

def multiply(x, y):
    result = x * y
    return result
'''
    
    tasks = ['optimization', 'documentation', 'refactoring', 'bug_detection', 'analysis']
    
    results = {}
    for i, task in enumerate(tasks):
        if i > 0:
            # Small delay to avoid rate limiting
            await asyncio.sleep(1)
        
        print(f"\n{'='*60}")
        print(f"Testing task: {task}")
        print('='*60)
        
        try:
            prompt = build_prompt(test_code, 'Python', task)
            print(f"✓ Prompt built successfully ({len(prompt)} chars)")
            
            # Test with fake AI (since ALLOW_FAKE_AI=1)
            import os
            os.environ['ALLOW_FAKE_AI'] = '1'
            
            provider_used, response = await ask_ai(task, 'Python', test_code, provider='openai')
            
            print(f"✓ AI call returned successfully")
            print(f"  Provider: {provider_used}")
            print(f"  Response length: {len(response)} chars")
            results[task] = 'PASS'
                
        except Exception as e:
            err_str = str(e)
            if '429' in err_str or 'Too Many Requests' in err_str:
                print(f"⚠ Rate limited (external API limit) - skipping")
                results[task] = 'SKIP'
            else:
                print(f"✗ Exception: {type(e).__name__}: {e}")
                results[task] = 'FAIL'
    
    print(f"\n{'='*60}")
    print("SUMMARY")
    print('='*60)
    for task, status in results.items():
        if status == 'PASS':
            emoji = '✓'
        elif status == 'SKIP':
            emoji = '⚠'
        else:
            emoji = '✗'
        print(f"  {emoji} {task}: {status}")
    
    passed = sum(1 for s in results.values() if s == 'PASS')
    skipped = sum(1 for s in results.values() if s == 'SKIP')
    failed = sum(1 for s in results.values() if s == 'FAIL')
    total = len(results)
    print(f"\nTotal: {passed} passed, {skipped} skipped, {failed} failed (out of {total})")
    
    return failed == 0  # Success if no failures (skips are OK)

if __name__ == '__main__':
    import os
    os.environ['ALLOW_FAKE_AI'] = '1'
    os.environ['SKIP_MONGO_INIT'] = '1'
    
    success = asyncio.run(test_all_tasks())
    sys.exit(0 if success else 1)

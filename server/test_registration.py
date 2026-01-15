import asyncio
import requests
import json

async def test_registration():
    """Test user registration to ensure no duplicate key errors"""
    base_url = "http://127.0.0.1:8001"
    
    # Test data for users without phone numbers (like Google OAuth users)
    test_users = [
        {
            "name": "Test User 1",
            "email": "test1@example.com",
            "password": "testpass123"
        },
        {
            "name": "Test User 2", 
            "email": "test2@example.com",
            "password": "testpass123"
        }
    ]
    
    for i, user_data in enumerate(test_users, 1):
        try:
            print(f"Testing registration {i}: {user_data['email']}")
            response = requests.post(
                f"{base_url}/auth/register",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                user_info = result.get('user', {})
                print(f"  ✅ Registration successful: {user_info.get('name')} ({user_info.get('email')})")
            else:
                print(f"  ❌ Registration failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"  ❌ Error testing registration {i}: {e}")
    
    # Test with phone number
    phone_user = {
        "name": "Phone User",
        "email": "phoneuser@example.com", 
        "password": "testpass123",
        "phone": "+1234567890"
    }
    
    try:
        print(f"Testing phone registration: {phone_user['email']}")
        response = requests.post(
            f"{base_url}/auth/register",
            json=phone_user,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            user_info = result.get('user', {})
            print(f"  ✅ Phone registration successful: {user_info.get('name')} ({user_info.get('email')})")
        else:
            print(f"  ❌ Phone registration failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"  ❌ Error testing phone registration: {e}")

if __name__ == "__main__":
    asyncio.run(test_registration())
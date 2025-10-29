"""
Quick Authentication Test
Test registration and login with a new user
"""
import requests
import json

BASE_URL = "http://localhost:8002"

# Test with a new user
test_user = {
    "name": "Jane Doe",
    "email": "jane@example.com", 
    "password": "securepassword123"
}

print("🔐 Testing Authentication System")
print("=" * 40)

# Test Registration
print("1️⃣ Testing User Registration...")
try:
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json=test_user,
        headers={"Content-Type": "application/json"}
    )
    print(f"Status Code: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print("✅ Registration Successful!")
        print(f"   User ID: {data['user']['id']}")
        print(f"   Access Token: {data['access_token'][:50]}...")
        access_token = data['access_token']
    else:
        print(f"❌ Registration Failed: {response.text}")
        access_token = None
except Exception as e:
    print(f"❌ Registration Error: {e}")
    access_token = None

print()

# Test Login
print("2️⃣ Testing User Login...")
try:
    login_data = {
        "email": test_user["email"],
        "password": test_user["password"]
    }
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json=login_data,
        headers={"Content-Type": "application/json"}
    )
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("✅ Login Successful!")
        print(f"   User: {data['user']['name']} ({data['user']['email']})")
        print(f"   Access Token: {data['access_token'][:50]}...")
        if not access_token:  # If registration failed, use login token
            access_token = data['access_token']
    else:
        print(f"❌ Login Failed: {response.text}")
except Exception as e:
    print(f"❌ Login Error: {e}")

print()

# Test Get User Info
if access_token:
    print("3️⃣ Testing Get User Info...")
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Get User Info Successful!")
            print(f"   Name: {data['name']}")
            print(f"   Email: {data['email']}")
            print(f"   Verified: {data['is_verified']}")
            print(f"   Created: {data['created_at']}")
        else:
            print(f"❌ Get User Info Failed: {response.text}")
    except Exception as e:
        print(f"❌ Get User Info Error: {e}")

print()
print("🎉 Authentication Test Complete!")
print("🔗 Visit http://localhost:8001/docs to explore the full API")

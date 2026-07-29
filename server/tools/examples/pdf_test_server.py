#!/usr/bin/env python3
"""
Simple PDF Export Test Server
Minimal FastAPI server to test PDF export functionality
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from services.reports.pdf_report_service import pdf_export_service
from datetime import datetime, timezone, timedelta
import uvicorn

# Create FastAPI app
app = FastAPI(title="PDF Export Test Server", version="1.0.0")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "PDF Export Test Server is running!", "status": "OK"}

@app.get("/test-pdf")
async def test_pdf_export():
    """Generate a test PDF export"""

    # Sample demo data
    demo_user_data = {
        "name": "Demo User",
        "email": "demo@example.com",
        "phone": "+1234567890",
        "phone_verified": True,
        "created_at": datetime.now(timezone.utc) - timedelta(days=30),
        "updated_at": datetime.now(timezone.utc)
    }

    demo_profile_data = {
        "bio": "Full-stack developer passionate about AI and code optimization",
        "location": {
            "city": "San Francisco",
            "country": "USA",
            "timezone": "America/Los_Angeles"
        },
        "professional": {
            "job_title": "Senior Software Engineer",
            "company": "TechCorp Inc.",
            "experience_level": "Advanced"
        },
        "social_links": {
            "github": "https://github.com/demo-user",
            "linkedin": "https://linkedin.com/in/demo-user"
        }
    }

    demo_sessions_data = [
        {
            "id": "1",
            "title": "Optimize Python sorting algorithm",
            "language": "python",
            "task": "optimization",
            "provider_used": "openai",
            "code": "def sort_list(arr):\n    return sorted(arr)",
            "result": "Optimized using Timsort algorithm for better performance",
            "created_at": datetime.now(timezone.utc) - timedelta(days=5)
        },
        {
            "id": "2",
            "title": "Improve JavaScript function",
            "language": "javascript",
            "task": "analysis",
            "provider_used": "claude",
            "code": "function fibonacci(n) { if(n<=1) return n; return fibonacci(n-1)+fibonacci(n-2); }",
            "result": "Added memoization to reduce time complexity from O(2^n) to O(n)",
            "created_at": datetime.now(timezone.utc) - timedelta(days=2)
        }
    ]

    demo_analytics_data = {
        "total_sessions": 15,
        "recent_sessions": 8,
        "total_optimizations": 12,
        "languages_used": {"python": 8, "javascript": 4, "java": 2, "cpp": 1},
        "ai_providers_used": {"openai": 10, "claude": 5},
        "account_age_days": 30,
        "profile_completion": 85
    }

    demo_login_history = [
        {
            "id": "1",
            "ip_address": "192.168.1.100",
            "user_agent": "Mozilla/5.0 Chrome/91.0",
            "device_info": {"device": "Chrome on Windows"},
            "location_info": {"city": "San Francisco", "country": "USA"},
            "success": True,
            "created_at": datetime.now(timezone.utc) - timedelta(hours=2)
        }
    ]

    demo_active_sessions = [
        {
            "id": "1",
            "device_info": {"device": "Chrome on Windows"},
            "ip_address": "192.168.1.100",
            "location": {"city": "San Francisco", "country": "USA"},
            "current": True,
            "created_at": datetime.now(timezone.utc) - timedelta(hours=2),
            "last_activity": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7)
        }
    ]

    try:
        # Generate PDF
        pdf_buffer = pdf_export_service.generate_comprehensive_export(
            user_data=demo_user_data,
            profile_data=demo_profile_data,
            sessions_data=demo_sessions_data,
            analytics_data=demo_analytics_data,
            login_history=demo_login_history,
            active_sessions=demo_active_sessions
        )

        # Return PDF
        filename = f"test_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        print(f"PDF Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

if __name__ == "__main__":
    print("ðŸš€ Starting PDF Export Test Server...")
    print("ðŸ“‹ Available endpoints:")
    print("  GET  /          - Server status")
    print("  GET  /test-pdf  - Generate test PDF")
    print("\nðŸŒ Server URL: http://127.0.0.1:8002")
    print("ðŸ“± Test in browser: http://127.0.0.1:8002/test-pdf")

    uvicorn.run(app, host="127.0.0.1", port=8002, reload=False)

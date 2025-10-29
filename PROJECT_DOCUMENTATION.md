# AI Code Optimizer - Complete Project Documentation

## 🚀 Project Overview

**AI Code Optimizer** is a comprehensive web application that leverages multiple AI providers (OpenAI, Anthropic Claude, Google Gemini) to analyze, optimize, and improve code quality. Built with a modern tech stack, it provides users with intelligent code analysis, bug detection, performance optimization suggestions, and detailed explanations.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │  Auth Pages │ │ Code Editor │ │   Profile   │ │ Dashboard │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                            HTTP/JSON
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐ │
│  │ Auth Routes  │ │ Profile Mgmt │ │ AI Services  │ │ OAuth  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                          MongoDB Driver
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (MongoDB)                        │
│  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐ │
│  │ Users  │ │Sessions │ │Analytics │ │Login Hist. │ │ OAuth  │ │
│  └────────┘ └─────────┘ └──────────┘ └────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure & File Descriptions

### **ROOT LEVEL**
```
ai-code-optimizer/
├── client/              # React frontend application
├── server/              # FastAPI backend application
├── .gitignore          # Git ignore patterns
├── .gitattributes      # Git attributes configuration
└── PROJECT_DOCUMENTATION.md  # This comprehensive documentation
```

---

## 🖥️ FRONTEND (React Application)

### **Directory: `client/`**

#### **Configuration Files**
- **`package.json`** - NPM dependencies and scripts
  - **Key Dependencies**: React 18, Vite, TailwindCSS, React Router
  - **Scripts**: `dev` (development), `build` (production), `preview`

- **`vite.config.js`** - Vite build tool configuration
  - Proxy setup for API calls to backend (port 8001)
  - React plugin configuration

- **`tailwind.config.js`** - TailwindCSS utility framework configuration
  - Custom color schemes, responsive breakpoints
  - Dark/light theme support

- **`postcss.config.js`** - PostCSS processing configuration
- **`eslint.config.js`** - ESLint code quality rules
- **`index.html`** - Main HTML entry point

#### **Source Code: `client/src/`**

**Entry Points:**
- **`main.jsx`** - React application bootstrap
  - Renders root App component
  - Sets up React Router for navigation
  - Initializes ThemeProvider for dark/light mode

- **`App.jsx`** - Main application component
  - Route definitions and navigation
  - Theme context integration
  - Global layout structure

**Styling:**
- **`App.css`** - Application-specific styles
- **`index.css`** - Global styles and TailwindCSS imports

**Configuration:**
- **`config/api.js`** - API base URL configuration
  - Centralized API endpoint management
  - Environment-based URL switching

**Authentication System:**
- **`services/authService.js`** - Complete authentication service
  - **Features**: Login, registration, OAuth integration, JWT token management
  - **Methods**: Login, logout, token refresh, password reset
  - **OAuth Support**: Google, GitHub, Discord integration via popup

**Profile Management:**
- **`services/profileService.js`** - Profile data management
  - User profile CRUD operations
  - Avatar upload functionality
  - Data export (JSON/PDF)
  - Account deletion

**Context Management:**
- **`contexts/ThemeContext.js`** - Dark/light theme state management
  - Theme persistence in localStorage
  - Theme toggle functionality

**Components:**

1. **`components/WelcomePage.jsx`** - Landing/welcome page
   - Hero section with gradient animations
   - Feature highlights
   - Call-to-action buttons

2. **`components/CodeOptimizerPro.jsx`** - Main code analysis interface
   - **Code Editor**: Syntax highlighting, language selection
   - **AI Analysis**: Bug detection, optimization, explanation
   - **Multi-Provider Support**: OpenAI, Claude, Gemini
   - **Session Management**: Save/load optimization sessions
   - **Export Features**: JSON/PDF session reports

3. **`pages/ProfilePage.jsx`** - Comprehensive profile management
   - **Personal Info Tab**: Name, email, bio editing
   - **Location Tab**: City, country, timezone
   - **Professional Tab**: Job title, company, experience level
   - **Social Links Tab**: GitHub, LinkedIn profiles
   - **Data Management**: Export profile data as PDF
   - **Account Security**: Password change, account deletion

4. **`components/Dashboard.jsx`** - User analytics and insights
   - Optimization session statistics
   - Language usage analytics
   - AI provider usage metrics
   - Recent activity timeline

**Assets:**
- **`assets/react.svg`** - React logo
- **`public/vite.svg`** - Vite logo

---

## ⚙️ BACKEND (FastAPI Application)

### **Directory: `server/`**

#### **Core Application Files**

**`main.py`** - Main FastAPI application
- **Purpose**: Central application entry point
- **Features**:
  - FastAPI app initialization
  - CORS middleware for frontend communication
  - Route inclusion (auth, profile, sessions, oauth)
  - MongoDB connection management
  - Static file serving for uploads
  - Debug endpoints for development

**`settings.py`** - Application configuration
- Environment variable management
- Database connection settings
- AI provider API key configuration

#### **Database Layer**

**`mongodb_database.py`** - MongoDB connection and operations
- **Features**:
  - Connection pool management
  - Database initialization
  - Collection setup and indexing
  - Connection health monitoring
  - Async database operations

#### **Authentication System**

**`mongodb_auth_routes.py`** - Authentication endpoints
- **Endpoints**:
  - `POST /auth/register` - User registration
  - `POST /auth/login` - User login
  - `POST /auth/refresh` - Token refresh
  - `POST /auth/logout` - User logout
  - `POST /auth/forgot-password` - Password reset
  - `POST /auth/verify-phone` - Phone verification
- **Features**: JWT token management, password hashing, phone OTP

**`mongodb_auth_models.py`** - Authentication data models
- User model with validation
- Phone OTP model
- Password reset token model
- Pydantic schemas for request/response validation

**`jwt_utils.py`** - JWT token utilities
- Token generation and validation
- Session management
- Password hashing utilities
- Security middleware

#### **Profile Management**

**`profile_routes.py`** - Profile management endpoints
- **User Profile**:
  - `GET /profile/me` - Get user profile
  - `PUT /profile/me` - Update user profile
  - `DELETE /profile/me` - Delete account
- **Enhanced Profile**:
  - `PUT /profile/location` - Update location info
  - `PUT /profile/professional` - Update professional info
  - `PUT /profile/social-links` - Update social media links
- **Data Export**:
  - `GET /profile/export` - Export profile as JSON
  - `GET /profile/export-pdf` - Export profile as PDF
  - `GET /profile/export-pdf-demo` - Demo PDF export
- **Avatar Management**:
  - `POST /profile/upload-avatar` - Upload profile picture
- **Analytics**:
  - `GET /profile/analytics` - User activity analytics
  - `GET /profile/login-history` - Login history
  - `GET /profile/active-sessions` - Active sessions

#### **OAuth Integration**

**`oauth_routes.py`** - OAuth provider endpoints
- **Providers**: Google, GitHub, Discord
- **Endpoints**:
  - `GET /oauth/{provider}` - Initiate OAuth flow
  - `GET /oauth/{provider}/callback` - Handle OAuth callback
- **Features**: Provider integration, token exchange, user linking

**`sms_service.py`** - SMS/Phone verification
- Phone number validation
- OTP generation and sending
- Integration with SMS providers

#### **AI Services**

**`ai_service.py`** - Core AI integration
- **Features**:
  - Multi-provider support (OpenAI, Claude, Gemini)
  - Provider failover and load balancing
  - Request/response formatting
  - Error handling and retries

**`simple_enhanced_ai_service.py`** - Enhanced AI analysis
- **Functions**:
  - Code optimization evaluation
  - Performance analysis
  - Quality scoring
  - Improvement suggestions

#### **Optimization Sessions**

**`opt_sessions_routes.py`** - Optimization session management
- **Endpoints**:
  - `POST /opt-sessions` - Create optimization session
  - `GET /opt-sessions` - List user sessions
  - `GET /opt-sessions/{id}` - Get specific session
  - `DELETE /opt-sessions/{id}` - Delete session
  - `GET /opt-sessions/export` - Export sessions as JSON
- **Features**: Session persistence, code storage, result caching

#### **PDF Export Service**

**`pdf_export_service.py`** - PDF generation service
- **Features**:
  - Comprehensive user data export
  - Professional PDF formatting with ReportLab
  - Session history inclusion
  - Analytics data visualization
  - Custom styling and branding

#### **Model Definitions**

**`models/request_models.py`** - API request models
- Pydantic models for input validation
- Type checking and serialization

**`models/response_models.py`** - API response models
- Structured response formats
- Consistent API responses

---

## 🛢️ DATABASE SCHEMA (MongoDB)

### **Collections:**

#### **users**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String (optional),
  phone_verified: Boolean,
  preferences: Object,
  profile_picture: String (URL),
  // Enhanced profile fields
  bio: String,
  location: {
    city: String,
    country: String,
    timezone: String
  },
  professional: {
    job_title: String,
    company: String,
    experience_level: String
  },
  social_links: {
    github: String,
    linkedin: String
  },
  created_at: Date,
  updated_at: Date
}
```

#### **optimize_sessions**
```javascript
{
  _id: ObjectId,
  user_id: String,
  title: String,
  language: String,
  task: String, // "bug_detection", "optimization", "explanation"
  provider_used: String,
  code: String,
  result: String,
  created_at: Date
}
```

#### **user_analytics**
```javascript
{
  _id: ObjectId,
  user_id: String,
  total_sessions: Number,
  recent_sessions: Number,
  total_optimizations: Number,
  languages_used: Object, // {"python": 10, "javascript": 5}
  ai_providers_used: Object, // {"openai": 8, "claude": 7}
  account_age_days: Number,
  profile_completion: Number,
  updated_at: Date
}
```

#### **login_history**
```javascript
{
  _id: ObjectId,
  user_id: String,
  ip_address: String,
  user_agent: String,
  device_info: Object,
  location_info: Object,
  success: Boolean,
  created_at: Date
}
```

#### **user_sessions** (Active Sessions)
```javascript
{
  _id: ObjectId,
  user_id: String,
  token_id: String,
  device_info: Object,
  ip_address: String,
  location: Object,
  is_active: Boolean,
  created_at: Date,
  last_activity: Date,
  expires_at: Date
}
```

#### **oauth_providers**
```javascript
{
  _id: ObjectId,
  user_id: String,
  provider: String, // "google", "github", "discord"
  provider_id: String,
  provider_email: String,
  linked_at: Date
}
```

#### **password_reset_tokens**
```javascript
{
  _id: ObjectId,
  user_id: String,
  token: String,
  expires_at: Date,
  used: Boolean,
  created_at: Date
}
```

---

## 🔧 Key Features Breakdown

### **1. Multi-Provider AI Integration**
- **Supported Providers**: OpenAI GPT, Anthropic Claude, Google Gemini
- **Capabilities**: Code analysis, bug detection, optimization suggestions, explanations
- **Failover System**: Automatic provider switching on failure
- **Load Balancing**: Distribute requests across providers

### **2. Authentication & Security**
- **JWT-based Authentication**: Secure token-based auth with refresh tokens
- **OAuth Integration**: Google, GitHub, Discord login options
- **Phone Verification**: SMS-based phone number verification
- **Session Management**: Track and manage user sessions across devices
- **Password Security**: Bcrypt hashing, password reset functionality

### **3. Profile Management**
- **Complete Profile System**: Personal, location, professional, social info
- **Avatar Upload**: Profile picture upload with file management
- **Data Export**: JSON and PDF export of user data
- **Account Controls**: Password change, account deletion

### **4. Code Optimization Engine**
- **Language Support**: Python, JavaScript, Java, C++, and more
- **Analysis Types**: Bug detection, performance optimization, code explanation
- **Session Persistence**: Save and reload optimization sessions
- **History Tracking**: Complete history of all optimizations

### **5. Analytics & Insights**
- **Usage Statistics**: Track sessions, languages, providers used
- **Performance Metrics**: Optimization success rates, improvement tracking
- **Login History**: Complete audit trail of user access
- **Device Management**: Track and manage active sessions

### **6. Advanced UI/UX**
- **Dark/Light Theme**: Toggle between themes with persistence
- **Responsive Design**: Mobile-friendly TailwindCSS styling
- **Code Syntax Highlighting**: Professional code editor interface
- **Real-time Updates**: Live feedback and progress indicators

---

## 🚀 Deployment & Configuration

### **Environment Variables**

**Backend (.env file):**
```
# Database
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=ai_code_optimizer

# AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key

# OAuth
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_secret
GITHUB_OAUTH_CLIENT_ID=your_github_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_github_secret

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Server
BACKEND_PORT=8001
FRONTEND_URL=http://localhost:5173
```

### **Running the Application**

**Backend:**
```bash
cd server
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd client
npm install
npm run dev
```

---

## 🔌 API Endpoints Summary

### **Authentication**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout

### **Profile Management**
- `GET /profile/me` - Get user profile
- `PUT /profile/me` - Update profile
- `POST /profile/upload-avatar` - Upload avatar
- `GET /profile/export-pdf` - Export as PDF

### **Code Optimization**
- `POST /analyze-code` - Analyze code with AI
- `POST /opt-sessions` - Create optimization session
- `GET /opt-sessions` - List user sessions

### **OAuth**
- `GET /oauth/{provider}` - Start OAuth flow
- `GET /oauth/{provider}/callback` - OAuth callback

---

## 📊 Technical Specifications

**Frontend:**
- **Framework**: React 18 with Hooks
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **State Management**: Context API + Local State

**Backend:**
- **Framework**: FastAPI (Python)
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT with refresh tokens
- **File Upload**: FastAPI file handling
- **PDF Generation**: ReportLab

**Database:**
- **Type**: MongoDB (Document Database)
- **Driver**: Motor (Async MongoDB driver)
- **Indexing**: Optimized queries with proper indexes

**AI Integration:**
- **OpenAI**: GPT models for code analysis
- **Anthropic**: Claude for advanced reasoning
- **Google**: Gemini for diverse perspectives

---

## 🎯 Project Highlights for Evaluation

1. **Full-Stack Implementation**: Complete React frontend + FastAPI backend
2. **Modern Tech Stack**: Latest versions of React, FastAPI, MongoDB
3. **Security Best Practices**: JWT auth, password hashing, input validation
4. **Multi-Provider AI**: Integration with 3 major AI providers
5. **Comprehensive Features**: Auth, profiles, analytics, export, OAuth
6. **Professional UI/UX**: Dark/light themes, responsive design
7. **Database Design**: Proper MongoDB schema with relationships
8. **Code Quality**: Clean, documented, maintainable code
9. **Error Handling**: Robust error handling throughout
10. **Scalable Architecture**: Modular design for easy expansion

This AI Code Optimizer represents a production-ready application with enterprise-level features, security, and user experience.
# CivicFix Backend API

Express.js backend for the CivicFix citizen complaint management system.

## Architecture

### REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/complaints` | Create a new complaint (auto-generates ID, assigns department) |
| GET | `/api/complaints/:id` | Fetch complaint by ID |
| GET | `/api/complaints` | List all complaints (with optional status/department filters) |
| PUT | `/api/complaints/:id` | Update complaint status (Pending → In Progress → Resolved) |
| POST | `/api/complaints/:id/claim` | Claim complaint (Volunteer/Admin only) |
| POST | `/api/complaints/:id/resolve` | Resolve complaint (Volunteer/Admin only) |
| POST | `/api/volunteers/request` | Submit volunteer enrollment request (Authenticated Citizen) |
| GET | `/api/volunteers/pending` | List pending volunteer requests (Admin only) |
| POST | `/api/volunteers/:id/approve` | Approve volunteer request (Admin only, promotes user to volunteer) |
| POST | `/api/volunteers/:id/reject` | Reject volunteer request (Admin only) |
| POST | `/api/assign` | Assign complaint to department |
| GET | `/api/health` | Health check endpoint |

### Volunteer Enrollment & Approval Workflow

Normal registration always creates a `citizen` account. Volunteer access requires an authenticated volunteer request followed by admin approval. The server assigns the `volunteer` role after approval; clients cannot assign themselves the `volunteer` role during registration or login.

1. **Submit Request**: A citizen submits a request via `POST /api/volunteers/request`.
2. **Review Pending Requests**: An admin views all active pending requests via `GET /api/volunteers/pending`.
3. **Approval**: An admin approves the request via `POST /api/volunteers/:id/approve`. The server updates `volunteer_requests.status = 'approved'` and sets `users.role = 'volunteer'`.
4. **Re-Authentication**: The approved user logs in again to receive an updated JWT reflecting their `volunteer` role, enabling access to complaint claim and resolution endpoints.

### Department Routing Logic

| Issue Type | Department |
|------------|------------|
| Pothole, Road | Roads Department |
| Garbage, Waste, Trash | Sanitation |
| Water, Leak, Pipe | Water Department |
| Electric, Streetlight, Power | Electrical Department |
| Other | General Administration |

### Database Schema (SQLite)

The backend uses SQLite via `better-sqlite3`. The database file (`civicfix.sqlite`) is created automatically in the `backend/` directory on first run.

```sql
complaints:
- id (INTEGER PRIMARY KEY AUTOINCREMENT)
- complaint_id (TEXT UNIQUE) - Public-facing ID like CIV-ABC123
- name (TEXT)
- phone (TEXT)
- email (TEXT)
- area (TEXT)
- city (TEXT)
- landmark (TEXT)
- issue_type (TEXT)
- description (TEXT)
- severity (TEXT) - low/medium/high
- image_url (TEXT)
- latitude (REAL)
- longitude (REAL)
- status (TEXT) - Pending/In Progress/Resolved
- department (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

The backend uses a local SQLite database file (`civicfix.sqlite`) that is created automatically. No external database setup is required.

```bash
# Copy example env file
cp .env.example .env
```

Edit `.env` and configure the required variables:

- `PORT` — Server port (default: 3000)
- `JWT_SECRET` — **Required.** A secure random string for authentication. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `GEMINI_API_KEY` — Optional. Required only for AI chatbot features.

### 3. Initialize Database

```bash
npm run init-db
```

This creates the SQLite database file (`civicfix.sqlite`) and all required tables in the `backend/` directory.

### 4. Start the Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

Server runs on `http://localhost:3000` by default.

### 5. Verify Installation

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "CivicFix API is running",
  "timestamp": "2026-04-02T..."
}
```

## Project Structure

```
backend/
├── server.js                    # Entry point
├── src/
│   ├── config/
│   │   ├── database.js          # SQLite database connection
│   │   └── initDatabase.js      # Table creation script
│   ├── controllers/
│   │   └── complaintController.js # Request handlers
│   ├── middleware/
│   │   ├── errorHandler.js      # Global error handling
│   │   └── validateComplaint.js # Input validation
│   ├── models/
│   │   └── Complaint.js         # Database model
│   ├── routes/
│   │   └── complaints.js        # Route definitions
│   └── utils/
│       ├── departmentRouter.js  # Department assignment logic
│       └── generateId.js        # Complaint ID generator
├── .env                         # Environment variables (not committed)
├── .env.example                 # Example environment file
└── package.json
```

## Error Handling

All errors return JSON with consistent structure:

```json
{
  "success": false,
  "error": {
    "message": "Error description"
  }
}
```

## Development Notes

- CORS is enabled for all origins (development)
- General request body size limit: 50mb
- AI endpoints have a smaller configurable request body limit
- AI input limits can be configured through environment variables:
  - `AI_MAX_BODY_SIZE` — maximum request body size for AI endpoints (default: `100kb`)
  - `AI_MAX_MESSAGE_LENGTH` — maximum `/api/ai/chat` message length (default: `4000` characters)
  - `AI_MAX_DESCRIPTION_LENGTH` — maximum description length for `/api/ai/analyze-description` and `/api/ai/enhance-description` (default: `5000` characters)
  - `AI_MAX_HISTORY_MESSAGES` — maximum number of chat history messages (default: `20`)
  - `AI_MAX_HISTORY_MESSAGE_LENGTH` — maximum length of each chat history message (default: `4000` characters)
- AI endpoints retain the existing rate limit of 20 requests per IP per minute
- Oversized AI inputs are rejected before being sent to the AI service
- No authentication implemented (add JWT/session for production)
- Complaint IDs are auto-generated (format: CIV-XXXXXX)
- Department assignment is automatic based on issue type
# VeriChain AI API Specification

VeriChain AI exposes a RESTful API backend built on **FastAPI**.

## Base URL
Default local endpoint: `http://localhost:8000/api`

---

## Authentication Endpoints

### 1. Register User
- **Route**: `POST /auth/register`
- **Request Body**:
  ```json
  {
    "username": "compliance_officer",
    "email": "officer@company.com",
    "password": "SecurePassword"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "id": 1,
    "username": "compliance_officer",
    "email": "officer@company.com",
    "role": "user"
  }
  ```

### 2. User Login
- **Route**: `POST /auth/login`
- **Request Body**: Standard form-urlencoded (`username` and `password`)
- **Response** (200 OK):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "username": "compliance_officer",
      "email": "officer@company.com",
      "role": "user"
    }
  }
  ```

---

## Document Endpoints (Bearer Auth Required)

### 1. Upload Document
- **Route**: `POST /documents/upload`
- **Request**: Multipart Form Data (`file` key)
- **Response** (201 Created):
  ```json
  {
    "id": 1,
    "filename": "vendor_proposal.pdf",
    "file_type": "application/pdf",
    "file_size": 245124,
    "created_at": "2026-07-31T21:00:00"
  }
  ```

### 2. List Documents
- **Route**: `GET /documents`
- **Response** (200 OK):
  ```json
  [
    {
      "id": 1,
      "filename": "vendor_proposal.pdf",
      "file_type": "application/pdf",
      "file_size": 245124,
      "created_at": "2026-07-31T21:00:00"
    }
  ]
  ```

### 3. Delete Document
- **Route**: `DELETE /documents/{doc_id}`
- **Response** (200 OK):
  ```json
  {
    "detail": "Document successfully deleted"
  }
  ```

---

## Agent Workflow Endpoints (Bearer Auth Required)

### 1. Trigger Agent Auditing Graph
- **Route**: `POST /agents/verify`
- **Request Body**:
  ```json
  {
    "query": "Should we approve Vendor ABC?",
    "document_ids": [1, 2]
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "id": 12,
    "query": "Should we approve Vendor ABC?",
    "decision_status": "APPROVE",
    "confidence_score": 0.94,
    "explanation": "### Recommendation: APPROVE...",
    "evidence_graph_data": "...",
    "created_at": "2026-07-31T21:02:00",
    "agent_logs": [
      {
        "agent_name": "Planner Agent",
        "log_message": "Planning complete.",
        "status": "INFO",
        "created_at": "2026-07-31T21:02:01"
      }
    ]
  }
  ```

---

## Decision Endpoints (Bearer Auth Required)

### 1. List Decisions
- **Route**: `GET /decisions`
- **Response** (200 OK): Array of decision records.

### 2. Get Decision Details
- **Route**: `GET /decisions/{decision_id}`
- **Response** (200 OK): Full decision breakdown including evidence logs, timeline logs, and conflicts.

---

## Report Export Endpoints (Bearer Auth Required)

### 1. Download PDF Report
- **Route**: `GET /reports/{decision_id}/pdf`
- **Response**: Binary PDF file.

### 2. Download JSON Raw Export
- **Route**: `GET /reports/{decision_id}/json`
- **Response**: JSON file download attachment.

### 3. Download HTML Printable Page
- **Route**: `GET /reports/{decision_id}/html`
- **Response**: HTML file attachment.

# API Documentation

Complete reference for all API endpoints in the AI Maturity Assessment application.

## Table of Contents

- [Authentication](#authentication)
- [Public Endpoints](#public-endpoints)
  - [Questionnaire API](#questionnaire-api)
  - [Assessment API](#assessment-api)
  - [Health Check](#health-check)
- [Admin Endpoints](#admin-endpoints)
  - [Questionnaire Management](#questionnaire-management)
  - [Queue Management](#queue-management)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Authentication

Admin endpoints require authentication via NextAuth.js. Include session credentials in your requests.

```javascript
// Example with fetch
const response = await fetch('/api/admin/questionnaire', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
});
```

## Public Endpoints

### Questionnaire API

#### Get Latest Published Questionnaire

Retrieves the most recent published questionnaire version with all areas, elements, and questions.

```http
GET /api/questionnaire/latest
```

**Response 200 OK:**
```json
{
  "id": "clxxx...",
  "versionNumber": 2,
  "status": "PUBLISHED",
  "publishedAt": "2024-01-15T10:00:00.000Z",
  "areas": [
    {
      "id": "clyyy...",
      "code": "STRATEGY",
      "name": "AI Strategy & Vision",
      "description": "Strategic planning and alignment",
      "weight": 0.2,
      "order": 1,
      "elements": [
        {
          "id": "clzzz...",
          "code": "VISION",
          "name": "Vision and Objectives",
          "description": "Clear AI vision",
          "weight": 0.5,
          "order": 1,
          "questions": [
            {
              "id": "claaa...",
              "code": "Q1",
              "text": "Does your organization have a clear AI vision?",
              "helpText": "Consider documented strategy",
              "type": "LIKERT_5",
              "weight": 1.0,
              "order": 1
            }
          ]
        }
      ]
    }
  ]
}
```

**Response 404 Not Found:**
```json
{
  "error": "No published questionnaire found"
}
```

### Assessment API

#### Create New Assessment

Creates a new assessment session for a user.

```http
POST /api/assessment
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "companyName": "Example Corporation"
}
```

**Validation:**
- `email`: Valid email format (required)
- `companyName`: String, 1-200 characters (required)

**Response 201 Created:**
```json
{
  "id": "clbbb...",
  "email": "user@example.com",
  "companyName": "Example Corporation",
  "status": "IN_PROGRESS",
  "createdAt": "2024-01-20T14:30:00.000Z"
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

**Response 404 Not Found:**
```json
{
  "error": "No published questionnaire available"
}
```

#### Get Assessment Details

Retrieves assessment details including current progress.

```http
GET /api/assessment/{id}
```

**Path Parameters:**
- `id`: Assessment ID (cuid)

**Response 200 OK:**
```json
{
  "id": "clbbb...",
  "email": "user@example.com",
  "companyName": "Example Corporation",
  "status": "IN_PROGRESS",
  "questionnaireVersionId": "clxxx...",
  "createdAt": "2024-01-20T14:30:00.000Z",
  "submittedAt": null,
  "answers": [
    {
      "questionId": "claaa...",
      "value": 4
    }
  ],
  "progress": {
    "totalQuestions": 25,
    "answeredQuestions": 10,
    "percentage": 40
  }
}
```

**Response 404 Not Found:**
```json
{
  "error": "Assessment not found"
}
```

#### Submit Answer

Records an answer for a specific question in the assessment.

```http
POST /api/assessment/{id}
Content-Type: application/json
```

**Path Parameters:**
- `id`: Assessment ID (cuid)

**Request Body:**
```json
{
  "questionId": "claaa...",
  "value": 4
}
```

**Validation:**
- `questionId`: Valid cuid (required)
- `value`: Integer 1-5 for LIKERT_5 questions (required)

**Response 200 OK:**
```json
{
  "id": "clccc...",
  "assessmentId": "clbbb...",
  "questionId": "claaa...",
  "value": 4,
  "createdAt": "2024-01-20T14:35:00.000Z"
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Assessment already submitted"
}
```

**Response 404 Not Found:**
```json
{
  "error": "Question not found in questionnaire"
}
```

#### Submit Complete Assessment

Finalizes the assessment, calculates scores, and triggers PDF generation and email notification.

**Processing Flow:**
1. Validates all questions are answered
2. Calculates scores and maturity levels
3. Enqueues PDF generation job
4. PDF worker generates PDF → triggers email job
5. Email worker sends email with PDF attachment

```http
POST /api/assessment/{id}/submit
```

**Path Parameters:**
- `id`: Assessment ID (cuid)

**Response 200 OK:**
```json
{
  "id": "clbbb...",
  "status": "COMPLETED",
  "submittedAt": "2024-01-20T15:00:00.000Z",
  "scores": {
    "STRATEGY": {
      "score": 3.8,
      "level": "ADVANCED"
    },
    "DATA": {
      "score": 3.2,
      "level": "INTERMEDIATE"
    }
  },
  "overallScore": 3.5,
  "overallLevel": "ADVANCED",
  "pdfJob": {
    "id": "123",
    "status": "waiting"
  },
  "emailJob": {
    "id": "124",
    "status": "waiting"
  }
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Not all questions answered",
  "missing": 5
}
```

#### Get Assessment Results

Retrieves calculated scores and maturity levels.

```http
GET /api/assessment/{id}/results
```

**Path Parameters:**
- `id`: Assessment ID (cuid)

**Response 200 OK:**
```json
{
  "assessmentId": "clbbb...",
  "companyName": "Example Corporation",
  "submittedAt": "2024-01-20T15:00:00.000Z",
  "overallScore": 3.5,
  "overallLevel": "ADVANCED",
  "areaScores": [
    {
      "area": "STRATEGY",
      "name": "AI Strategy & Vision",
      "score": 3.8,
      "level": "ADVANCED",
      "maxScore": 5.0
    },
    {
      "area": "DATA",
      "name": "Data Management",
      "score": 3.2,
      "level": "INTERMEDIATE",
      "maxScore": 5.0
    }
  ],
  "elementScores": [
    {
      "element": "VISION",
      "name": "Vision and Objectives",
      "area": "STRATEGY",
      "score": 4.0,
      "level": "ADVANCED"
    }
  ]
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Assessment not submitted yet"
}
```

#### Generate/Download PDF Report

Triggers PDF generation or downloads existing report.

```http
GET /api/assessment/{id}/pdf
```

**Path Parameters:**
- `id`: Assessment ID (cuid)

**Response 200 OK (PDF exists):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="ai-assessment-{id}.pdf"`
- Body: PDF file binary

**Response 202 Accepted (PDF generating):**
```json
{
  "status": "generating",
  "jobId": "123",
  "message": "PDF generation in progress"
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Assessment not submitted yet"
}
```

### Health Check

#### System Health Status

Checks database and Redis connectivity.

```http
GET /api/health
```

**Response 200 OK:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T15:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

**Response 503 Service Unavailable:**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-20T15:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "disconnected"
  },
  "error": "Redis connection failed"
}
```

## Admin Endpoints

All admin endpoints require authentication.

### Questionnaire Management

#### List All Questionnaire Versions

```http
GET /api/admin/questionnaire
```

**Query Parameters:**
- `status`: Filter by status (DRAFT, PUBLISHED, ARCHIVED)

**Response 200 OK:**
```json
{
  "versions": [
    {
      "id": "clxxx...",
      "versionNumber": 2,
      "status": "PUBLISHED",
      "publishedAt": "2024-01-15T10:00:00.000Z",
      "createdAt": "2024-01-10T09:00:00.000Z",
      "areasCount": 5,
      "questionsCount": 25
    }
  ],
  "total": 1
}
```

#### Create New Questionnaire Version

```http
POST /api/admin/questionnaire
Content-Type: application/json
```

**Request Body:**
```json
{
  "versionNumber": 3,
  "areas": [
    {
      "code": "STRATEGY",
      "name": "AI Strategy & Vision",
      "description": "Strategic planning",
      "weight": 0.2,
      "order": 1,
      "elements": [
        {
          "code": "VISION",
          "name": "Vision and Objectives",
          "weight": 0.5,
          "order": 1,
          "questions": [
            {
              "code": "Q1",
              "text": "Question text",
              "type": "LIKERT_5",
              "weight": 1.0,
              "order": 1
            }
          ]
        }
      ]
    }
  ]
}
```

**Response 201 Created:**
```json
{
  "id": "clddd...",
  "versionNumber": 3,
  "status": "DRAFT",
  "createdAt": "2024-01-20T15:00:00.000Z"
}
```

#### Get Questionnaire Version Details

```http
GET /api/admin/questionnaire/{id}
```

**Response 200 OK:**
Returns full questionnaire structure with all areas, elements, and questions.

#### Update Questionnaire Version

```http
PUT /api/admin/questionnaire/{id}
Content-Type: application/json
```

**Note:** Only DRAFT versions can be updated.

**Request Body:**
Same structure as create endpoint.

**Response 200 OK:**
```json
{
  "id": "clddd...",
  "versionNumber": 3,
  "status": "DRAFT",
  "updatedAt": "2024-01-20T16:00:00.000Z"
}
```

#### Delete Questionnaire Version

```http
DELETE /api/admin/questionnaire/{id}
```

**Note:** Cannot delete PUBLISHED versions with associated assessments.

**Response 204 No Content**

#### Publish Questionnaire Version

```http
POST /api/admin/questionnaire/{id}/publish
```

**Response 200 OK:**
```json
{
  "id": "clddd...",
  "status": "PUBLISHED",
  "publishedAt": "2024-01-20T16:00:00.000Z"
}
```

**Response 400 Bad Request:**
```json
{
  "error": "Questionnaire validation failed",
  "issues": [
    "Missing questions in area STRATEGY"
  ]
}
```

#### Archive Questionnaire Version

```http
POST /api/admin/questionnaire/{id}/archive
```

**Response 200 OK:**
```json
{
  "id": "clxxx...",
  "status": "ARCHIVED"
}
```

#### Clone Questionnaire Version

```http
POST /api/admin/questionnaire/{id}/clone
Content-Type: application/json
```

**Request Body:**
```json
{
  "newVersionNumber": 4
}
```

**Response 201 Created:**
```json
{
  "id": "cleee...",
  "versionNumber": 4,
  "status": "DRAFT",
  "clonedFrom": "clddd..."
}
```

#### Validate Questionnaire Structure

```http
POST /api/admin/questionnaire/{id}/validate
```

**Response 200 OK:**
```json
{
  "valid": true,
  "issues": []
}
```

**Response 400 Bad Request:**
```json
{
  "valid": false,
  "issues": [
    "Area STRATEGY has no elements",
    "Total area weights do not sum to 1.0"
  ]
}
```

#### Update Area

```http
PUT /api/admin/questionnaire/{id}/area/{areaId}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Area Name",
  "description": "Updated description",
  "weight": 0.25,
  "order": 1
}
```

#### Delete Area

```http
DELETE /api/admin/questionnaire/{id}/area/{areaId}
```

**Response 204 No Content**

#### Update Element

```http
PUT /api/admin/questionnaire/{id}/element/{elementId}
Content-Type: application/json
```

#### Delete Element

```http
DELETE /api/admin/questionnaire/{id}/element/{elementId}
```

#### Update Question

```http
PUT /api/admin/questionnaire/{id}/question/{questionId}
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "Updated question text",
  "helpText": "Updated help text",
  "weight": 1.5,
  "order": 2
}
```

#### Delete Question

```http
DELETE /api/admin/questionnaire/{id}/question/{questionId}
```

### Queue Management

#### Get Queue Status

```http
GET /api/admin/queue/status
```

**Response 200 OK:**
```json
{
  "queues": [
    {
      "name": "pdf-generation",
      "waiting": 2,
      "active": 1,
      "completed": 145,
      "failed": 3,
      "delayed": 0,
      "paused": false
    },
    {
      "name": "email-notification",
      "waiting": 0,
      "active": 0,
      "completed": 150,
      "failed": 1,
      "delayed": 0,
      "paused": false
    }
  ],
  "timestamp": "2024-01-20T15:00:00.000Z"
}
```

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)",
  "code": "ERROR_CODE (optional)"
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `204 No Content`: Delete successful
- `400 Bad Request`: Invalid request data or business logic error
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## Rate Limiting

Public endpoints are rate-limited to prevent abuse:

- **Limit**: 10 requests per minute per IP
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

**Response 429 Too Many Requests:**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

## Data Types

### Maturity Levels

Scores are converted to maturity levels:

- `1.0 - 1.8`: INITIAL
- `1.9 - 2.6`: BASIC
- `2.7 - 3.4`: INTERMEDIATE
- `3.5 - 4.2`: ADVANCED
- `4.3 - 5.0`: OPTIMIZED

### Question Types

- `LIKERT_5`: 5-point scale (1-5)

### Status Values

**Assessment Status:**
- `IN_PROGRESS`: Assessment started, not submitted
- `COMPLETED`: Assessment submitted and scored

**Questionnaire Status:**
- `DRAFT`: Editable, not published
- `PUBLISHED`: Active and available for assessments
- `ARCHIVED`: No longer active, read-only

## Examples

### Complete Assessment Flow

```javascript
// 1. Get latest questionnaire
const questionnaire = await fetch('/api/questionnaire/latest')
  .then(r => r.json());

// 2. Create assessment
const assessment = await fetch('/api/assessment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    companyName: 'Example Corp'
  })
}).then(r => r.json());

// 3. Submit answers
for (const area of questionnaire.areas) {
  for (const element of area.elements) {
    for (const question of element.questions) {
      await fetch(`/api/assessment/${assessment.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          value: 4
        })
      });
    }
  }
}

// 4. Submit assessment
const result = await fetch(`/api/assessment/${assessment.id}/submit`, {
  method: 'POST'
}).then(r => r.json());

// 5. Get results
const scores = await fetch(`/api/assessment/${assessment.id}/results`)
  .then(r => r.json());

// 6. Download PDF
window.location.href = `/api/assessment/${assessment.id}/pdf`;
```

### Admin: Create and Publish Questionnaire

```javascript
// 1. Create new version
const newVersion = await fetch('/api/admin/questionnaire', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    versionNumber: 3,
    areas: [/* areas data */]
  })
}).then(r => r.json());

// 2. Validate structure
const validation = await fetch(
  `/api/admin/questionnaire/${newVersion.id}/validate`,
  {
    method: 'POST',
    credentials: 'include'
  }
).then(r => r.json());

if (validation.valid) {
  // 3. Publish
  await fetch(`/api/admin/questionnaire/${newVersion.id}/publish`, {
    method: 'POST',
    credentials: 'include'
  });
}
```

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Full assessment flow
- Admin questionnaire management
- Queue monitoring
- PDF and email generation

## Support

For API support or to report issues, contact the development team.

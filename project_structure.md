<!-- Detailed explanation of the project structure and API examples -->
# Project Structure and Directory Map

This document explains the organization and roles of all folders and files in the Cloud-Based File Storage & Sharing System.

## Directory Outline

- **backend/**: The Node.js Express server application.
  - **config/**: System configuration helpers.
    - `aws.js`: Configures the Amazon S3 Client using credentials from the environment.
    - `db.js`: Opens the SQLite database connection and runs the initial schema setup.
  - **controllers/**: Business logic layer containing HTTP request-response handlers.
    - `authController.js`: Manages user registration, login JWT token cookie signing, and logout.
    - `fileController.js`: Handles listing files, requesting S3 PUT upload presigned URLs, confirming metadata registry, issuing GET download URLs, deletion, and calculating storage quotas.
    - `shareController.js`: Manages generating temporary cryptographic share tokens and resolving them.
  - **middleware/**: Request processing interceptors.
    - `authMiddleware.js`: Validates the JWT cookie/header and sets `req.user` context.
  - **models/**: Database templates.
    - `schema.sql`: Contains definition schemas for sqlite database tables (`users`, `files`, `shares`).
  - **routes/**: Maps Express router API endpoints to respective controller actions.
    - `auth.js`: Mounts `/register`, `/login`, and `/logout`.
    - `files.js`: Mounts metadata list, download URL, deletion, upload URLs, and usage endpoints.
    - `share.js`: Mounts public resolution and protected creation endpoints.
  - `server.js`: Server starter config.
  - `package.json`: Manages scripts and NPM dependency list.
  - `.env.example`: System environment configuration placeholder.

- **frontend/**: Client browser interface application.
  - **public/**: Public assets.
    - **css/**: Style assets.
      - `styles.css`: Glassmorphism styles, dark gradients, layout grids, alerts, and dynamic progress bar.
    - **js/**: Core Javascript functionalities.
      - `api.js`: Standardized async HTTP request caller supporting cookie credentials.
      - `auth.js`: Form submission handlers for login/register sections.
      - `dashboard.js`: File list rendering, drag-and-drop file picker, S3 direct upload PUT handler, download link execution, and modal dialogs.
    - `index.html`: Auth portal landing page.
  - `dashboard.html`: Secure dashboard listing user's files and space usage.

---

## API Request & Response Examples

### 1. User Registration
- **Endpoint**: `POST /api/auth/register`
- **Request Body**:
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```
- **Response (201 Created)**:
```json
{
  "message": "User registered successfully",
  "userId": 1
}
```

### 2. User Login
- **Endpoint**: `POST /api/auth/login`
- **Request Body**:
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```
- **Response (200 OK)**:
- *Note: Sets `token` cookie via HTTP-only.*
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "johndoe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5..."
}
```

### 3. Request Presigned S3 Upload URL
- **Endpoint**: `POST /api/files/upload-url`
- **Request Body**:
```json
{
  "filename": "my_document.pdf",
  "fileType": "application/pdf",
  "fileSize": 1048576
}
```
- **Response (200 OK)**:
```json
{
  "uploadUrl": "https://your-s3-bucket-name.s3.us-east-1.amazonaws.com/1/1721634591230_my_document.pdf?AWSAccessKeyId=...",
  "s3Key": "1/1721634591230_my_document.pdf"
}
```

### 4. Confirm Upload Metadata
- **Endpoint**: `POST /api/files/confirm-upload`
- **Request Body**:
```json
{
  "filename": "my_document.pdf",
  "s3Key": "1/1721634591230_my_document.pdf",
  "fileSize": 1048576,
  "fileType": "application/pdf"
}
```
- **Response (201 Created)**:
```json
{
  "message": "File uploaded successfully",
  "fileId": 3
}
```

### 5. Generate Share Link
- **Endpoint**: `POST /api/shares`
- **Request Body**:
```json
{
  "fileId": 3,
  "expiresInMinutes": 120
}
```
- **Response (200 OK)**:
```json
{
  "shareToken": "d3b07384-d113-4ec2-a5d6-c0c2be43000b",
  "expiresAt": "2026-07-22T15:02:17.000Z"
}
```

### 6. Resolve Share Link
- **Endpoint**: `GET /api/shares/:token` (e.g. `/api/shares/d3b07384-d113-4ec2-a5d6-c0c2be43000b`)
- **Response (302 Found Redirect)**:
- *Redirects user directly to the S3 secure download resource:*
```
Location: https://your-s3-bucket-name.s3.us-east-1.amazonaws.com/1/1721634591230_my_document.pdf?AWSAccessKeyId=...&Signature=...
```

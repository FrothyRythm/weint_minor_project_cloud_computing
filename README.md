<!-- README file explaining CloudVault technology stack, data flow, and deployment details -->
# CloudVault - Secure File Storage & Sharing System

CloudVault is a secure, lightweight, and responsive cloud storage solution that lets users manage files, preview media, and create temporary expirable sharing links.

### Live Production Deployment
👉 Access CloudVault at: **[https://cloudvault-7xmz.onrender.com](https://cloudvault-7xmz.onrender.com)**

---

## 1. Technology Stack

* **Frontend**:
  * Vanilla HTML5 & CSS3: Implemented with a responsive layout grid, earthy colors, and CSS animations.
  * Javascript (ES6+): Asynchronous API integration.
  * [Mammoth.js](https://github.com/mwilliamson/javascript-mammoth): Client-side binary parsing of Word (`.docx`) documents to clean HTML.
  * [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs): Client-side spreadsheet rendering of Excel (`.xlsx`/`.xls`) files into responsive tables.
* **Backend**:
  * Node.js & Express: Routing, security controllers, and session routing.
  * SQLite3: Embedded file metadata, sharing links, and user credentials registry.
  * JSON Web Tokens (JWT): Cookie-based authentication sessions.
* **Cloud Storage**:
  * Amazon S3: Objects storage. Uses direct-to-S3 uploads to reduce server memory overhead.
  * AWS SDK v3: Generates secure S3 presigned PUT and GET URLs.

---

## 2. Directory Structure

```
/
├── backend/
│   ├── config/
│   │   ├── aws.js            # Amazon S3 SDK setup
│   │   └── db.js             # SQLite initialization & schema run
│   ├── controllers/
│   │   ├── authController.js # Signup, login, logout, password change
│   │   ├── fileController.js # S3 urls, deletes, space usage computations
│   │   └── shareController.js# Share link generators and public redirects
│   ├── middleware/
│   │   └── authMiddleware.js # JWT verification filter
│   ├── models/
│   │   └── schema.sql        # Database schema
│   ├── routes/               # API endpoints
│   ├── server.js             # Express startup & static file hosting
│   └── package.json          # Node scripts & dependencies
├── frontend/
│   ├── public/
│   │   ├── css/styles.css    # Unified visual layout rules
│   │   ├── js/               # API requests, auth hooks, dashboard logic
│   │   └── index.html        # Authentication landing page
│   └── dashboard.html        # Workspace file browser dashboard
├── package.json              # Root manager for Render deployments
├── project_structure.md      # Detailed folder maps and API payloads
└── cloud_deployment_guide.md # Step-by-step AWS and EC2 server manual
```

---

## 3. Data Flow Architecture

### Authentication
1. User submits login details -> Backend validates credentials and signs a JWT.
2. The JWT is returned and stored in an `HttpOnly` cookie for cross-origin security.

### Direct-to-S3 File Upload
1. Frontend selects file(s) and requests an upload URL from backend.
2. Backend checks the user's **1 GB storage quota limit**. If clear, it requests a secure `PUT` URL from S3 and returns it to the client.
3. Frontend uploads the file directly to S3 using an `XMLHttpRequest` (updating the combined progress bar).
4. On S3 completion, the client triggers a metadata confirmation request to SQLite.

### Secure File Downloads & Previews
1. Users click **Download** or **Preview** -> Backend verifies file ownership.
2. Backend requests a temporary secure `GET` URL from S3 (valid for 1 hour).
3. **Downloads**: Browser fetches the object.
4. **Previews**: Client renders images, audio, video, text files, Word documents (via Mammoth), or spreadsheets (via SheetJS) inside the preview modal.

### Expirable Share Links
1. Users create a share link with custom expiry times.
2. Backend generates a UUID token and sets an expiration timestamp.
3. Anyone visiting the public link `http://domain.com/api/shares/:token` is validated by the backend and redirected directly to the private S3 object download address.

# Development of Digital Subsidy and Grant Administration Platform

A full-stack web application for managing and tracking the disbursement of government subsidies — from beneficiary application to officer verification, admin approval, milestone-based disbursement, and field inspection — built with a **Spring Boot** backend and a **React (Vite)** frontend.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Modules](#modules)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Environment Variables](#environment-variables)
  - [Frontend Setup](#frontend-setup)
  - [Running with Docker](#running-with-docker)
- [API Overview](#api-overview)
- [Security Notice](#security-notice)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Government subsidy programs typically involve multiple parties — beneficiaries, verifying officers, finance officers, and administrators — moving through multiple stages: application, eligibility verification, allocation, stage-based approval, field inspection, and milestone-based fund disbursement. This system digitizes that entire lifecycle, replacing manual paperwork with a transparent, role-based tracking platform where every application's status is visible in real time.

---

## Key Features

- **Role-based access control** for Admin, Officer, Finance Officer, and Beneficiary users using Spring Security and JWT authentication
- **Subsidy application workflow** — beneficiaries submit applications, officers verify eligibility/documents, admins approve/reject and allocate to officers
- **Rule-based eligibility engine** that scores applications against scheme-defined eligibility rules
- **Officer allocation & capacity management** — batch/individual allocation of applications to officers with workload and capacity tracking
- **Field inspection workflow** — officers submit inspection reports with photo/media evidence (via Cloudinary) tied to specific applications
- **Milestone-based disbursement** — configurable disbursement stages per scheme, proof-of-milestone submission/rejection, and fund release tracking, with automated overdue checks and reminders
- **Real-time in-app notifications** via WebSocket, plus a REST notification inbox with read/unread tracking
- **Admin analytics dashboards** — scheme-wise, region-wise, and performance dashboards, monthly trends, sparklines, and rejection/flag-reason breakdowns
- **Audit trail** of status changes and actions for accountability and transparency
- **PDF report generation** (overdue disbursement reports) via OpenPDF
- **RESTful API** connecting the React frontend to the Spring Boot backend

---

## User Roles

| Role                | Responsibilities                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------|
| **Beneficiary**      | Register, submit subsidy applications, upload supporting documents, track application & disbursement status  |
| **Officer**          | Review assigned applications, verify eligibility/documents, conduct field inspections, forward decisions      |
| **Finance Officer**  | Configure and manage milestone-based disbursement plans, release funds, review overdue milestones             |
| **Admin**            | Approve/reject applications, manage schemes and officers, allocate workload, view program-wide analytics      |

---

## Tech Stack

| Layer              | Technology                                                        |
| ------------------- | ------------------------------------------------------------------|
| **Backend**         | Java 17, Spring Boot, Spring Security, Spring Data JPA, WebSocket |
| **Frontend**        | React 19, Vite, Axios, React Router, Recharts, Framer Motion      |
| **Database**        | MySQL 8 (H2 available at runtime for local/test use)              |
| **Authentication**  | JWT-based stateless authentication (JJWT)                          |
| **File Storage**    | Cloudinary (document & inspection media uploads)                  |
| **Reporting**       | OpenPDF (PDF report generation)                                    |
| **Containerization**| Docker & Docker Compose                                            |

---

## Architecture

```
┌─────────────┐       REST API (JSON)        ┌──────────────────┐       JPA/Hibernate      ┌──────────┐
│   React     │  ────────────────────────▶   │   Spring Boot    │  ───────────────────▶   │  MySQL   │
│  (Vite)     │  ◀────────────────────────   │  Backend (API)   │  ◀───────────────────   │    DB    │
│  Frontend   │        JWT Auth               │                  │                          └──────────┘
└─────────────┘   WebSocket (notifications)   └──────────────────┘
                                                        │
                                                        ▼
                                                  ┌────────────┐
                                                  │ Cloudinary │  (document / media storage)
                                                  └────────────┘
```

---

## Modules

| Module                       | Description                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------|
| **Auth Module**               | Registration, login/logout, JWT issuance/validation, role-based access, officer approval flow |
| **Scheme Module**             | Scheme creation, categories, required documents/fields, eligibility rule configuration        |
| **Beneficiary Module**        | Beneficiary profile management and self-service tracking                                     |
| **Application Module**        | Application creation, field values, document uploads, submission, allocation                  |
| **Eligibility Engine**        | Scores an application against a scheme's configured eligibility rules                          |
| **Allocation Module**         | Assigns applications to officers individually or in batch; tracks officer capacity/workload    |
| **Workflow Module**           | Stage-based review actions and workflow history per application                                |
| **Inspection Module**         | Field inspection submission and review, with media evidence                                    |
| **Disbursement Module**       | Milestone-based disbursement plans, proof submission/rejection, fund release, overdue tracking |
| **Notification Module**       | Real-time (WebSocket) and REST-based notifications with read/unread state                      |
| **Dashboard Module**          | Scheme/region/performance analytics for admins                                                 |
| **Report Module**             | Overdue disbursement reports, including PDF export                                             |
| **Audit Module**              | Logs and exposes an audit trail of key actions                                                 |
| **Media Module**              | Generic file upload handling via Cloudinary                                                    |

---

## Project Structure

```
Developement-of-Digital-Subsidy-and-Grant-Administration-Platfrom-/
│
├── backend/
│   ├── src/main/java/com/example/gov_scheme_backend/
│   │   ├── config/            # Security, WebSocket, Cloudinary config, schema repair runner
│   │   ├── controllers/       # REST controllers (Auth, Application, Beneficiary, Scheme,
│   │   │                        Allocation, Workflow, Inspection, Disbursement,
│   │   │                        Notification, Dashboard, Report, Audit, Media)
│   │   ├── dto/
│   │   │   ├── request/       # Grouped by domain: application, auth, beneficiary,
│   │   │   │                    disbursement, inspection, schemes, workflow
│   │   │   └── response/      # Grouped the same way, plus dashboard/notification/stage
│   │   ├── entities/          # JPA entities (Application, Beneficiary, Users, Schemes,
│   │   │                        DisbursementPlan/Milestone, FieldInspection, AuditLog, etc.)
│   │   ├── enums/              # ApplicationStatus, Role, WorkflowStage/Action,
│   │   │                         MilestoneStatus, RuleField/Operator, etc.
│   │   ├── exceptions/         # Custom exceptions + GlobalExceptionHandler
│   │   ├── repositories/       # Spring Data JPA repositories
│   │   ├── security/           # JwtService, JwtAuthenticationFilter, CustomUserDetailsService
│   │   ├── services/           # Business logic interfaces
│   │   │   └── impl/           # Service implementations (incl. DisbursementScheduler)
│   │   └── GovSchemeBackendApplication.java
│   ├── src/main/resources/
│   │   └── application.properties
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── pom.xml
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/             # Icons and static assets
│   │   ├── components/         # Reusable UI components
│   │   ├── context/             # Auth/global React context
│   │   ├── hooks/                # Custom React hooks
│   │   ├── pages/
│   │   │   ├── admins/            # Admin dashboard
│   │   │   ├── auth/               # Login, Register
│   │   │   ├── beneficiary/        # Dashboard, Application Tracking, Funds Tracker
│   │   │   └── officers/           # Officer Dashboard, Finance Dashboard, Officer Register
│   │   ├── services/            # Axios API modules (api, auth, application, scheme,
│   │   │                          officer, eligibility, funds, admin, sessionCleanup)
│   │   └── styles/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- MySQL 8+ (or Docker, see below)
- Maven (or use the included `mvnw` wrapper — no local Maven install needed)

### Backend Setup

```bash
git clone https://github.com/Akshay1code/Developement-of-Digital-Subsidy-and-Grant-Administration-Platfrom-.git
cd Developement-of-Digital-Subsidy-and-Grant-Administration-Platfrom-/backend

# 1. Create the database
mysql -u root -p -e "CREATE DATABASE gov_subsidy_db;"

# 2. Set the required environment variables (see below) — do NOT rely on the
#    checked-in defaults in application.properties for anything beyond local testing

# 3. Run the app (uses the Maven wrapper, no local Maven needed)
./mvnw clean install
./mvnw spring-boot:run
```

The backend starts on **http://localhost:8080** by default. `spring.jpa.hibernate.ddl-auto=update` means tables are created/updated automatically on startup — no manual schema setup needed for local development.

### Environment Variables

`backend/src/main/resources/application.properties` is driven entirely by environment variables, each with a local-dev fallback:

| Variable                | Purpose                                   | Default (local only)                          |
| ------------------------ | ------------------------------------------ | ----------------------------------------------- |
| `DB_URL`                 | JDBC connection string                    | `jdbc:mysql://localhost:3306/gov_subsidy_db`   |
| `DB_USERNAME`             | MySQL username                            | `root`                                          |
| `DB_PASSWORD`             | MySQL password                            | *(set your own — see Security Notice below)*   |
| `JWT_SECRET`              | Secret key used to sign JWTs              | *(set your own — see Security Notice below)*   |
| `PORT`                    | Server port                               | `8080`                                          |
| `CLOUDINARY_CLOUD_NAME`   | Cloudinary account cloud name             | *(set your own)*                                |
| `CLOUDINARY_API_KEY`      | Cloudinary API key                        | *(set your own)*                                |
| `CLOUDINARY_API_SECRET`   | Cloudinary API secret                     | *(set your own)*                                |

Create a `.env` file locally (and make sure it's git-ignored) or export these in your shell before running the backend, e.g.:

```bash
export DB_PASSWORD=your_local_mysql_password
export JWT_SECRET=$(openssl rand -hex 32)
export CLOUDINARY_CLOUD_NAME=your_cloud_name
export CLOUDINARY_API_KEY=your_api_key
export CLOUDINARY_API_SECRET=your_api_secret
```

You'll need a free [Cloudinary](https://cloudinary.com/) account for document and inspection-media uploads to work.

### Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

The frontend (Vite) starts on **http://localhost:5173** by default and expects the backend at `http://localhost:8080` (configured in `src/services/api.js`). Update the `baseURL` there — ideally via a `VITE_API_BASE_URL` env variable — if your backend runs elsewhere.

Other available scripts:
```bash
npm run build     # production build
npm run preview   # preview the production build locally
npm run lint      # run ESLint
```

### Running with Docker

A `docker-compose.yml` (in `backend/`) spins up MySQL + the Spring Boot backend together:

```bash
cd backend
docker compose up --build
```

This starts MySQL on port `3306` and the backend on port `8080`. **Before using this for anything beyond a quick local test, replace the placeholder `JWT_SECRET` and other credentials in `docker-compose.yml`** — they're currently hardcoded example values, not secrets.

---

## API Overview

Base paths currently in use (inconsistent — see note below): `/gov/**` and `/api/**` / `/api/v1/**`.

| Endpoint                                          | Method | Description                                      | Typical Access     |
| --------------------------------------------------- | ------ | ------------------------------------------------- | -------------------- |
| `/gov/auth/signup`                                   | POST   | Register a new user                              | Public              |
| `/gov/auth/signin`                                   | POST   | Authenticate and receive JWT                     | Public              |
| `/gov/auth/signout`                                  | POST   | Sign out                                          | Authenticated       |
| `/gov/auth/profile/get`                              | GET    | Get current user's profile                       | Authenticated       |
| `/gov/auth/profile/update`                           | PUT    | Update current user's profile                    | Authenticated       |
| `/gov/auth/officer/get-request`                      | GET    | List pending officer registration requests       | Admin               |
| `/gov/auth/approval/{uniqueId}/{status}`             | PATCH  | Approve/reject an officer registration            | Admin               |
| `/gov/schemes/add`                                   | POST   | Create a new scheme                              | Admin               |
| `/gov/schemes/get`                                   | GET    | List schemes                                     | Public/Authenticated|
| `/gov/schemes/{schemeCode}`                          | PATCH  | Update a scheme                                  | Admin               |
| `/gov/beneficiary/add`                               | POST   | Create a beneficiary profile                     | Beneficiary         |
| `/gov/beneficiary/me`                                | GET    | Get current beneficiary's profile                | Beneficiary         |
| `/gov/beneficiary/{id}/disburse`                     | POST   | Trigger disbursement for a beneficiary            | Finance Officer     |
| `/gov/applications`                                  | GET    | List applications                                | Officer/Admin       |
| `/gov/applications/my`                               | GET    | List current user's applications                 | Beneficiary         |
| `/gov/applications/submit/{schemeCode}`              | POST   | Submit an application under a scheme             | Beneficiary         |
| `/gov/applications/save-fields`                      | POST   | Save application field values (draft)            | Beneficiary         |
| `/gov/applications/allocation`                       | PUT    | Update an application's officer allocation        | Admin               |
| `/api/v1/allocation/batch`                           | POST   | Batch-allocate applications to officers           | Admin               |
| `/api/v1/allocation/officers/capacity`               | GET    | View officer capacity                            | Admin               |
| `/gov/workflow/{applicationId}/action`               | POST   | Submit a workflow decision on an application      | Officer/Admin       |
| `/api/officer/applications/{applicationId}/inspection`| GET    | Get inspection context for an application         | Officer             |
| `/api/officer/inspections/submit`                    | POST   | Submit a field inspection report                 | Officer             |
| `/api/v1/disbursement/plan/{planId}/configure`       | POST   | Configure a disbursement plan's stages            | Finance Officer     |
| `/api/v1/disbursement/milestone/{milestoneId}/submit-proof` | POST | Submit proof for a milestone                | Officer/Beneficiary |
| `/api/v1/disbursement/release/{milestoneId}`         | POST   | Release funds for a completed milestone           | Finance Officer     |
| `/gov/notifications`                                 | GET    | List notifications                               | Authenticated       |
| `/gov/notifications/{notificationId}/read`           | PATCH  | Mark a notification as read                       | Authenticated       |
| `/api/v1/dashboard/performance`                      | GET    | Performance analytics                            | Admin               |
| `/api/v1/reports/overdue/pdf`                        | GET    | Download overdue-milestone report as PDF          | Admin/Finance       |
| `/gov/audit`                                         | GET    | List audit log entries                           | Admin               |
| `/api/media/upload`                                  | POST   | Generic file upload (Cloudinary)                  | Authenticated       |

> **Note:** Endpoints are split across `/gov/**` (older modules) and `/api/**`, `/api/v1/**` (newer modules). Consider standardizing on one prefix convention for consistency. This table lists the main endpoints; a few controllers also contain commented-out/in-progress routes not listed here.

---

## Security Notice

⚠️ **`application.properties` currently ships with real-looking default values** (a MySQL password, a JWT signing secret, and Cloudinary credentials) as fallback values in `${VAR:default}` syntax. If any of these defaults are real, working credentials:

1. **Rotate them immediately** (change the MySQL password, regenerate the Cloudinary API secret, and generate a new JWT secret) since this repository is public.
2. Remove hardcoded fallback values from `application.properties` entirely — require the environment variables to be set, with no default, so the app fails loudly instead of silently using a leaked secret.
3. Confirm `.gitignore` excludes any local `.env` files going forward (`backend/.gitignore` should be checked for this).

This is unrelated to documentation quality — it's a functional security issue independent of the README.

---

## Roadmap

- [ ] Email/SMS notifications on status changes (in addition to existing in-app/WebSocket notifications)
- [ ] Payment gateway / bank API integration for real fund transfer (currently disbursement is tracked, not executed against a live payment rail)
- [ ] Automated test coverage (`src/test/java` — currently no test classes present)
- [ ] CI/CD pipeline (e.g. GitHub Actions) for build/test automation
- [ ] Multi-language support for beneficiaries
- [ ] Standardize API route prefixes (`/gov/**` vs `/api/**` vs `/api/v1/**`)

---

## Contributing

Contributions are welcome! If you'd like to help improve this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

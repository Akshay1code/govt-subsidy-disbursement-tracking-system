# Govt Subsidy Disbursement Tracking System


A full-stack web application for managing and tracking the disbursement of government subsidies — from beneficiary application to officer verification, admin approval, and final fund disbursement — built with a **Spring Boot** backend and a **React** frontend.

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
  - [Frontend Setup](#frontend-setup)
- [API Overview](#api-overview)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Government subsidy programs typically involve multiple parties — beneficiaries, verifying officers, and administrators — moving through multiple stages: application, verification, approval, and disbursement. This system digitizes that entire lifecycle, replacing manual paperwork with a transparent, role-based tracking platform where every application's status is visible in real time.

---

## Key Features

- **Role-based access control** for Admin, Officer, and Beneficiary users using Spring Security and JWT authentication
- **Subsidy application workflow** — beneficiaries submit applications, officers verify documents/eligibility, admins approve or reject
- **Real-time status tracking** so beneficiaries can see whether an application is pending, under verification, approved, rejected, or disbursed
- **Disbursement management** for admins to record and track fund transfers against approved applications
- **Role-specific dashboards** — beneficiaries see their applications, officers see assigned verifications, admins see program-wide analytics
- **Audit trail** of status changes for accountability and transparency
- **RESTful API** connecting the React frontend to the Spring Boot backend

---

## User Roles

| Role | Responsibilities |
|------|-------------------|
| **Beneficiary** | Register, submit subsidy applications, upload supporting documents, track application/disbursement status |
| **Officer** | Review assigned applications, verify eligibility and documents, forward decisions to admin |
| **Admin** | Approve/reject applications, manage officers and schemes, trigger and monitor disbursements, view program analytics |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Java, Spring Boot, Spring Security, Spring Data JPA |
| **Frontend** | React, JavaScript/TypeScript, Axios |
| **Database** | MySQL |
| **Authentication** | JWT-based stateless authentication |

---

## Architecture

```
┌─────────────┐       REST API (JSON)       ┌──────────────────┐       JPA/Hibernate       ┌──────────┐
│   React     │  ────────────────────────▶  │   Spring Boot    │  ────────────────────▶   │  MySQL   │
│  Frontend   │  ◀────────────────────────  │  Backend (API)   │  ◀────────────────────   │    DB    │
└─────────────┘         JWT Auth            └──────────────────┘                           └──────────┘
```

---

## Modules

| Module | Description |
|--------|-------------|
| **Auth Module** | Handles registration, login, JWT token generation/validation, and role-based access control |
| **Beneficiary Module** | Beneficiary profile management, subsidy application submission, and document uploads |
| **Officer Module** | Assigned-application review, eligibility/document verification, and decision forwarding |
| **Admin Module** | Scheme management, officer management, application approval/rejection, and disbursement triggering |
| **Application Module** | Core subsidy application entity — creation, status transitions, and history tracking |
| **Disbursement Module** | Records and tracks fund transfers against approved applications |
| **Notification Module** | Status-change alerts to beneficiaries *(planned — see [Roadmap](#roadmap))* |
| **Reporting/Analytics Module** | Program-wide statistics and dashboards for admins |

---

## Project Structure

```
govt-subsidy-disbursement-tracking-system/
│
├── backend/
│   ├── src/main/java/com/subsidy/
│   │   ├── config/                # Security, JWT, and CORS configuration
│   │   ├── controller/            # REST controllers (Auth, Beneficiary, Officer, Admin, Disbursement)
│   │   ├── dto/                   # Request/response data transfer objects
│   │   ├── entity/                # JPA entities (User, Application, Disbursement, Scheme, Role)
│   │   ├── repository/            # Spring Data JPA repositories
│   │   ├── service/                # Business logic per module
│   │   │   └── impl/               # Service implementations
│   │   ├── security/               # JWT filter, provider, and utils
│   │   ├── exception/              # Custom exceptions and global exception handler
│   │   └── SubsidyTrackingApplication.java
│   ├── src/main/resources/
│   │   ├── application.properties  # DB and app configuration
│   │   └── data.sql                # (optional) seed data
│   ├── src/test/java/              # Unit and integration tests
│   └── pom.xml
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/                    # Axios instances and API call functions
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/
│   │   │   ├── beneficiary/        # Beneficiary dashboard, application form, status tracker
│   │   │   ├── officer/            # Officer dashboard, verification screens
│   │   │   └── admin/              # Admin dashboard, approvals, disbursements, analytics
│   │   ├── context/                # Auth context / global state
│   │   ├── routes/                 # Protected route definitions per role
│   │   ├── utils/                  # Helper functions
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── package.json
│   └── .env
│
├── LICENSE
└── README.md
```

> **Note:** Update this section to match your actual folder layout once the codebase is pushed — this reflects a standard Spring Boot + React layout for the modules described above.

---

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- MySQL 8+
- Maven

### Backend Setup

```bash
git clone https://github.com/Akshay1code/govt-subsidy-disbursement-tracking-system.git
cd govt-subsidy-disbursement-tracking-system/backend

# Configure your MySQL credentials in src/main/resources/application.properties

mvn clean install
mvn spring-boot:run
```

### Frontend Setup

```bash
cd ../frontend
npm install
npm start
```

By default, the backend API runs on `http://localhost:8080` and the frontend on `http://localhost:3000`.

---

## API Overview

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/auth/register` | `POST` | Register a new beneficiary | Public |
| `/api/auth/login` | `POST` | Authenticate and receive JWT | Public |
| `/api/applications` | `POST` | Submit a new subsidy application | Beneficiary |
| `/api/applications/{id}` | `GET` | View application status | Beneficiary |
| `/api/officer/applications` | `GET` | View assigned applications | Officer |
| `/api/officer/applications/{id}/verify` | `PUT` | Verify/reject an application | Officer |
| `/api/admin/applications/{id}/approve` | `PUT` | Approve/reject application | Admin |
| `/api/admin/disbursements` | `POST` | Record a disbursement | Admin |

> **Note:** Update this table to match your actual controllers/endpoints.

---

## Roadmap

- [ ] Email/SMS notifications on status changes
- [ ] Document upload with cloud storage integration
- [ ] Payment gateway / bank API integration for real disbursement
- [ ] Admin analytics dashboard with charts
- [ ] Multi-language support for beneficiaries

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

This project is licensed under the [MIT License](LICENSE).

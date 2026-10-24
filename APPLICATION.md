# RenewGrid: AI-Powered E-Waste Recycling and Rewards Platform

<!-- Application Stack -->
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)

<!-- Frontend Tooling -->
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)

<!-- Data and Auth -->
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=python&logoColor=white)](https://www.sqlalchemy.org/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

---

RenewGrid is a full-stack e-waste lifecycle management platform. Users submit e-waste items, collectors coordinate pickups with QR-based verification, and recyclers process delivered batches. The platform runs an AI price estimator on every submission, tracks CO2 saved, and rewards producers automatically when a pickup completes.

**Admin** manages all accounts across every role, assigns pickups to collectors and recyclers, monitors platform-wide analytics, configures the AI pricing rules per waste category, and can generate PDF reports and assign reward points manually.

**User (E-Waste Producer)** uploads e-waste with photos and metadata, receives an AI-estimated price and CO2 projection, schedules a pickup, tracks status through a live timeline, shows a QR code for collector verification, and views their reward wallet with points and CO2 credits.

**Collector** views assigned pickups on an interactive map, accepts or rejects assignments, updates status at each stage, uploads a photo as proof of collection, and records the final collected weight and price on delivery.

**Recycler** receives delivered waste batches, submits a processing decision (recycle or refurbish), updates inventory, logs a direct payment to the producer, and marks the pickup as completed, which triggers automatic reward generation.

→ [Full API reference, repository pattern, and database schema](backend/README.md)

**Application layer:** React 19 + FastAPI + PostgreSQL

---

## DevOps & CI/CD

[![RenewGrid CI/CD](https://github.com/Aoun62336/RenewGrid-DevOps/actions/workflows/renewgrid-cicd.yml/badge.svg)](https://github.com/Aoun62336/RenewGrid-DevOps/actions/workflows/renewgrid-cicd.yml)

RenewGrid implements an automated CI/CD pipeline using **GitHub Actions, Docker Buildx, GitHub Container Registry (GHCR), and Docker Compose**.

The pipeline validates the React frontend and FastAPI backend, builds and publishes versioned container images, and verifies deployment through Docker Compose with PostgreSQL and Alembic migrations.

**[View CI/CD Architecture, Deployment Guide & Execution Evidence →](DEVOPS.md)**

### Verified CI/CD Pipeline

| Stage | Implementation | Result |
|---|---|---|
| Continuous Integration | Frontend build and backend smoke tests | Passed |
| Container Publication | Docker Buildx and GHCR | Passed |
| Deployment Verification | Docker Compose, PostgreSQL and HTTP checks | Passed |

**[View Successful GitHub Actions Run](https://github.com/Aoun62336/RenewGrid-DevOps/actions/runs/39774801095)**

**Deployment model:** Automated verification on ephemeral GitHub-hosted runners, with local persistent Docker Compose support.

---

## What I Implemented

| Area | What I implemented | Repository evidence |
| :----- | :----- | :----- |
| **AI pricing engine** | On each waste submission, the service queries active `PricingRule` rows from the database for the item's category. It applies a base price, a per-kg rate, and a condition multiplier (1.0 for working, 0.6 for partial, 0.3 for broken). When no active rule exists for a category, it falls back to hardcoded rates across 7 categories. The CO2 and credit point estimates are calculated at the same time | `backend/app/services/waste_service.py` |
| **JWT authentication** | Access tokens and refresh tokens are signed with separate secrets. Tokens are created and verified in `security.py` using python-jose. Password hashing calls bcrypt directly because passlib 1.7.4 is incompatible with bcrypt 4.x. The login endpoint is rate-limited to 5 requests per minute via slowapi | `backend/app/core/security.py`, `backend/app/routers/auth.py` |
| **RBAC with 4 roles** | The `UserRole` enum defines `user`, `collector`, `recycler`, and `admin`. FastAPI dependency functions enforce the role at the API layer. On the frontend, `ProtectedRoute` components check the stored role before rendering any dashboard page | `backend/app/core/deps.py`, `frontend/src/components/auth_routes/` |
| **Pickup lifecycle (13 states)** | The `PickupStatus` enum defines 13 values. The documented production flow runs from PENDING through ASSIGNED, ACCEPTED, IN_PROGRESS, PROOF_UPLOADED, COLLECTED, DELIVERED, PROCESSING, to COMPLETED or RECYCLED. CANCELLED and REJECTED are terminal states. Every transition is written to `pickup_status_history` with the actor's user ID, timestamp, and an optional note | `backend/app/models/core.py`, `backend/app/services/collector_service.py` |
| **QR code verification** | The server generates a QR code per pickup. The user displays it on screen. The collector scans it with their device camera using html5-qrcode. The scan must succeed before the collector can advance the pickup status | `backend/app/routers/pickup.py`, `frontend/src/pages/user/QRDisplay.jsx` |
| **Reward and CO2 engine** | When a pickup reaches COMPLETED, a FastAPI BackgroundTask runs `create_reward_for_pickup`. It awards 10 points per kg and calculates CO2 saved at 0.5 kg per kg collected. It opens its own database session, checks for an existing reward first, and creates a Notification row for the producer on success | `backend/app/services/reward_service.py` |
| **Collector proof upload** | The collector uploads a photo as evidence of collection. The file is checked against an allowed MIME type list (JPEG, PNG, WebP, GIF) and capped at 5 MB. It is saved to `uploads/proofs/` with a UUID-prefixed filename and linked to the pickup through the `CollectorProof` model | `backend/app/services/collector_service.py`, `backend/app/models/core.py` |
| **Transactional email** | Password reset emails are built from an HTML template and dispatched via Python smtplib as a FastAPI BackgroundTask. The setup uses STARTTLS on port 587 and is compatible with Gmail App Passwords. Reset tokens expire after 30 minutes. All SMTP credentials come from environment variables | `backend/app/services/email_service.py` |
| **Repository pattern** | Each domain has its own repository module: auth, user, waste, pickup, collector, and recycler. All database queries live in the repository layer. Services call repositories. Routers call services. No query logic appears in routers | `backend/app/repositories/` |
| **Admin analytics dashboard** | The admin dashboard aggregates users, waste volume, pickups by status, CO2 saved, revenue, and geographic distribution. It includes trend forecasting, pricing rule management, manual reward assignment, and PDF report export | `backend/app/services/admin_service.py` |
| **File upload handling** | Waste images and profile photos are validated by content type and file size (5 MB cap). Files are saved with UUID-prefixed names to role-specific subdirectories under `uploads/` and served through FastAPI's StaticFiles mount | `backend/app/routers/auth.py`, `backend/app/services/waste_service.py` |

---

## Technology Stack

### Application Layer

| Component | Technology |
| :----- | :----- |
| **Frontend** | React 19, Vite 8, React Router v7 |
| **Backend** | Python, FastAPI, SQLAlchemy, Alembic |
| **Database** | PostgreSQL |
| **Authentication** | JWT via python-jose, bcrypt for password hashing |
| **Maps** | Leaflet, React-Leaflet |
| **PDF generation** | jsPDF, jsPDF-AutoTable |
| **QR scanning** | html5-qrcode |
| **Styling** | TailwindCSS v3 |
| **Rate limiting** | slowapi |
| **Email** | Python smtplib, STARTTLS, Gmail App Password |

### Full Stack Overview

| Technology | How it is used | Why it was used |
| :----- | :----- | :----- |
| **FastAPI** | REST API server for all business logic, auth, file serving, and background tasks | Auto-generates OpenAPI docs, native Pydantic v2 validation, async-capable |
| **SQLAlchemy** | ORM for all models and queries | Typed `Mapped` columns, relationship management, decoupled from raw SQL |
| **Alembic** | Database migration management | Version-controlled schema changes alongside code |
| **PostgreSQL** | Primary relational database | ACID compliance, native enum type support |
| **React 19** | Single-page application with four role dashboards | Component model, fast rendering, broad ecosystem |
| **Vite 8** | Frontend build tool and dev server | Sub-second HMR, ESM-native |
| **TailwindCSS v3** | Utility-first styling | Consistent UI development without leaving JSX |
| **Leaflet** | Interactive map for collector location view | Lightweight, open-source, no API key required |
| **slowapi** | Request rate limiting on FastAPI | Protects login and password reset endpoints |
| **python-jose** | JWT encoding and decoding | Lightweight, supports HS256, handles dual-secret token setup |
| **bcrypt** | Password hashing | Used directly due to passlib incompatibility with bcrypt 4.x |
| **qrcode** | Server-side QR code image generation | No external service dependency |

---

## Pickup Status Lifecycle

The `PickupStatus` enum defines 13 values. The production flow:

```
PENDING
  └─ ASSIGNED
       └─ ACCEPTED
            └─ IN_PROGRESS
                 └─ PROOF_UPLOADED
                      └─ COLLECTED
                           └─ DELIVERED
                                └─ PROCESSING
                                     └─ COMPLETED
                                     └─ RECYCLED (also resolves to COMPLETED)

Terminal states: REJECTED, CANCELLED
```

Every transition is recorded in `pickup_status_history` with the actor user ID, timestamp, and an optional note.

---

## Setup

### 1. Database

```sql
CREATE DATABASE renewgrid;
```

### 2. Backend

```bash
cd backend

# Copy the environment template
copy .env.example .env
# Edit .env: set DATABASE_URL, SECRET_KEY, REFRESH_SECRET_KEY
# For email: set SMTP_USER and SMTP_PASS (Gmail App Password)

# Create virtual environment
python -m venv venv
venv\Scripts\activate           # Windows
# source venv/bin/activate      # macOS / Linux

pip install -r requirements.txt

# Create tables and seed demo users
python scripts/seed.py

# Start the API server
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Swagger UI is at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### One-command launch (Windows)

```bash
run.bat
```

Opens both servers in separate terminal windows.

---

## Demo Credentials

| Role | Email | Password |
| :----- | :----- | :----- |
| **Administrator** | `admin@renewgrid.com` | `Admin@1234` |
| **E-Waste Producer** | `user@renewgrid.com` | `User@1234` |
| **Pickup Collector** | `collector@renewgrid.com` | `Collector@1234` |
| **Facility Recycler** | `recycler@renewgrid.com` | `Recycler@1234` |

---

## Project Structure

```
RenewGrid/
├── backend/                        # FastAPI application
│   ├── app/
│   │   ├── core/                   # Config, JWT security, dependencies, exception handlers
│   │   ├── db/                     # SQLAlchemy engine and session factory
│   │   ├── models/                 # ORM models: User, WasteUpload, PickupRequest, Reward, ...
│   │   ├── repositories/           # Data access layer: auth, user, waste, pickup, collector, recycler
│   │   ├── routers/                # REST controllers: auth, users, waste, pickup, collector, recycler, admin
│   │   ├── schemas/                # Pydantic request and response schemas
│   │   └── services/               # Business logic: AI estimator, rewards, email, admin analytics
│   ├── migrations/                 # Alembic migration scripts
│   ├── scripts/                    # seed.py, reset_passwords.py
│   ├── uploads/                    # Runtime file storage (.gitkeep preserves the directory)
│   ├── .env.example                # Environment variable template
│   └── requirements.txt
│
└── frontend/                       # React 19 + Vite SPA
    ├── src/
    │   ├── components/             # Shared UI components and route guards
    │   ├── pages/
    │   │   ├── admin/              # Admin dashboard, user management, analytics, reports
    │   │   ├── collector/          # Assigned pickups, QR scan, proof upload, availability
    │   │   ├── recycler/           # Waste receipt, processing, inventory
    │   │   └── user/               # Upload, AI estimate, schedule, tracking, rewards
    │   └── services/               # Axios API client (api.js)
    ├── public/
    └── index.html
```

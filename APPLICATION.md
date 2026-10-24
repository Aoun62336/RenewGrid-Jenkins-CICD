# RenewGrid — Jenkins CI/CD on AWS EC2

**Elevate Labs | DevOps Internship — Task 2**

## Overview

This repository demonstrates an automated Jenkins CI/CD pipeline for
RenewGrid, a full-stack e-waste recycling and rewards application
built with React, FastAPI, and PostgreSQL.

The implementation extends the completed containerization work from
Task 1 and introduces Jenkins-based validation, security scanning,
Docker Hub image publication, and Docker Compose deployment on AWS EC2.

## Technology Stack

| Component          | Technology                    |
| ------------------ | ----------------------------- |
| Source Control     | Git and GitHub                |
| CI/CD              | Jenkins Declarative Pipeline  |
| Infrastructure     | AWS EC2, Ubuntu               |
| Containers         | Docker Engine, Docker Compose |
| Image Registry     | Docker Hub                    |
| Security Scanning  | Trivy                         |
| Frontend           | React, Vite, Nginx            |
| Backend            | Python, FastAPI               |
| Database           | PostgreSQL                    |
| Migrations         | Alembic                       |
| Testing            | Pytest, ESLint                |
| Software Inventory | CycloneDX SBOM                |

## Architecture

GitHub main branch
→ Jenkins
→ Source security scan
→ Backend and frontend validation
→ Docker image builds
→ Image vulnerability scan and SBOM generation
→ Docker Hub
→ Docker Compose on AWS EC2
→ Deployment health verification

## Jenkins Pipeline

The Jenkinsfile defines ten stages:

1. Checkout
2. Secret Scan
3. Backend Tests
4. Frontend Validation
5. Docker Build
6. Image Security Scan
7. Generate SBOM
8. Docker Hub Publish
9. Deploy to EC2
10. Deployment Verification

The pipeline stops when a required stage fails.

Jenkins uses SCM polling to detect changes to the main branch.
Pull requests are validated separately before merging.

## Containerized Application

The Docker Compose configuration includes four services:

- `db` — PostgreSQL
- `migrate` — Alembic migrations
- `api` — FastAPI backend
- `web` — React frontend served by Nginx

The database and upload directories use persistent Docker volumes.

## Image Repositories

Backend:
`docker.io/fire2686/renewgrid-jenkins-api`

Frontend:
`docker.io/fire2686/renewgrid-jenkins-web`

Images use commit-specific tags, and deployment uses published digests.

## Security

The demonstration includes:

- Restricted EC2 inbound security-group access
- Jenkins bound to the loopback interface
- SSH port forwarding for web access
- Jenkins-managed Docker Hub credentials
- No credentials committed to Git
- Secret scanning
- Container vulnerability scanning
- Non-root application runtime containers
- Internal Docker networking for PostgreSQL
- Pull-request validation before main-branch delivery

## Deployment

Jenkins runs on the same EC2 instance as the RenewGrid containers.

The pipeline pulls images from Docker Hub and deploys the application
with Docker Compose.

Deployment configuration is stored under `/opt/renewgrid`.

The application is accessed through SSH port forwarding:

- Jenkins: `http://localhost:8081`
- RenewGrid: `http://localhost:8080`

No public domain or production HTTPS endpoint is configured.

## Documentation

- [`APPLICATION.md`](APPLICATION.md) — oconcise project and implementation overview
- [`DEVOPS-TASK1.md`](DEVOPS-TASK1.md) — completed Task 1 implementation
- [`DEVOPS-TASK2.md`](DEVOPS-TASK2.md) — Jenkins CI/CD architecture, operations, and execution evidence
- [`jenkins-verification.md`](evidence/jenkins/jenkins-verification.md) — verified execution record and evidence

## Scope

This project is an internship demonstration.

It is not presented as a production-grade, highly available platform.
Production operation would require additional build isolation,
monitoring, backup and recovery procedures, hardened secret handling,
and a properly configured public HTTPS endpoint.

## Author

Aoun Md.

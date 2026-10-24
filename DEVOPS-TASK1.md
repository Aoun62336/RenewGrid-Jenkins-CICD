# RenewGrid - Containerized CI/CD with GitHub Actions

**Elevate Labs | DevOps Internship — Task 1**

## 1. Overview

RenewGrid is a full-stack e-waste recycling and rewards management platform developed using React, FastAPI, and PostgreSQL.

This DevOps implementation establishes an automated CI/CD workflow using GitHub Actions, Docker Buildx, GitHub Container Registry (GHCR), and Docker Compose.

The pipeline validates application changes, builds and publishes container images, and verifies the deployed application using a temporary GitHub-hosted environment.

The implementation extends the internship's introductory CI/CD requirements with multi-stage container builds, automated database migrations, health checks, controlled image publication, immutable deployment references, and automated cleanup.

**Repository:** [RenewGrid-DevOps](https://github.com/Aoun62336/RenewGrid-DevOps)

**CI/CD Workflow:** [renewgrid-cicd.yml](.github/workflows/renewgrid-cicd.yml)

**Verified pipeline:** [Successful GitHub Actions Run #2](https://github.com/Aoun62336/RenewGrid-DevOps/actions/runs/39774801095)

---

## 2. Technology Stack

| Layer            | Technology                | Purpose                                             |
| ---------------- | ------------------------- | --------------------------------------------------- |
| Version Control  | Git, GitHub               | Source management and pull requests                 |
| CI/CD            | GitHub Actions            | Automated validation, publication, and verification |
| Containerization | Docker                    | Container image creation and execution              |
| Image Builder    | Docker Buildx / BuildKit  | Container builds, caching, and build metadata       |
| Registry         | GitHub Container Registry | Store and distribute application images             |
| Orchestration    | Docker Compose            | Multi-container application deployment              |
| Frontend         | React, Vite               | Web application                                     |
| Web Server       | Nginx                     | Static hosting and API reverse proxy                |
| Backend          | Python, FastAPI, Uvicorn  | REST APIs and application business logic            |
| Database         | PostgreSQL                | Persistent application data                         |
| Migrations       | Alembic                   | Database schema management                          |

## 3. System Architecture

### Application Request Flow

```text
Browser
   |
   v
Nginx + React
   |
   | API requests
   v
FastAPI
   |
   v
PostgreSQL
```

The frontend and backend run in separate containers.

Nginx serves the compiled React application and forwards API requests to the FastAPI service over the internal Docker network.

FastAPI handles application logic, authentication, authorization, e-waste operations, pickup management, and recycling workflows.

PostgreSQL stores application data. Docker volumes provide persistence for the database and application uploads.

### Docker Compose Services

| Service   | Responsibility                                        |
| --------- | ----------------------------------------------------- |
| `db`      | Starts PostgreSQL and verifies database readiness     |
| `migrate` | Applies Alembic migrations before application startup |
| `api`     | Runs the FastAPI backend                              |
| `web`     | Serves React through Nginx and proxies API requests   |

The database uses an internal Docker network without a published database port. The application frontend is exposed through a configurable local port.

The `migrate` service must finish successfully before the API starts, and the API health check must pass before the web service starts.

## 4. CI/CD Architecture

```text
GitHub Source
     |
     v
GitHub Actions
     |
     v
Continuous Integration
     |
     +-- Frontend dependency installation
     +-- React production build
     +-- Python dependency installation
     +-- Python syntax validation
     +-- Backend smoke tests
     |
     v
Build & Publish
     |
     +-- Docker Buildx
     +-- Backend container image
     +-- Frontend container image
     +-- SBOM and provenance generation
     |
     v
GitHub Container Registry
     |
     v
Automated Deployment Verification
     |
     +-- Pull published images by digest
     +-- Start PostgreSQL
     +-- Run Alembic migrations
     +-- Start FastAPI and Nginx
     +-- Verify HTTP endpoints
     +-- Collect diagnostic logs
     +-- Remove temporary environment
```

### 4.1 Continuous Integration

The workflow runs application validation for pull requests targeting `main` and for pushes to `main`.

The validation job:

1. Checks out the source code.
2. Sets up Node.js.
3. Installs frontend dependencies using `npm ci`.
4. Builds the React frontend.
5. Sets up Python.
6. Installs backend dependencies.
7. Compiles Python modules.
8. Executes focused backend smoke tests.

A failed validation job prevents downstream publication.

### 4.2 Container Build and Publication

After validation succeeds on `main`, GitHub Actions builds separate images for the frontend and backend using Docker Buildx.

Both images are published to GHCR.

**Published images:**

- [RenewGrid FastAPI Backend](https://github.com/Aoun62336/RenewGrid-DevOps/pkgs/container/renewgrid-devops-api)
- [RenewGrid React/Nginx Frontend](https://github.com/Aoun62336/RenewGrid-DevOps/pkgs/container/renewgrid-devops-web)

The workflow publishes commit-specific SHA tags and a moving `latest` tag.

It also enables Docker build caching and the generation of SBOM and provenance metadata.

### 4.3 Automated Deployment Verification

The deployment-verification job runs on a temporary GitHub-hosted Ubuntu runner.

It:

1. Authenticates to GHCR using the GitHub Actions token.
2. Retrieves the published image digests.
3. Generates temporary deployment credentials.
4. Pulls the frontend and backend images from GHCR.
5. Starts the application through Docker Compose.
6. Waits for PostgreSQL and database migration completion.
7. Verifies the frontend, API, and database-dependent endpoint.
8. Collects diagnostic information.
9. Removes the temporary deployment environment.

Images are referenced by immutable digest rather than relying on the mutable `latest` tag.

**Deployment model:** This is an automated ephemeral deployment for verification. It is not a permanently available production service.

## 5. Local Deployment

### Prerequisites

- Git
- Docker Desktop or Docker Engine
- Docker Compose v2
- A running Linux-container environment

### 5.1 Clone the Repository

```bash
git clone https://github.com/Aoun62336/RenewGrid-DevOps.git
cd RenewGrid-DevOps
```

### 5.2 Configure the Environment

```bash
cp .env.compose.example .env.compose
```

Edit `.env.compose` and replace the credential placeholders with independent, randomly generated secrets.

Generate values using:

```bash
openssl rand -hex 32
```

Run the command separately for each secret.

Never commit `.env.compose` to Git.

### 5.3 Validate Docker Compose

```bash
docker compose --env-file .env.compose config --quiet
```

This checks configuration validity and required environment variables without starting services.

### 5.4 Build and Start the Application

```bash
docker compose --env-file .env.compose up -d --build
```

This builds the application images, starts PostgreSQL, executes migrations, and starts the backend and frontend.

### 5.5 Check Container Status

```bash
docker compose --env-file .env.compose ps -a
```

Expected service behavior:

- `db`: healthy
- `migrate`: completed successfully
- `api`: healthy
- `web`: healthy

### 5.6 Verify Application Endpoints

```bash
curl -f http://localhost:8080/
curl -f http://localhost:8080/roles
curl -f http://localhost:8080/config
```

Local application URL: `http://localhost:8080`

The frontend is accessible through Nginx, and API requests are forwarded internally to FastAPI.

### 5.7 Troubleshooting

Inspect running services:

```bash
docker compose --env-file .env.compose ps -a
```

Inspect service logs:

```bash
docker compose --env-file .env.compose logs --tail=100
```

Inspect the migration result:

```bash
docker compose --env-file .env.compose logs migrate
```

### 5.8 Stop the Application

```bash
docker compose --env-file .env.compose down
```

This stops and removes the containers and networks while retaining named volumes.

Avoid `down -v` unless intentional deletion of persisted data is required.

## 6. Security and Reliability Controls

The implementation includes:

- Multi-stage frontend and backend Docker builds
- Non-root runtime containers
- Separate frontend, backend, and database services
- Internal database networking
- Persistent database and upload volumes
- Container health checks
- Database migration dependency ordering
- GitHub Actions job-level token permissions
- GHCR authentication using the temporary `GITHUB_TOKEN`
- Commit-specific container image tags
- Immutable image-digest deployment
- SBOM and build provenance generation
- Runtime environment configuration
- Automated deployment cleanup
- Pull-request validation before publishing from `main`

Local development uses HTTP on the loopback interface. A publicly exposed production deployment would additionally require HTTPS, secure cookie configuration, appropriate network controls, operational monitoring, and backups.

## 7. Verified CI/CD Execution

A successful three-job workflow completed on the `main` branch for commit:

`d3b5ac687f41b93df923e52dc81f7b9393123699`

**Verified workflow:** [GitHub Actions Run #2](https://github.com/Aoun62336/RenewGrid-DevOps/actions/runs/39774801095)

| Pipeline job                   | Result  |
| ------------------------------ | ------- |
| Validate application           | Success |
| Publish images to GHCR         | Success |
| Deploy with Compose and verify | Success |

Total reported workflow duration: **2 minutes 56 seconds**.

### Published Container Images

**Backend**

`ghcr.io/aoun62336/renewgrid-devops-api`

**Frontend**

`ghcr.io/aoun62336/renewgrid-devops-web`

Both images were published with commit-specific version tags and image digests.

These results establish that the configured CI, image publication, and temporary Compose verification completed successfully for the referenced commit. They do not establish complete functional or security coverage for every RenewGrid feature.

## 8. Execution Evidence

The following screenshots document the implementation and successful execution.

| Evidence                                                                  | Description                            |
| ------------------------------------------------------------------------- | -------------------------------------- |
| [01 — Successful CI/CD Workflow](evidence/cicd/01-workflow-success.png)   | Complete three-job workflow            |
| [02 — CI Validation](evidence/cicd/02-ci-validation.png)                  | Frontend build and backend smoke tests |
| [03 — GHCR Image Publication](evidence/cicd/03-ghcr-publish.png)          | Docker image build and push            |
| [04 — Docker Compose Deployment](evidence/cicd/04-compose-deployment.png) | Automated startup and verification     |
| [05 — Published Packages](evidence/cicd/05-container-packages.png)        | Frontend and backend GHCR packages     |
| [06 — Merged Pull Request](evidence/cicd/06-merged-pr.png)                | Reviewed integration into main         |

### Related GitHub Resources

- [Source Repository](https://github.com/Aoun62336/RenewGrid-DevOps)
- [CI/CD Workflow](https://github.com/Aoun62336/RenewGrid-DevOps/blob/main/.github/workflows/renewgrid-cicd.yml)
- [Successful Pipeline Execution](https://github.com/Aoun62336/RenewGrid-DevOps/actions/runs/39774801095)
- [Merged Implementation PR #7](https://github.com/Aoun62336/RenewGrid-DevOps/pull/7)
- [Backend Container Package](https://github.com/Aoun62336/RenewGrid-DevOps/pkgs/container/renewgrid-devops-api)
- [Frontend Container Package](https://github.com/Aoun62336/RenewGrid-DevOps/pkgs/container/renewgrid-devops-web)

## 9. Scope and Limitations

This implementation fulfills the internship's central objective of automating application build, image publication, and deployment verification through CI/CD.

The following are outside the verified scope:

- Permanent public cloud hosting
- Full browser-based end-to-end testing of every business workflow
- Complete application security certification
- Fully locked Python transitive dependencies
- Production monitoring and alerting
- Automated production database backup and restoration
- Production high availability
- Automated production rollback

The successful GitHub Actions run demonstrates repeatable execution of the implemented checks on a temporary runner, not production-readiness certification.

## 10. Conclusion

RenewGrid demonstrates an end-to-end CI/CD implementation using a real full-stack application rather than a basic demonstration service.

The project separates application validation, container-image publication, and deployment verification into dedicated GitHub Actions jobs.

By combining Docker, GHCR, PostgreSQL, Alembic, Nginx, and Docker Compose, the implementation provides a reproducible delivery workflow with health-based startup checks, immutable release references, and traceable execution evidence.

The result is a practical demonstration of containerization, continuous integration, container registry management, deployment orchestration, and CI/CD troubleshooting.

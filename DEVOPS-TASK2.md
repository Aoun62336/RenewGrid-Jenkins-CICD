# RenewGrid — Jenkins CI/CD Implementation

**Elevate Labs | DevOps Internship — Task 2**

## 1. Objective

Implement a Jenkins CI/CD pipeline that automatically validates,
builds, publishes, deploys, and verifies RenewGrid after changes
are integrated into the main branch.

## 2. Environment

- Source repository: RenewGrid-Jenkins-CICD
- CI/CD: Jenkins LTS
- Server: AWS EC2 running Ubuntu
- Container runtime: Docker Engine
- Orchestration: Docker Compose
- Registry: Docker Hub
- Security scanner: Trivy
- Access model: SSH port forwarding

## 3. Pipeline Design

The Jenkinsfile contains these stages:

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

Security and test stages execute before image publication.

## 4. Versioning and Publication

Frontend and backend images use commit-derived SHA tags.

After publication, Jenkins records the corresponding image digests
and deploys those exact image references.

Registry credentials are stored in Jenkins Credentials and are
supplied only during the publishing stage.

## 5. Deployment

The pipeline deploys the existing four-service Compose application.

PostgreSQL starts before the migration service. The backend starts
after successful migrations, and the frontend depends on backend
health.

Named volumes retain database and uploaded application data.

## 6. Security Controls

- Restricted inbound security-group access
- Private Jenkins and application web interfaces
- SSH port forwarding
- Jenkins-managed registry credentials
- Secret scanning
- Vulnerability scanning
- CycloneDX SBOM generation
- Pull-request validation
- Controlled main-branch publication
- Container health checks

## 7. Verification

Deployment verification checks:

- Frontend response
- Public API response
- Database-dependent configuration endpoint

The pipeline reports failure when the required checks do not pass.

## 8. Execution Evidence

Complete this section after executing the pipeline.

- Jenkins build number: [record actual build]
- Git commit: [record actual commit]
- Build result: [record actual result]
- Backend test result: [record actual result]
- Frontend validation result: [record actual result]
- Trivy scan result: [record actual result]
- Docker Hub image references: [record actual references]
- Deployment verification result: [record actual result]
- Automatic trigger result: [record actual result]

Evidence screenshots should be stored in `evidence/jenkins/`.

## 9. Limitations

This implementation uses a single EC2 instance for both the
Jenkins controller and application deployment.

It does not provide production-grade build isolation, high
availability, public HTTPS access, centralized monitoring, or
automated database-aware rollback.

SCM polling detects repository changes periodically rather
than receiving a direct webhook for every individual commit.

## 10. Conclusion

The completed implementation demonstrates Jenkins Pipeline as Code,
automated testing, security gates, container image publication,
deployment orchestration, and deployment verification using a
real full-stack application.

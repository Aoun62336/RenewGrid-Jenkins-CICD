pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 90, unit: 'MINUTES')
        buildDiscarder(
            logRotator(
                numToKeepStr: '15',
                artifactNumToKeepStr: '10'
            )
        )
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        DOCKERHUB_NAMESPACE = 'fire2686'
        DEPLOY_DIR = '/opt/renewgrid'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm

                sh 'mkdir -p reports'

                script {
                    env.COMMIT_ID = sh(
                        script: 'git rev-parse --short=12 HEAD',
                        returnStdout: true
                    ).trim()

                    env.API_IMAGE = "docker.io/${env.DOCKERHUB_NAMESPACE}/renewgrid-jenkins-api:sha-${env.COMMIT_ID}"

                    env.WEB_IMAGE = "docker.io/${env.DOCKERHUB_NAMESPACE}/renewgrid-jenkins-web:sha-${env.COMMIT_ID}"
                }

                echo "Building commit ${env.COMMIT_ID}"
            }
        }

        stage('Secret Scan') {
            steps {
                sh '''#!/bin/bash
set -euo pipefail

trivy fs \
  --scanners secret \
  --exit-code 1 \
  . | tee reports/secrets.txt
'''
            }
        }

        stage('Backend Tests') {
            steps {
                sh '''#!/bin/bash
set -euo pipefail

docker run --rm \
  --user "$(id -u):$(id -g)" \
  --mount "type=bind,src=$PWD/backend,dst=/source,readonly" \
  --mount "type=bind,src=$PWD/reports,dst=/reports" \
  --workdir /source \
  --env DATABASE_URL=sqlite:///./cicd-smoke.sqlite3 \
  --env SECRET_KEY=ci-only-test-secret \
  --env REFRESH_SECRET_KEY=ci-only-refresh-secret \
  python:3.12-slim-bookworm \
  sh -ec '
    python -m venv /tmp/venv

    /tmp/venv/bin/pip install \
      --disable-pip-version-check \
      -r requirements.txt \
      pytest==8.4.2 \
      httpx2

    PYTHONDONTWRITEBYTECODE=1 \
      /tmp/venv/bin/python -m pytest \
      -q \
      -p no:cacheprovider \
      tests \
      --junitxml=/reports/backend-junit.xml
  '
'''
            }
        }

        stage('Frontend Validation') {
            steps {
                sh '''#!/bin/bash
set -euo pipefail

docker run --rm \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --env npm_config_cache=/tmp/npm-cache \
  --mount "type=bind,src=$PWD/frontend,dst=/source,readonly" \
  node:22-alpine \
  sh -ec '
    cp -R /source /tmp/renewgrid-frontend
    cd /tmp/renewgrid-frontend

    npm ci --no-audit --no-fund
    npm run build
    npm run lint
  '
'''
            }
        }

        stage('Docker Build') {
            steps {
                sh '''#!/bin/bash
set -euo pipefail

docker build \
  --pull \
  --tag "$API_IMAGE" \
  ./backend

docker build \
  --pull \
  --tag "$WEB_IMAGE" \
  ./frontend
'''
            }
        }

        stage('Image Security Scan') {
            steps {
                sh '''#!/bin/bash
set -euo pipefail

trivy image \
  --scanners vuln \
  --severity HIGH,CRITICAL \
  --ignore-unfixed \
  --exit-code 1 \
  "$API_IMAGE" | tee reports/api-vulnerabilities.txt

trivy image \
  --scanners vuln \
  --severity HIGH,CRITICAL \
  --ignore-unfixed \
  --exit-code 1 \
  "$WEB_IMAGE" | tee reports/web-vulnerabilities.txt
'''
            }
        }

        stage('Generate SBOM') {
            steps {
                sh '''#!/bin/bash
set -euo pipefail

trivy image \
  --format cyclonedx \
  --output reports/api-sbom.json \
  "$API_IMAGE"

trivy image \
  --format cyclonedx \
  --output reports/web-sbom.json \
  "$WEB_IMAGE"
'''
            }
        }

        stage('Docker Hub Publish') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-task2',
                        usernameVariable: 'HUB_USER',
                        passwordVariable: 'HUB_TOKEN'
                    )
                ]) {
                    sh '''#!/bin/bash
set -euo pipefail
set +x

umask 077
export DOCKER_CONFIG="$(mktemp -d)"

cleanup_registry_login() {
    docker logout >/dev/null 2>&1 || true
    rm -f "$DOCKER_CONFIG/config.json"
    rmdir "$DOCKER_CONFIG" || true
}

trap cleanup_registry_login EXIT

printf '%s' "$HUB_TOKEN" | \
  docker login \
    --username "$HUB_USER" \
    --password-stdin

docker push "$API_IMAGE" | tee reports/api-push.txt
docker push "$WEB_IMAGE" | tee reports/web-push.txt

api_digest="$(
  awk '/digest: sha256:/ {print $3}' reports/api-push.txt |
  tail -n 1
)"

web_digest="$(
  awk '/digest: sha256:/ {print $3}' reports/web-push.txt |
  tail -n 1
)"

test -n "$api_digest"
test -n "$web_digest"

printf '%s@%s\\n' \
  "${API_IMAGE%:*}" \
  "$api_digest" \
  > reports/api-deploy-ref.txt

printf '%s@%s\\n' \
  "${WEB_IMAGE%:*}" \
  "$web_digest" \
  > reports/web-deploy-ref.txt
'''

                    script {
                        env.API_DEPLOY_REF = readFile(
                            'reports/api-deploy-ref.txt'
                        ).trim()

                        env.WEB_DEPLOY_REF = readFile(
                            'reports/web-deploy-ref.txt'
                        ).trim()
                    }
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                sh '''#!/bin/bash
set -euo pipefail

install -m 0644 \
  compose.yaml \
  "$DEPLOY_DIR/compose.yaml"

printf 'API_IMAGE=%s\\nWEB_IMAGE=%s\\n' \
  "$API_DEPLOY_REF" \
  "$WEB_DEPLOY_REF" \
  > "$DEPLOY_DIR/candidate-images.env"

chmod 600 "$DEPLOY_DIR/candidate-images.env"

cd "$DEPLOY_DIR"

docker compose \
  --env-file .env \
  --env-file candidate-images.env \
  -f compose.yaml \
  config --quiet

docker compose \
  --env-file .env \
  --env-file candidate-images.env \
  -f compose.yaml \
  pull api web db

docker compose \
  --env-file .env \
  --env-file candidate-images.env \
  -f compose.yaml \
  up -d --no-build
'''
            }
        }

        stage('Deployment Verification') {
            steps {
                sh '''#!/bin/bash
set -euo pipefail

cd "$DEPLOY_DIR"

verified=false

for attempt in $(seq 1 48); do
    if curl --fail --silent --show-error \
         --max-time 5 \
         http://127.0.0.1:8080/ > /dev/null \
      && curl --fail --silent --show-error \
         --max-time 5 \
         http://127.0.0.1:8080/roles > /dev/null \
      && curl --fail --silent --show-error \
         --max-time 5 \
         http://127.0.0.1:8080/config > /dev/null
    then
        verified=true
        break
    fi

    sleep 5
done

if [ "$verified" != "true" ]; then
    echo "Deployment verification failed."
    exit 1
fi

echo "Frontend, API and database-dependent checks passed."

if [ -f current-images.env ]; then
    cp current-images.env previous-images.env
fi

cp candidate-images.env current-images.env
chmod 600 current-images.env previous-images.env 2>/dev/null || true

docker compose \
  --env-file .env \
  --env-file current-images.env \
  -f compose.yaml \
  ps -a
'''
            }
        }
    }

    post {
        always {
            junit(
                testResults: 'reports/backend-junit.xml',
                allowEmptyResults: true
            )

            archiveArtifacts(
                artifacts: 'reports/**',
                allowEmptyArchive: true,
                fingerprint: true
            )
        }

        failure {
            echo 'Pipeline failed. Review the failed stage.'

            sh '''#!/bin/bash
set +e

if [ -f "$DEPLOY_DIR/compose.yaml" ] &&
   [ -f "$DEPLOY_DIR/candidate-images.env" ]
then
    cd "$DEPLOY_DIR"

    docker compose \
      --env-file .env \
      --env-file candidate-images.env \
      -f compose.yaml \
      ps -a

    docker compose \
      --env-file .env \
      --env-file candidate-images.env \
      -f compose.yaml \
      logs --tail=60 migrate api web
fi
'''
        }

        success {
            echo 'RenewGrid CI/CD pipeline completed successfully.'
        }
    }
}
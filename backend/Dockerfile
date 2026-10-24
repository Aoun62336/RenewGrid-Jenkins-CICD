# syntax=docker/dockerfile:1

# ─── Stage 1: Install Python dependencies ────────────────────────────────────
FROM python:3.12-slim-bookworm AS builder

# Only disable the version check banner — do NOT set PIP_NO_CACHE_DIR here
# because we need the pip download cache to persist via BuildKit's cache mount.
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

RUN python -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip inside the venv first so it handles newer metadata correctly.
RUN pip install --upgrade pip

COPY requirements.txt ./

# --mount=type=cache persists the pip HTTP/wheel cache in BuildKit's cache
# storage between builds. If the build fails partway, already-downloaded
# packages are already cached and the next run skips them — no full re-download.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt \
    && pip uninstall -y pip


# ─── Stage 2: Production application runtime ─────────────────────────────────
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Create an unprivileged application account
RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 \
    --gid 10001 --home-dir /app app

COPY --from=builder /opt/venv /opt/venv

COPY --chown=10001:10001 . /app

RUN mkdir -p /app/uploads \
    && chown -R 10001:10001 /app/uploads

USER 10001:10001

EXPOSE 8000

HEALTHCHECK --interval=15s \
    --timeout=4s \
    --start-period=30s \
    --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/', timeout=3)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

# Multi-stage build for lightweight hospital-scale API service
FROM python:3.10-slim as builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final production stage
FROM python:3.10-slim as runner

WORKDIR /workspace

# Install system dependencies required for headless OpenCV image math
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
COPY . /workspace

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/workspace

EXPOSE 8000

# Auto-seed mock assets and run FastAPI server
CMD python generate_mock_assets.py && uvicorn main:app --host 0.0.0.0 --port 8000

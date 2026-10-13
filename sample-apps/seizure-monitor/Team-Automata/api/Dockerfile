# Standalone image for api/server.py — the Python CAD API that NitroCloud
# (Node-only) calls out to. Build/run this on any host that can run Docker:
# a small VPS, Render, Railway, Fly.io, etc.
#
#   docker build -f api/Dockerfile -t bottle-cap-cad-api .
#   docker run -d -p 8787:8787 -e CAD_API_KEY=<your-secret> bottle-cap-cad-api
#
# Then set, wherever the NitroCloud-hosted MCP server's env vars live:
#   CAD_API_URL=https://<this-host>:8787
#   CAD_API_KEY=<same value as above>

FROM python:3.11-slim

WORKDIR /app

# libGL/libGLU: pymeshlab's mesh I/O plugins are Qt-based and fail to load
# without these, even for fully headless use — confirmed while testing this
# image; without them every /repair call fails with
# "PyMeshLabException: Unknown format for load: stl".
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglu1-mesa \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY cad ./cad
COPY api ./api

EXPOSE 8787

CMD ["uvicorn", "api.server:app", "--host", "0.0.0.0", "--port", "8787"]

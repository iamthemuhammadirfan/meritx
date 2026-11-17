FROM python:3.13-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    MERITX_FEED_PATH=/data/feed.json
WORKDIR /app
COPY api/requirements.txt /app/api/requirements.txt
COPY engine/requirements.txt /app/engine/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt -r engine/requirements.txt \
    && useradd --create-home --uid 10001 meritx
COPY api/app.py /app/api/app.py
COPY engine/collector.py /app/engine/collector.py
COPY index.html /app/index.html
COPY assets/ /app/assets/
USER meritx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/healthz',timeout=3)"
CMD ["uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]

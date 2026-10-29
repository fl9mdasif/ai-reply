FROM python:3.12-slim

# Non-root user for security
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --no-create-home appuser

WORKDIR /app

# Install production deps from pyproject.toml (no dev extras)
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        "fastapi>=0.115.0" \
        "uvicorn[standard]>=0.30.0" \
        "openai>=1.50.0" \
        "qdrant-client>=1.12.0" \
        "pydantic-settings>=2.5.0" \
        "structlog>=24.4.0" \
        "python-dotenv>=1.0.0"

COPY src/ ./src/

USER appuser

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.12-slim
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-hin libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
COPY data ./data
COPY services/ai-engine ./services/ai-engine
RUN pip install --no-cache-dir fastapi uvicorn opencv-python-headless pymupdf pillow numpy reportlab qrcode python-multipart
WORKDIR /workspace/services/ai-engine
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


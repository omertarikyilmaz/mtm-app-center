FROM nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES=0

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3.10-dev \
    python3-pip \
    git \
    wget \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python
RUN ln -s /usr/bin/python3.10 /usr/bin/python

# Set working directory
WORKDIR /app

# Install NumPy 1.x first (required for PyTorch and vLLM)
RUN pip3 install --no-cache-dir "numpy<2.0.0"

# Install PyTorch 2.1+ with CUDA 11.8 support (vLLM 0.5.6 compatible)
RUN pip3 install --no-cache-dir torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cu118

# Install vLLM 0.5.6 for CUDA 11.8 (0.6+ requires CUDA 12)
# vLLM 0.5.6 is the last version that supports CUDA 11.8
RUN pip3 install --no-cache-dir vllm==0.5.6 || \
    (wget https://github.com/vllm-project/vllm/releases/download/v0.5.6/vllm-0.5.6+cu118-cp310-cp310-linux_x86_64.whl && \
     pip3 install vllm-0.5.6+cu118-cp310-cp310-linux_x86_64.whl || \
     echo "Note: vLLM wheel may need manual download")

# Install flash-attn (requires CUDA toolkit for compilation)
# Set CUDA_HOME for flash-attn build
ENV CUDA_HOME=/usr/local/cuda
ENV PATH=${CUDA_HOME}/bin:${PATH}
ENV LD_LIBRARY_PATH=${CUDA_HOME}/lib64:${LD_LIBRARY_PATH}

# Install flash-attn 2.4.x for vLLM 0.5.6 compatibility
RUN pip3 install --no-cache-dir ninja packaging && \
    pip3 install --no-cache-dir flash-attn==2.4.2 --no-build-isolation || \
    echo "Warning: flash-attn installation failed, continuing without it"

# Install additional Python dependencies for DeepSeekOCR
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set Python path
ENV PYTHONPATH=/app:$PYTHONPATH

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the API server
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]


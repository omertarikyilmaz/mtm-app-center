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

# Install PyTorch with CUDA 11.8 support
RUN pip3 install --no-cache-dir torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu118

# Install vLLM 0.8.5 for CUDA 11.8
# Note: You may need to download the wheel file separately if not available via pip
RUN pip3 install --no-cache-dir vllm==0.8.5 || \
    (wget https://github.com/vllm-project/vllm/releases/download/v0.8.5/vllm-0.8.5+cu118-cp310-cp310-linux_x86_64.whl && \
     pip3 install vllm-0.8.5+cu118-cp310-cp310-linux_x86_64.whl || \
     echo "Note: vLLM wheel may need manual download")

# Install flash-attn (requires CUDA toolkit for compilation)
# Set CUDA_HOME for flash-attn build
ENV CUDA_HOME=/usr/local/cuda
ENV PATH=${CUDA_HOME}/bin:${PATH}
ENV LD_LIBRARY_PATH=${CUDA_HOME}/lib64:${LD_LIBRARY_PATH}

RUN pip3 install --no-cache-dir ninja packaging && \
    pip3 install --no-cache-dir flash-attn==2.7.3 --no-build-isolation || \
    echo "Warning: flash-attn installation failed, continuing without it"

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

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
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]


FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Install Python 3.10 and dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    ffmpeg \
    build-essential \
    cmake \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set python3 as default
RUN ln -s /usr/bin/python3.10 /usr/bin/python

WORKDIR /app

# Install requirements first
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Install Nexa SDK with CUDA support
RUN CMAKE_ARGS="-DGGML_CUDA=ON" pip3 install nexai --no-cache-dir

# Pre-download OmniAudio model (Q4_K_M quantized for faster inference)
RUN python3 -c "from nexa.gguf import NexaAudioLMInference; NexaAudioLMInference('omniaudio:q4_K_M')"

COPY . .

EXPOSE 8008

CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8008"]

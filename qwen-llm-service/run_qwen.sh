#!/bin/bash

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Run vLLM with Qwen model
# --gpu-memory-utilization 0.45: Limit GPU usage to 45% to allow co-existence with OCR
# --port 8002: Different port than OCR
echo "Starting vLLM server for Qwen on port 8002..."
vllm serve RedHatAI/Qwen3-8B-FP8-dynamic \
    --gpu-memory-utilization 0.45 \
    --port 8002 \
    --trust-remote-code \
    --dtype float16

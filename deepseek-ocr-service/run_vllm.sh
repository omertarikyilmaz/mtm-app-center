#!/bin/bash

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Run vLLM with DeepSeek-OCR specific configurations
# --logits_processors: Required for NGramPerReqLogitsProcessor
# --no-enable-prefix-caching: Recommended for OCR tasks
# --mm-processor-cache-gb 0: Recommended for OCR tasks
# --port 8000: Default port for vLLM
echo "Starting vLLM server for DeepSeek-OCR on port 8000..."
vllm serve deepseek-ai/DeepSeek-OCR \
    --logits_processors vllm.model_executor.models.deepseek_ocr:NGramPerReqLogitsProcessor \
    --no-enable-prefix-caching \
    --mm-processor-cache-gb 0 \
    --port 8000 \
    --trust-remote-code \
    --gpu-memory-utilization 0.60


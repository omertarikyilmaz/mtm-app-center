"""
Configuration file for Qwen2.5-1.5B-Instruct
"""
import os

# Model configuration
MODEL_PATH = os.getenv("MODEL_PATH", "Qwen/Qwen2.5-1.5B-Instruct")

# Generation parameters (defaults)
DEFAULT_MAX_NEW_TOKENS = 512
DEFAULT_TEMPERATURE = 0.6
DEFAULT_TOP_P = 0.9
DEFAULT_DO_SAMPLE = True

# CUDA configuration
CUDA_VISIBLE_DEVICES = os.getenv("CUDA_VISIBLE_DEVICES", "0")

# API configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8001"))


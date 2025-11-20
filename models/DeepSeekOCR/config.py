"""
Configuration file for DeepSeekOCR
"""
# Model configuration
# TODO: change modes
# Tiny: base_size = 512, image_size = 512, crop_mode = False
# Small: base_size = 640, image_size = 640, crop_mode = False
# Base: base_size = 1024, image_size = 1024, crop_mode = False
# Large: base_size = 1280, image_size = 1280, crop_mode = False
# Gundam: base_size = 1024, image_size = 640, crop_mode = True

BASE_SIZE = 1024
IMAGE_SIZE = 640
CROP_MODE = True
MIN_CROPS = 2
MAX_CROPS = 6  # max:9; If your GPU memory is small, it is recommended to set it to 6.
MAX_CONCURRENCY = 100  # If you have limited GPU memory, lower the concurrency count.
NUM_WORKERS = 64  # image pre-process (resize/padding) workers
PRINT_NUM_VIS_TOKENS = False
SKIP_REPEAT = True
MODEL_PATH = os.getenv('MODEL_PATH', 'deepseek-ai/DeepSeek-OCR')  # change to your model path

# Input/Output paths (not used in API mode, but kept for compatibility)
INPUT_PATH = ''
OUTPUT_PATH = ''

# Default prompt
PROMPT = '<image>\nFree OCR.'
# TODO commonly used prompts
# document: <image>\n<|grounding|>Convert the document to markdown.
# other image: <image>\n<|grounding|>OCR this image.
# without layouts: <image>\nFree OCR.
# figures in document: <image>\nParse the figure.
# general: <image>\nDescribe this image in detail.
# rec: <image>\nLocate <|ref|>xxxx<|/ref|> in the image.

import os
from transformers import AutoTokenizer

# Initialize tokenizer lazily to avoid import issues
TOKENIZER = None

def get_tokenizer():
    global TOKENIZER
    if TOKENIZER is None:
        TOKENIZER = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
    return TOKENIZER


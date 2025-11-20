"""
Example client for DeepSeekOCR API
"""
import requests
import base64
from pathlib import Path

API_URL = "http://localhost:8000"

def ocr_from_file(image_path: str, prompt: str = None):
    """Send image file for OCR processing"""
    url = f"{API_URL}/ocr"
    
    with open(image_path, "rb") as f:
        files = {"file": f}
        data = {}
        if prompt:
            data["prompt"] = prompt
        
        response = requests.post(url, files=files, data=data)
        return response.json()

def ocr_from_base64(image_base64: str, prompt: str = None):
    """Send base64 encoded image for OCR processing"""
    url = f"{API_URL}/ocr"
    
    data = {"image_base64": image_base64}
    if prompt:
        data["prompt"] = prompt
    
    response = requests.post(url, data=data)
    return response.json()

def ocr_batch(image_paths: list, prompt: str = None):
    """Process multiple images in batch"""
    url = f"{API_URL}/ocr/batch"
    
    files = [("files", open(path, "rb")) for path in image_paths]
    data = {}
    if prompt:
        data["prompt"] = prompt
    
    response = requests.post(url, files=files, data=data)
    
    # Close file handles
    for _, f in files:
        f.close()
    
    return response.json()

if __name__ == "__main__":
    # Example usage
    image_path = "test_image.jpg"
    
    if Path(image_path).exists():
        # Single image OCR
        result = ocr_from_file(image_path)
        print("OCR Result:", result)
        
        # Custom prompt
        result = ocr_from_file(
            image_path,
            prompt="<image>\n<|grounding|>Convert the document to markdown."
        )
        print("Markdown Result:", result)
    else:
        print(f"Image file {image_path} not found. Please provide a valid image path.")


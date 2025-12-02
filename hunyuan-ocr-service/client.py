import os
from openai import OpenAI
import base64
from typing import Optional
from PIL import Image
import io

def clean_repeated_substrings(text: str) -> str:
    """
    Clean repeated substrings in text.
    From official HunyuanOCR documentation.
    """
    n = len(text)
    if n < 8000:
        return text
    
    for length in range(2, n // 10 + 1):
        candidate = text[-length:] 
        count = 0
        i = n - length
        
        while i >= 0 and text[i:i + length] == candidate:
            count += 1
            i -= length

        if count >= 10:
            return text[:n - length * (count - 1)]  

    return text


class HunyuanOCRClient:
    def __init__(self, base_url: str = "http://hunyuan-ocr-vllm:8102/v1", api_key: str = "EMPTY"):
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        self.model = "tencent/HunyuanOCR"

    def process_image(
        self, 
        image_data: bytes, 
        mime_type: str = "image/jpeg",
        prompt: str = "检测并识别图片中的文字，将文本坐标格式化输出。",
        temperature: float = 0.0,
        max_tokens: int = 16384,
        top_p: float = 1.0,
        top_k: int = -1
    ) -> str:
        """
        Process an image (bytes) with custom prompt and return the OCR text.
        
        Args:
            image_data: Image bytes
            mime_type: MIME type of the image
            prompt: Custom OCR prompt (default: Chinese text spotting)
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate
            top_p: Nucleus sampling parameter
            top_k: Top-k sampling parameter
        
        Returns:
            Extracted text with repeated substrings cleaned
        """
        base64_image = base64.b64encode(image_data).decode('utf-8')
        data_url = f"data:{mime_type};base64,{base64_image}"

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": data_url
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]

        try:
            print(f"DEBUG: HunyuanOCR request - prompt: {prompt[:50]}..., temp={temperature}, max_tokens={max_tokens}")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
            )
            
            result_text = response.choices[0].message.content
            # Clean repeated substrings as recommended by official docs
            cleaned_text = clean_repeated_substrings(result_text)
            
            return cleaned_text
            
        except Exception as e:
            print(f"Error calling HunyuanOCR vLLM: {e}")
            raise e

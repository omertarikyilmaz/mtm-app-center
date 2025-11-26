from openai import OpenAI
from PIL import Image
import base64
import io

def clean_repeated_substrings(text):
    """Clean repeated substrings in text"""
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
    def __init__(self, base_url="http://localhost:8005/v1"):
        """
        Initialize Hunyuan OCR client using vLLM OpenAI-compatible API.
        
        Args:
            base_url: Base URL for vLLM server
        """
        self.client = OpenAI(
            api_key="EMPTY",  # vLLM doesn't require API key
            base_url=base_url
        )
        self.model_name = "tencent/HunyuanOCR"
    
    def process_image(self, image_bytes, mime_type="image/jpeg"):
        """
        Process an image and extract text using Hunyuan OCR.
        
        Args:
            image_bytes: Image file content as bytes
            mime_type: MIME type of the image
        
        Returns:
            Extracted text from the image
        """
        try:
            # Convert image bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert image to base64 for API
            buffered = io.BytesIO()
            image.save(buffered, format=image.format or "JPEG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            
            # Prepare the message with image
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{img_base64}"
                            }
                        },
                        {
                            "type": "text",
                            "text": "检测并识别图片中的文字，将文本坐标格式化输出。"
                        }
                    ]
                }
            ]
            
            # Call vLLM API
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0,
                max_tokens=16384
            )
            
            # Extract and clean the response
            raw_text = response.choices[0].message.content
            cleaned_text = clean_repeated_substrings(raw_text)
            
            return cleaned_text
            
        except Exception as e:
            raise Exception(f"OCR processing failed: {str(e)}")

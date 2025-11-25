import os
from openai import OpenAI
import base64
from typing import Optional

class OCRClient:
    def __init__(self, base_url: str = "http://vllm:8000/v1", api_key: str = "EMPTY"):
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        self.model = "deepseek-ai/DeepSeek-OCR"

    def process_image(self, image_data: bytes, mime_type: str = "image/jpeg") -> str:
        """
        Process an image (bytes) and return the OCR text.
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
                        "text": "Free OCR." # Standard prompt for DeepSeek-OCR
                    }
                ]
            }
        ]

        try:
            max_tokens = int(os.getenv("MAX_TOKENS", "4096"))
            print(f"DEBUG: Sending request to vLLM with max_tokens={max_tokens}")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=int(os.getenv("MAX_TOKENS", "4096")),
                temperature=0.0,
                extra_body={
                    "skip_special_tokens": False,
                    "vllm_xargs": {
                        "ngram_size": 30,
                        "window_size": 90,
                        "whitelist_token_ids": [128821, 128822], # <td>, </td>
                    },
                },
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error calling vLLM: {e}")
            raise e

import os
from openai import OpenAI
from typing import List, Dict

class LLMClient:
    def __init__(self, base_url: str = "http://localhost:8002/v1", api_key: str = "EMPTY"):
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        self.model = "RedHatAI/Qwen3-8B-FP8-dynamic"

    def generate(self, messages: List[Dict[str, str]], temperature: float = 0.6) -> str:
        """
        Generate text response from LLM.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=4096,
                temperature=temperature,
                top_p=0.95,
                extra_body={
                    "top_k": 20,
                    "min_p": 0,
                }
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error calling vLLM: {e}")
            raise e

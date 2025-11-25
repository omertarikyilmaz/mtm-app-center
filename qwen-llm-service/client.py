import os
from openai import OpenAI
from typing import List, Dict

class LLMClient:
    def __init__(self, base_url: str = "http://localhost:8002/v1", api_key: str = "EMPTY"):
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        self.model = "malhajar/Qwen1.5-7B-turkish"

    def generate(self, messages: List[Dict[str, str]], temperature: float = 0.6) -> str:
        """
        Generate text response from LLM using the specific prompt template.
        """
        try:
            # Extract the last user message to form the prompt
            # Note: This simple logic assumes the last message is from the user.
            # For a full chat history, we would need to concatenate them, but this model
            # seems optimized for single instruction-response pairs or we need to format accordingly.
            # For now, let's use the last user message as the instruction.
            
            last_user_message = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
            
            # Construct prompt using the specified template
            prompt = f"""
### Instruction: {last_user_message}

### Response:
"""
            
            max_tokens = int(os.getenv("MAX_TOKENS", "4096"))
            print(f"DEBUG: Sending request to vLLM with max_tokens={max_tokens}")
            
            # We use completions endpoint because we are sending a raw prompt, not a chat list
            # However, the OpenAI SDK's chat.completions.create expects messages.
            # vLLM's OpenAI compatible server supports chat completions.
            # If we want to use the specific prompt format, we might need to use the 'completions' endpoint
            # OR rely on vLLM's chat template if it supports this model correctly.
            # Given the user provided a specific prompt template, let's try to use the `completions` API 
            # if we want to control the exact prompt, OR pass the prompt as a single user message 
            # if we trust the chat template.
            # BUT, the user explicitly gave a prompt template. Let's use the completions API for exact control.
            
            response = self.client.completions.create(
                model=self.model,
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=0.95,
                extra_body={
                    "top_k": 50,
                    "repetition_penalty": 1.3,
                    "stop": ["### Instruction:"], # Stop if it tries to generate a new instruction
                }
            )
            return response.choices[0].text.strip()
        except Exception as e:
            print(f"Error calling vLLM: {e}")
            raise e

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import uvicorn
from typing import List, Dict
import os

app = FastAPI(title="MTM Next-1B Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Model
MODEL_ID = "Lamapi/next-1b"
print(f"Loading model: {MODEL_ID}...")

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        device_map="auto",
        torch_dtype=torch.float16
    )
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    raise e

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    temperature: float = 0.7
    max_tokens: int = 256

class ChatResponse(BaseModel):
    response: str

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with Next-1B LLM.
    """
    try:
        # Add system message if not present
        if not request.messages or request.messages[0].get("role") != "system":
            system_message = {
                "role": "system",
                "content": "You are Next-X1, a smart and concise AI assistant trained by Lamapi. Always respond in the user's language. Proudly made in Turkey."
            }
            request.messages.insert(0, system_message)
        
        print(f"DEBUG: Messages being sent: {request.messages}")
        
        # Prepare input with Tokenizer - EXACTLY as per documentation
        prompt = tokenizer.apply_chat_template(request.messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        # Output from the model
        output = model.generate(
            **inputs,
            max_new_tokens=request.max_tokens,
            temperature=request.temperature,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
        
        # Decode the full output and skip special tokens
        response_text = tokenizer.decode(output[0], skip_special_tokens=True)
        
        # Extract only the assistant's response (remove the prompt part)
        # The prompt is everything before the last assistant turn
        if "assistant" in response_text.lower():
            # Split and take everything after the last occurrence of common assistant markers
            parts = response_text.split("assistant")
            if len(parts) > 1:
                response_text = parts[-1].strip()
                # Clean up any leading colons or newlines
                response_text = response_text.lstrip(":\n").strip()
        
        return ChatResponse(response=response_text.strip())
    except Exception as e:
        print(f"Error generating response: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=False)

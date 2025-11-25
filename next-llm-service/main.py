from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import uvicorn
from typing import List, Dict
import os

app = FastAPI(title="MTM Next-1B Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        # SADECE son user mesajını al, gerisini yoksay
        user_message = None
        for msg in reversed(request.messages):
            if msg.get('role') == 'user':
                user_message = msg.get('content')
                break
        
        if not user_message:
            raise HTTPException(status_code=400, detail="No user message found")
        
        # Basit mesaj formatı: System + User (conversation history YOK)
        messages = [
            {"role": "system", "content": "You are Next-X1, a smart and concise AI assistant trained by Lamapi. Always respond in the user's language. Proudly made in Turkey."},
            {"role": "user", "content": user_message}
        ]
        
        print(f"DEBUG: Sending to model: {messages}")
        
        prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        output = model.generate(
            **inputs,
            max_new_tokens=min(request.max_tokens, 512),  # Limit to 512
            temperature=0.3,  # More deterministic
            do_sample=True,
            top_p=0.9,  # Nucleus sampling
            top_k=50,  # Top-k sampling
            pad_token_id=tokenizer.eos_token_id
        )
        
        response_text = tokenizer.decode(output[0], skip_special_tokens=True)
        
        # Extract assistant response
        if "assistant" in response_text.lower():
            parts = response_text.split("assistant")
            if len(parts) > 1:
                response_text = parts[-1].strip().lstrip(":\n").strip()
        
        return ChatResponse(response=response_text.strip())
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=False)

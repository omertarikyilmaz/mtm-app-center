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
        # Filter out any leading 'assistant' messages to ensure alternation starts correctly
        # We keep 'system' if present, then ensure next is 'user'
        filtered_messages = []
        for i, msg in enumerate(request.messages):
            if msg['role'] == 'system':
                filtered_messages.append(msg)
            elif msg['role'] == 'assistant':
                # Only allow assistant if we already have a user message (and it's not the first non-system msg)
                if any(m['role'] == 'user' for m in filtered_messages):
                    filtered_messages.append(msg)
            else:
                filtered_messages.append(msg)
        
        request.messages = filtered_messages

        # Add system message if not present at start
        if not request.messages or request.messages[0].get("role") != "system":
            system_message = {
                "role": "system", 
                "content": "You are Next-X1, a smart and concise AI assistant trained by Lamapi. Always respond in the user's language. Proudly made in Turkey."
            }
            request.messages.insert(0, system_message)

        print(f"DEBUG: Processing messages: {request.messages}")

        # Prepare input with Tokenizer
        prompt = tokenizer.apply_chat_template(request.messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        # Output from the model
        outputs = model.generate(
            **inputs, 
            max_new_tokens=request.max_tokens,
            temperature=request.temperature,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
        
        # Decode response
        # We skip the input prompt in the output
        response_text = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
        
        return ChatResponse(response=response_text.strip())
    except Exception as e:
        print(f"Error generating response: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=False)

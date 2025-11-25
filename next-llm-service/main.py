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
        # Robust Message Handling Strategy:
        # 1. Extract system message content if present.
        # 2. Filter only 'user' and 'assistant' messages.
        # 3. Ensure strict alternation: User -> Assistant -> User ...
        # 4. Merge system message into the first User message.
        
        system_content = "You are Next-X1, a smart and concise AI assistant trained by Lamapi. Always respond in the user's language. Proudly made in Turkey."
        
        clean_messages = []
        last_role = None
        
        for msg in request.messages:
            role = msg.get('role')
            content = msg.get('content')
            
            if role == 'system':
                system_content = content # Override default if provided
                continue
            
            if role not in ['user', 'assistant']:
                continue
                
            # Skip if sequence is broken (e.g. Assistant first, or double User)
            if last_role is None:
                if role != 'user':
                    continue # Must start with User
            else:
                if role == last_role:
                    continue # Must alternate
            
            clean_messages.append({"role": role, "content": content})
            last_role = role
            
        # If no messages left (e.g. only system was sent), create a dummy user message to avoid crash
        if not clean_messages:
            clean_messages.append({"role": "user", "content": "Merhaba"})

        # Merge system prompt into the first user message
        # This avoids "System role not supported" errors common in some templates
        if clean_messages and clean_messages[0]['role'] == 'user':
            clean_messages[0]['content'] = f"{system_content}\n\n{clean_messages[0]['content']}"

        print(f"DEBUG: Final messages passed to model: {clean_messages}")
        
        # Update request messages
        request.messages = clean_messages

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

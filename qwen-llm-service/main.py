from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from client import LLMClient
import os
from typing import List, Dict

app = FastAPI(title="MTM LLM Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LLM Client
# Read VLLM_URL from env, default to localhost:8002
vllm_url = os.getenv("VLLM_URL", "http://localhost:8002/v1")
llm_client = LLMClient(base_url=vllm_url)

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    temperature: float = 0.6

class ChatResponse(BaseModel):
    response: str

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with Qwen LLM.
    """
    try:
        response_text = llm_client.generate(request.messages, request.temperature)
        return ChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)

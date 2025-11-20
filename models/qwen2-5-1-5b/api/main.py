"""
Qwen2.5-1.5B-Instruct API Service
FastAPI service for Qwen2.5 text generation
"""
import os
import asyncio
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from concurrent.futures import ThreadPoolExecutor

# Set CUDA device
os.environ["CUDA_VISIBLE_DEVICES"] = os.getenv("CUDA_VISIBLE_DEVICES", "0")

app = FastAPI(title="Qwen2.5-1.5B-Instruct API", version="1.0.0")

# CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model and tokenizer instances
model: Optional[AutoModelForCausalLM] = None
tokenizer: Optional[AutoTokenizer] = None
executor = ThreadPoolExecutor(max_workers=4)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system_prompt: Optional[str] = None
    max_new_tokens: Optional[int] = 512
    temperature: Optional[float] = 0.6
    top_p: Optional[float] = 0.9
    do_sample: Optional[bool] = True


class ChatResponse(BaseModel):
    response: str
    status: str = "success"


class GenerateRequest(BaseModel):
    prompt: str
    max_new_tokens: Optional[int] = 512
    temperature: Optional[float] = 0.6
    top_p: Optional[float] = 0.9
    do_sample: Optional[bool] = True


class GenerateResponse(BaseModel):
    text: str
    status: str = "success"


def load_model():
    """Load the Qwen2.5 model"""
    global model, tokenizer
    
    model_name = os.getenv("MODEL_PATH", "Qwen/Qwen2.5-1.5B-Instruct")
    
    print(f"Loading model: {model_name}")
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype="auto",
        device_map="auto"
    )
    
    print("Model loaded successfully!")


@app.on_event("startup")
async def startup_event():
    """Initialize the model on startup"""
    # Load model in a separate thread to avoid blocking
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(executor, load_model)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Qwen2.5-1.5B-Instruct API",
        "version": "1.0.0",
        "model_ready": model is not None and tokenizer is not None
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_ready": model is not None and tokenizer is not None
    }


def generate_chat_response(messages, max_new_tokens, temperature, top_p, do_sample):
    """Generate chat response using Qwen2.5
    
    Follows the official Qwen2.5 usage pattern:
    - Uses apply_chat_template with tokenize=True, return_dict=True, return_tensors="pt"
    - Extracts only newly generated tokens
    """
    # Apply chat template and tokenize in one step (as per Qwen2.5 docs)
    model_inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt"
    ).to(model.device)
    
    # Generate
    with torch.no_grad():
        generated_ids = model.generate(
            **model_inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature if do_sample else None,
            top_p=top_p if do_sample else None,
            do_sample=do_sample,
            pad_token_id=tokenizer.eos_token_id
        )
    
    # Extract only the newly generated tokens (remove input tokens)
    # This matches the official Qwen2.5 example pattern
    input_length = model_inputs["input_ids"].shape[-1]
    generated_tokens = generated_ids[0][input_length:]
    
    # Decode only the generated part
    response = tokenizer.decode(generated_tokens, skip_special_tokens=True)
    
    return response


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat completion endpoint
    
    Args:
        request: Chat request with messages and parameters
    
    Returns:
        Chat response
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    try:
        # Prepare messages
        messages = []
        
        # Add system prompt if provided
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        
        # Add conversation messages
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})
        
        # Generate response in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        response_text = await loop.run_in_executor(
            executor,
            generate_chat_response,
            messages,
            request.max_new_tokens,
            request.temperature,
            request.top_p,
            request.do_sample
        )
        
        return ChatResponse(response=response_text, status="success")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Text generation endpoint
    
    Args:
        request: Generation request with prompt and parameters
    
    Returns:
        Generated text
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    try:
        # Tokenize prompt
        model_inputs = tokenizer([request.prompt], return_tensors="pt").to(model.device)
        
        # Generate in thread pool
        loop = asyncio.get_event_loop()
        
        def generate_text():
            with torch.no_grad():
                generated_ids = model.generate(
                    **model_inputs,
                    max_new_tokens=request.max_new_tokens,
                    temperature=request.temperature if request.do_sample else None,
                    top_p=request.top_p if request.do_sample else None,
                    do_sample=request.do_sample,
                    pad_token_id=tokenizer.eos_token_id
                )
            
            # Extract only generated tokens
            generated_ids = [
                output_ids[len(input_ids):] 
                for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
            ]
            
            # Decode
            generated_text = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
            return generated_text
        
        generated_text = await loop.run_in_executor(executor, generate_text)
        
        return GenerateResponse(text=generated_text, status="success")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating text: {str(e)}")


@app.post("/chat/simple")
async def chat_simple(
    message: str,
    system_prompt: Optional[str] = None,
    max_new_tokens: Optional[int] = 512,
    temperature: Optional[float] = 0.6,
    top_p: Optional[float] = 0.9
):
    """
    Simple chat endpoint (form data)
    
    Args:
        message: User message
        system_prompt: Optional system prompt
        max_new_tokens: Maximum tokens to generate
        temperature: Sampling temperature
        top_p: Top-p sampling parameter
    
    Returns:
        Chat response
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not initialized")
    
    try:
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": message})
        
        loop = asyncio.get_event_loop()
        response_text = await loop.run_in_executor(
            executor,
            generate_chat_response,
            messages,
            max_new_tokens,
            temperature,
            top_p,
            True
        )
        
        return {"response": response_text, "status": "success"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

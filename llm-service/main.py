from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import torch
import uvicorn
from typing import List, Dict

app = FastAPI(title="MTM LLM Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"
print(f"Loading model: {MODEL_ID} with 4-bit quantization...")

try:
    # 4-bit quantization configuration
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4"
    )
    
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=quantization_config,
        device_map="auto",
        trust_remote_code=True
    )
    print("Model loaded successfully with 4-bit quantization.")
except Exception as e:
    print(f"Error loading model: {e}")
    raise e

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    temperature: float = 0.7
    max_tokens: int = 512

class ChatResponse(BaseModel):
    response: str

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": MODEL_ID}

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with Qwen2.5-7B-Instruct LLM.
    """
    try:
        # Add system message if not present
        if not request.messages or request.messages[0].get("role") != "system":
            system_message = {
                "role": "system",
                "content": "Sen MTM (Medya Takip Merkezi) yapay zeka asistanısın. Akıllı, yardımsever ve profesyonel bir şekilde cevap verirsin. Her zaman kullanıcının dilinde yanıt verirsin."
            }
            request.messages.insert(0, system_message)
        
        print(f"DEBUG: Processing {len(request.messages)} messages")
        
        # Apply chat template
        text = tokenizer.apply_chat_template(
            request.messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        inputs = tokenizer([text], return_tensors="pt").to(model.device)
        
        # Generate response
        outputs = model.generate(
            **inputs,
            max_new_tokens=request.max_tokens,
            temperature=request.temperature,
            do_sample=True,
            top_p=0.9,
            top_k=50,
            pad_token_id=tokenizer.eos_token_id
        )
        
        # Decode only the new tokens
        response_text = tokenizer.decode(
            outputs[0][inputs.input_ids.shape[1]:],
            skip_special_tokens=True
        )
        
        return ChatResponse(response=response_text.strip())
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=False)

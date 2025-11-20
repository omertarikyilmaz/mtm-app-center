"""
Example client for Qwen2.5-1.5B-Instruct API
"""
import requests
import json

API_URL = "http://localhost:8001"


def chat_completion(messages, system_prompt=None, max_new_tokens=512, temperature=0.6, top_p=0.9):
    """Send chat completion request"""
    url = f"{API_URL}/chat"
    
    payload = {
        "messages": [{"role": msg["role"], "content": msg["content"]} for msg in messages],
        "max_new_tokens": max_new_tokens,
        "temperature": temperature,
        "top_p": top_p
    }
    
    if system_prompt:
        payload["system_prompt"] = system_prompt
    
    response = requests.post(url, json=payload)
    return response.json()


def simple_chat(message, system_prompt=None, max_new_tokens=512, temperature=0.6, top_p=0.9):
    """Send simple chat request"""
    url = f"{API_URL}/chat/simple"
    
    data = {
        "message": message,
        "max_new_tokens": max_new_tokens,
        "temperature": temperature,
        "top_p": top_p
    }
    
    if system_prompt:
        data["system_prompt"] = system_prompt
    
    response = requests.post(url, data=data)
    return response.json()


def generate_text(prompt, max_new_tokens=512, temperature=0.6, top_p=0.9):
    """Generate text from prompt"""
    url = f"{API_URL}/generate"
    
    payload = {
        "prompt": prompt,
        "max_new_tokens": max_new_tokens,
        "temperature": temperature,
        "top_p": top_p
    }
    
    response = requests.post(url, json=payload)
    return response.json()


if __name__ == "__main__":
    # Example 1: Simple chat
    print("=== Simple Chat ===")
    result = simple_chat("Who are you?", system_prompt="You are a helpful assistant.")
    print(result["response"])
    print()
    
    # Example 2: Chat completion
    print("=== Chat Completion ===")
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is Python?"}
    ]
    result = chat_completion(messages)
    print(result["response"])
    print()
    
    # Example 3: Text generation
    print("=== Text Generation ===")
    result = generate_text("Once upon a time, in a land far away,")
    print(result["text"])

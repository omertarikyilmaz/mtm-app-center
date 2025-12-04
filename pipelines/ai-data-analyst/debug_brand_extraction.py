#!/usr/bin/env python3
"""
Debug script to test brand extraction locally
Usage: python debug_brand_extraction.py
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from analyzer import NewsAnalyzer

async def test():
    # Sample Turkish news text with clear brands
    sample_text = """
    Turkcell, Türkiye'nin en büyük GSM operatörü olarak 5G yatırımlarına hız veriyor. 
    Şirket CEO'su açıklamasında, önümüzdeki çeylrekte tüm illerde 5G hizmeti vermeyi 
    hedeflediklerini belirtti. Turkcell ayrıca yeni fiber internet paketlerini de duyurdu.
    
    Sektörde Vodafone ve Türk Telekom ile rekabet devam ediyor. Uzmanlar, 5G yarışında 
    Turkcell'in öne çıktığını söylüyor.
    """
    
    print("=" * 60)
    print("BRAND EXTRACTION DEBUG TEST")
    print("=" * 60)
    print(f"\nTest Text:\n{sample_text}\n")
    print("-" * 60)
    
    # Get API key from environment
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("ERROR: OPENAI_API_KEY environment variable not set!")
        print("Set it with: export OPENAI_API_KEY='your-key-here'")
        return
    
    print(f"✓ OpenAI API Key: {api_key[:10]}...")
    
    # Create analyzer
    async with NewsAnalyzer(api_key=api_key, model="gpt-4-turbo-preview") as analyzer:
        print("\n[1] Calling analyze_brands()...")
        brands = await analyzer.analyze_brands(sample_text)
        
        print(f"\n[2] Result: {type(brands)}")
        print(f"[3] Brands found: {len(brands)}")
        
        if brands:
            print("\n" + "=" * 60)
            print("BRANDS EXTRACTED:")
            print("=" * 60)
            for idx, brand in enumerate(brands, 1):
                print(f"\n{idx}. {brand}")
        else:
            print("\n✗ NO BRANDS FOUND - THIS IS THE PROBLEM!")
            
if __name__ == "__main__":
    asyncio.run(test())

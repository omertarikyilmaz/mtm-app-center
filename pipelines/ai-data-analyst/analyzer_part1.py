"""
Core analysis logic for AI Data Analyst Pipeline
"""
import json
import re
import asyncio
import logging
import time
import traceback
from typing import List, Dict, Optional

import aiohttp
from bs4 import BeautifulSoup
import openai

from prompts import BRAND_EXTRACTION_PROMPT, SENTIMENT_ANALYSIS_PROMPT

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
TIMEOUT = 60  # 60 seconds timeout per GNO 
MAX_RETRIES = 3


class NewsAnalyzer:
    """Handles news extraction and analysis"""
    
    def __init__(self, api_key: str, model: str = "gpt-4-turbo-preview"):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model
        self.session = None
        
    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=TIMEOUT)
        self.session = aiohttp.ClientSession(timeout=timeout)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    
    async def extract_news_text(self, gno_url: str) -> Optional[str]:
        """
        Extract news text from GNO URL
        
        Strategy: Try simple requests first (fast), fallback to Playwright if needed
        
        Args:
            gno_url: GNO identifier or URL
            
        Returns:
            Extracted news text or None if failed
        """
        try:
            # Construct URL
            if gno_url.startswith('http'):
                url = gno_url
            else:
                url = f"https://imgsrv.medyatakip.com/store/clip?gno={gno_url}"
            
            logger.info(f"[EXTRACT] Trying {url}")
            
            # STRATEGY 1: Try simple requests first (MUCH FASTER)
            try:
                logger.info("[EXTRACT] Attempting simple HTTP request...")
                async with self.session.get(url, timeout=aiohttp.ClientTimeout(total=20)) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'lxml')
                        
                        # Remove scripts
                        for script in soup(["script", "style", "noscript"]):
                            script.decompose()
                        
                        # Try text-wrapper
                        text_wrapper = soup.find('div', class_='text-wrapper')
                        if text_wrapper:
                            text = text_wrapper.get_text(strip=True, separator=' ')
                            if len(text) > 100:
                                logger.info(f"[EXTRACT] ✓ Got {len(text)} chars via simple request")
                                return text
                        
                        logger.info("[EXTRACT] Simple request succeeded but no text found, trying Playwright...")
            except Exception as e:
                logger.warning(f"[EXTRACT] Simple request failed: {str(e)}, trying Playwright...")
            
            # STRATEGY 2: Use Playwright (slower but handles JavaScript)
            logger.info("[EXTRACT] Using Playwright...")
            from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
            
            try:
                async with async_playwright() as p:
                    browser = await p.chromium.launch(
                        headless=True,
                        args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                    )
                    
                    page = await browser.new_page(
                        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    )
                    
                    try:
                        # Short timeout - fail fast
                        await page.goto(url, wait_until='domcontentloaded', timeout=20000)
                        await page.wait_for_timeout(1500)
                        
                        # Try Metin button
                        try:
                            metin_btn = await page.query_selector('button:has-text("Metin")')
                            if metin_btn:
                                await metin_btn.click()
                                await page.wait_for_timeout(1500)
                        except:
                            pass
                        
                        # Get content
                        html = await page.content()
                        soup = BeautifulSoup(html, 'lxml')
                        
                        for script in soup(["script", "style", "noscript"]):
                            script.decompose()
                        
                        # Try text-wrapper
                        text_wrapper = soup.find('div', class_='text-wrapper')
                        if text_wrapper:
                            text = text_wrapper.get_text(strip=True, separator=' ')
                            if len(text) > 100:
                                await browser.close()
                                logger.info(f"[EXTRACT] ✓ Got {len(text)} chars via Playwright")
                                return text
                        
                        # Try body as last resort
                        body = soup.find('body')
                        if body:
                            text = body.get_text(separator=' ', strip=True)
                            lines = [l.strip() for l in text.split() if l.strip()]
                            clean_text = ' '.join(lines)
                            if len(clean_text) > 200:
                                await browser.close()
                                logger.info(f"[EXTRACT] ✓ Got {len(clean_text)} chars from body")
                                return clean_text
                        
                        await browser.close()
                        logger.error(f"[EXTRACT] ✗ No sufficient text found")
                        return None
                        
                    except PlaywrightTimeoutError:
                        await browser.close()
                        logger.error(f"[EXTRACT] ✗ Playwright timeout after 20s")
                        return None
                    except Exception as e:
                        await browser.close()
                        logger.error(f"[EXTRACT] ✗ Playwright error: {str(e)}")
                        return None
                        
            except Exception as e:
                logger.error(f"[EXTRACT] ✗ Playwright init error: {str(e)}")
                return None
                
        except Exception as e:
            logger.error(f"[EXTRACT] ✗ Fatal error: {str(e)}")
            return None
    
    async def analyze_brands(self, news_text: str) -> List[Dict]:
        """
        Analyze news text and extract brand information - SYNC OpenAI call
        
        Args:
            news_text: News article text
            
        Returns:
            List of brand information dictionaries
        """
        logger.info(f"[BRANDS] Starting analysis on {len(news_text)} characters")
        logger.info(f"[BRANDS] Text sample: {news_text[:150]}...")
        
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(f"[BRANDS] Attempt {attempt + 1}/{MAX_RETRIES}")
                
                # SYNC OpenAI call (like ifl pipeline)
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": "Sen bir veri analisti uzmanısın. Yanıtların sadece geçerli JSON içermelidir."
                        },
                        {
                            "role": "user",
                            "content": BRAND_EXTRACTION_PROMPT.format(news_text=news_text)
                        }
                    ],
                    temperature=0.3,
                    max_tokens=1500,
                    response_format={"type": "json_object"}
                )
                
                content = response.choices[0].message.content.strip()
                logger.info(f"[BRANDS] OpenAI response:\n{content}\n")
                
                # Parse JSON
                result = json.loads(content)
                logger.info(f"[BRANDS] Parsed as: {type(result)}, keys: {list(result.keys()) if isinstance(result, dict) else 'N/A'}")
                
                # Extract brands list
                brands = []
                if isinstance(result, list):
                    brands = result
                elif isinstance(result, dict):
                    # Try common keys
                    for key in ['brands', 'markalar', 'data', 'results']:
                        if key in result and isinstance(result[key], list):
                            brands = result[key]
                            logger.info(f"[BRANDS] Found list at key '{key}'")
                            break
                    # Fallback: first list value
                    if not brands:
                        for value in result.values():
                            if isinstance(value, list):
                                brands = value
                                break
                
                if brands:
                    logger.info(f"[BRANDS] ✓ SUCCESS: {len(brands)} brand(s) found")
                    return brands
                else:
                    logger.warning(f"[BRANDS] Empty result on attempt {attempt + 1}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(1)  # SYNC sleep
                    
            except json.JSONDecodeError as e:
                logger.error(f"[BRANDS] JSON error: {str(e)}")
                logger.error(f"[BRANDS] Content: {content if 'content' in locals() else 'N/A'}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(1)
            except Exception as e:
                logger.error(f"[BRANDS] Error: {type(e).__name__}: {str(e)}")
                logger.error(f"[BRANDS] Traceback:\n{traceback.format_exc()}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(1)
        
        logger.error(f"[BRANDS] FAILED after {MAX_RETRIES} attempts")
        return []

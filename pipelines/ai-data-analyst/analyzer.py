"""
Core analysis logic for AI Data Analyst Pipeline
"""
import json
import re
import asyncio
import logging
from typing import List, Dict, Optional
from urllib.parse import urljoin

import aiohttp
from bs4 import BeautifulSoup
from openai import OpenAI

from prompts import BRAND_EXTRACTION_PROMPT, SENTIMENT_ANALYSIS_PROMPT

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
TIMEOUT = 60  # 60 seconds timeout per GNO as requested by user
MAX_RETRIES = 3


class NewsAnalyzer:
    """Handles news extraction and analysis"""
    
    def __init__(self, api_key: str, model: str = "gpt-4-turbo-preview"):
        self.client = OpenAI(api_key=api_key)
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
        Analyze news text and extract brand information
        
        Args:
            news_text: News article text
            
        Returns:
            List of brand information dictionaries
        """
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(f"[BRANDS] Attempt {attempt + 1}/{MAX_RETRIES}")
                
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
                logger.info(f"[BRANDS] Response: {content[:200]}...")
                
                # Try to parse as JSON
                try:
                    result = json.loads(content)
                    
                    # Handle various response structures
                    if isinstance(result, list):
                        brands = result
                    elif isinstance(result, dict):
                        # Try to find array inside dict
                        if 'brands' in result:
                            brands = result['brands']
                        elif 'markalar' in result:
                            brands = result['markalar']
                        else:
                            # Get first list value
                            for key, value in result.items():
                                if isinstance(value, list):
                                    brands = value
                                    break
                            else:
                                logger.warning(f"[BRANDS] Unexpected dict: {list(result.keys())}")
                                brands = []
                    else:
                        logger.warning(f"[BRANDS] Unexpected type: {type(result)}")
                        brands = []
                    
                    if brands:
                        logger.info(f"[BRANDS] ✓ Found {len(brands)} brand(s)")
                        return brands
                    else:
                        logger.warning("[BRANDS] Empty result")
                        if attempt < MAX_RETRIES - 1:
                            await asyncio.sleep(1)
                            continue
                        return []
                except json.JSONDecodeError:
                    # Try to extract JSON array from markdown code blocks
                    json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', content, re.DOTALL)
                    if json_match:
                        return json.loads(json_match.group(1))
                    
                    # Try to find JSON array directly
                    json_match = re.search(r'\[.*?\]', content, re.DOTALL)
                    if json_match:
                        return json.loads(json_match.group(0))
                    
                    logger.error(f"Could not parse JSON from response: {content}")
                    if attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(1)
                        continue
                    return []
                    
            except Exception as e:
                logger.error(f"Error analyzing brands: {str(e)}")
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(1)
                    continue
                return []
        
        return []
    
    async def analyze_sentiment(self, brand_name: str, news_text: str) -> Dict:
        """
        Analyze sentiment for a specific brand
        
        Args:
            brand_name: Brand name to analyze
            news_text: News article text
            
        Returns:
            Sentiment analysis dictionary
        """
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(f"Analyzing sentiment for '{brand_name}' (attempt {attempt + 1}/{MAX_RETRIES})")
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": "Sen bir medya analisti uzmanısın. Yanıtların sadece geçerli JSON içermelidir."
                        },
                        {
                            "role": "user",
                            "content": SENTIMENT_ANALYSIS_PROMPT.format(
                                brand_name=brand_name,
                                news_text=news_text
                            )
                        }
                    ],
                    temperature=0.3,
                    max_tokens=500,
                    response_format={"type": "json_object"}
                )
                
                content = response.choices[0].message.content.strip()
                
                # Parse JSON
                try:
                    result = json.loads(content)
                    return result
                except json.JSONDecodeError:
                    # Try to extract JSON object from markdown code blocks
                    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                    if json_match:
                        return json.loads(json_match.group(1))
                    
                    # Try to find JSON object directly
                    json_match = re.search(r'\{.*?\}', content, re.DOTALL)
                    if json_match:
                        return json.loads(json_match.group(0))
                    
                    logger.error(f"Could not parse JSON from response: {content}")
                    if attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(1)
                        continue
                    return {
                        "sentiment": "Nötr",
                        "mention_weight": "Kısa Bahis",
                        "control": "Kontrolsüz"
                    }
                    
            except Exception as e:
                logger.error(f"Error analyzing sentiment: {str(e)}")
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(1)
                    continue
                return {
                    "sentiment": "Nötr",
                    "mention_weight": "Kısa Bahis",
                    "control": "Kontrolsüz"
                }
        
        # Default response if all retries failed
        return {
            "sentiment": "Nötr",
            "mention_weight": "Kısa Bahis",
            "control": "Kontrolsüz"
        }
    
    async def process_gno(self, gno: str, gno_url: str) -> List[Dict]:
        """
        Process a single GNO: extract news and analyze
        
        NOTE: One GNO can contain MULTIPLE brands in the news article.
        This method will extract ALL brands and analyze sentiment for each.
        
        Args:
            gno: GNO identifier
            gno_url: URL to news article
            
        Returns:
            List of analysis results for all brands found in this single GNO
        """
        results = []
        
        # Extract news text
        news_text = await self.extract_news_text(gno_url)
        if not news_text:
            return [{
                "gno": gno,
                "error": "Could not extract news text",
                "brand": "",
                "headline": "",
                "category": "",
                "sentiment": "",
                "mention_weight": "",
                "control": ""
            }]
        
        # Analyze brands
        brands = await self.analyze_brands(news_text)
        if not brands:
            return [{
                "gno": gno,
                "error": "No brands found",
                "brand": "",
                "headline": "",
                "category": "",
                "sentiment": "",
                "mention_weight": "",
                "control": ""
            }]
        
        # Analyze sentiment for each brand
        for brand_info in brands:
            brand_name = brand_info.get('brand', '')
            
            sentiment_info = await self.analyze_sentiment(brand_name, news_text)
            
            result = {
                "gno": gno,
                "brand": brand_name,
                "headline": brand_info.get('headline', ''),
                "category": brand_info.get('category', ''),
                "sentiment": sentiment_info.get('sentiment', ''),
                "mention_weight": sentiment_info.get('mention_weight', ''),
                "control": sentiment_info.get('control', ''),
                "error": ""
            }
            results.append(result)
        
        return results

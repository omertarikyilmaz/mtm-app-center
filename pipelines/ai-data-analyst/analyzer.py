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
from openai import AsyncOpenAI

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
        self.client = AsyncOpenAI(api_key=api_key)
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
        
        Args:
            gno_url: URL containing the news article
            
        Returns:
            Extracted news text or None if failed
        """
        try:
            logger.info(f"Extracting news from: {gno_url}")
            
            async with self.session.get(gno_url) as response:
                if response.status != 200:
                    logger.error(f"Failed to fetch {gno_url}: Status {response.status}")
                    return None
                
                html = await response.text()
                soup = BeautifulSoup(html, 'lxml')
                
                # Strategy 1: Look for "Metin" button and associated text wrapper
                text_wrapper = soup.find('div', class_='textwrapper')
                if text_wrapper:
                    text = text_wrapper.get_text(strip=True, separator=' ')
                    logger.info(f"Extracted {len(text)} characters from textwrapper")
                    return text
                
                # Strategy 2: Look for common article containers
                article_selectors = [
                    ('article', {}),
                    ('div', {'class': 'article-content'}),
                    ('div', {'class': 'news-content'}),
                    ('div', {'class': 'content'}),
                    ('div', {'id': 'article-body'}),
                ]
                
                for tag, attrs in article_selectors:
                    element = soup.find(tag, attrs)
                    if element:
                        text = element.get_text(strip=True, separator=' ')
                        logger.info(f"Extracted {len(text)} characters from {tag}")
                        return text
                
                # Strategy 3: Look for multiple paragraphs
                paragraphs = soup.find_all('p')
                if len(paragraphs) >= 3:
                    text = ' '.join([p.get_text(strip=True) for p in paragraphs])
                    logger.info(f"Extracted {len(text)} characters from paragraphs")
                    return text
                
                logger.warning(f"Could not find news text in {gno_url}")
                return None
                
        except asyncio.TimeoutError:
            logger.error(f"Timeout while fetching {gno_url}")
            return None
        except Exception as e:
            logger.error(f"Error extracting news from {gno_url}: {str(e)}")
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
                logger.info(f"Analyzing brands (attempt {attempt + 1}/{MAX_RETRIES})")
                
                response = await self.client.chat.completions.create(
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
                
                # Try to parse as JSON
                try:
                    result = json.loads(content)
                    # If result is a dict with array inside, extract it
                    if isinstance(result, dict):
                        for key in result:
                            if isinstance(result[key], list):
                                return result[key]
                    # If result is already an array
                    if isinstance(result, list):
                        return result
                    logger.warning(f"Unexpected JSON structure: {result}")
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
                
                response = await self.client.chat.completions.create(
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
        
        Args:
            gno: GNO identifier
            gno_url: URL to news article
            
        Returns:
            List of analysis results for all brands found
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

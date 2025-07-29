"""
News Scraper Module
Handles scraping of AI news from various sources.
"""

import requests
import time
import logging
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from datetime import datetime, timedelta
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class AINewsScraper:
    """
    A scraper for AI news from various tech news sources.
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        # Common AI news sources
        self.sources = {
            'techcrunch_ai': {
                'url': 'https://techcrunch.com/category/artificial-intelligence/',
                'article_selector': '.post-block',
                'title_selector': '.post-block__title__link',
                'link_selector': '.post-block__title__link',
                'excerpt_selector': '.post-block__content'
            },
            'venturebeat_ai': {
                'url': 'https://venturebeat.com/ai/',
                'article_selector': 'article',
                'title_selector': 'h2 a',
                'link_selector': 'h2 a',
                'excerpt_selector': '.excerpt'
            },
            'ai_news': {
                'url': 'https://www.artificialintelligence-news.com/',
                'article_selector': '.post',
                'title_selector': 'h2 a',
                'link_selector': 'h2 a',
                'excerpt_selector': '.excerpt'
            }
        }
    
    def scrape_source(self, source_name: str, max_articles: int = 10) -> List[Dict]:
        """
        Scrape articles from a specific source.
        
        Args:
            source_name: Name of the source to scrape
            max_articles: Maximum number of articles to scrape
            
        Returns:
            List of article dictionaries
        """
        if source_name not in self.sources:
            logger.error(f"Unknown source: {source_name}")
            return []
        
        source_config = self.sources[source_name]
        articles = []
        
        try:
            logger.info(f"Scraping {source_name}...")
            response = self.session.get(source_config['url'], timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            article_elements = soup.select(source_config['article_selector'])
            
            for i, element in enumerate(article_elements[:max_articles]):
                try:
                    # Extract title
                    title_elem = element.select_one(source_config['title_selector'])
                    title = title_elem.get_text(strip=True) if title_elem else 'No title'
                    
                    # Extract link
                    link_elem = element.select_one(source_config['link_selector'])
                    if link_elem:
                        link = link_elem.get('href', '')
                        if link and not link.startswith('http'):
                            link = urljoin(source_config['url'], link)
                    else:
                        link = ''
                    
                    # Extract excerpt
                    excerpt_elem = element.select_one(source_config['excerpt_selector'])
                    excerpt = excerpt_elem.get_text(strip=True) if excerpt_elem else ''
                    
                    if title and link:
                        article = {
                            'title': title,
                            'url': link,
                            'excerpt': excerpt,
                            'source': source_name,
                            'scraped_at': datetime.now().isoformat(),
                            'content': ''  # Will be filled by article processor
                        }
                        articles.append(article)
                        
                except Exception as e:
                    logger.error(f"Error parsing article {i} from {source_name}: {e}")
                    continue
            
            logger.info(f"Scraped {len(articles)} articles from {source_name}")
            return articles
            
        except Exception as e:
            logger.error(f"Error scraping {source_name}: {e}")
            return []
    
    def scrape_all_sources(self, max_articles_per_source: int = 5) -> List[Dict]:
        """
        Scrape articles from all configured sources.
        
        Args:
            max_articles_per_source: Maximum articles per source
            
        Returns:
            List of all articles from all sources
        """
        all_articles = []
        
        for source_name in self.sources:
            articles = self.scrape_source(source_name, max_articles_per_source)
            all_articles.extend(articles)
            
            # Be respectful with delays
            time.sleep(2)
        
        logger.info(f"Total articles scraped: {len(all_articles)}")
        return all_articles
    
    def scrape_article_content(self, url: str) -> str:
        """
        Scrape the full content of a specific article.
        
        Args:
            url: URL of the article to scrape
            
        Returns:
            Article content as text
        """
        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Try different content selectors
            content_selectors = [
                '.article-content',
                '.entry-content', 
                '.post-content',
                'article',
                '.content',
                '[class*="content"]'
            ]
            
            content = ""
            for selector in content_selectors:
                content_elem = soup.select_one(selector)
                if content_elem:
                    # Remove script and style elements
                    for script in content_elem(["script", "style"]):
                        script.decompose()
                    
                    content = content_elem.get_text()
                    content = ' '.join(content.split())  # Clean whitespace
                    break
            
            return content[:5000]  # Limit content length
            
        except Exception as e:
            logger.error(f"Error scraping content from {url}: {e}")
            return ""
    
    def get_latest_ai_news(self, max_total_articles: int = 15) -> List[Dict]:
        """
        Get the latest AI news from all sources.
        
        Args:
            max_total_articles: Maximum total articles to return
            
        Returns:
            List of latest AI news articles
        """
        # Calculate articles per source
        articles_per_source = max(1, max_total_articles // len(self.sources))
        
        # Scrape all sources
        articles = self.scrape_all_sources(articles_per_source)
        
        # Sort by scraped time (most recent first)
        articles.sort(key=lambda x: x['scraped_at'], reverse=True)
        
        # Return only the requested number
        return articles[:max_total_articles]

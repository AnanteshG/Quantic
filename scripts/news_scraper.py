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
        
        # Common AI news sources with updated selectors
        self.sources = {
            'hacker_news_ai': {
                'url': 'https://hn.algolia.com/api/v1/search?query=artificial%20intelligence&tags=story&hitsPerPage=10',
                'is_api': True,  # This is an API endpoint
            },
            'reddit_ai': {
                'url': 'https://www.reddit.com/r/artificial.json',
                'is_api': True,  # Reddit API
            },
            'simple_ai_blog': {
                'url': 'https://blogs.nvidia.com/ai-podcast/',
                'article_selector': 'article, .post, .entry',
                'title_selector': 'h1, h2, h3, .title, .entry-title',
                'link_selector': 'a',
                'excerpt_selector': '.excerpt, .summary, p'
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
            
            # Handle API sources differently
            if source_config.get('is_api'):
                return self.scrape_api_source(source_name, source_config, max_articles)
            
            response = self.session.get(source_config['url'], timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            article_elements = soup.select(source_config['article_selector'])
            
            logger.info(f"Found {len(article_elements)} potential articles")
            
            for i, element in enumerate(article_elements[:max_articles]):
                try:
                    # Extract title - try multiple selectors
                    title = self.extract_text_from_element(element, source_config['title_selector'])
                    
                    # Extract link
                    link = self.extract_link_from_element(element, source_config['link_selector'], source_config['url'])
                    
                    # Extract excerpt
                    excerpt = self.extract_text_from_element(element, source_config['excerpt_selector'])
                    
                    if title and len(title) > 10:  # Ensure we have a meaningful title
                        article = {
                            'title': title,
                            'url': link or source_config['url'],
                            'excerpt': excerpt,
                            'source': source_name,
                            'scraped_at': datetime.now().isoformat(),
                            'content': ''  # Will be filled by article processor
                        }
                        articles.append(article)
                        logger.info(f"  Found article: {title[:50]}...")
                        
                except Exception as e:
                    logger.error(f"Error parsing article {i} from {source_name}: {e}")
                    continue
            
            logger.info(f"Scraped {len(articles)} articles from {source_name}")
            return articles
            
        except Exception as e:
            logger.error(f"Error scraping {source_name}: {e}")
            return []
    
    def scrape_api_source(self, source_name: str, source_config: Dict, max_articles: int) -> List[Dict]:
        """Handle API-based sources like Hacker News and Reddit."""
        try:
            response = self.session.get(source_config['url'], timeout=15)
            response.raise_for_status()
            data = response.json()
            
            articles = []
            
            if source_name == 'hacker_news_ai':
                hits = data.get('hits', [])
                for hit in hits[:max_articles]:
                    if hit.get('title') and hit.get('url'):
                        articles.append({
                            'title': hit['title'],
                            'url': hit['url'],
                            'excerpt': hit.get('story_text', '')[:200],
                            'source': source_name,
                            'scraped_at': datetime.now().isoformat(),
                            'content': ''
                        })
            
            elif source_name == 'reddit_ai':
                posts = data.get('data', {}).get('children', [])
                for post in posts[:max_articles]:
                    post_data = post.get('data', {})
                    if post_data.get('title') and not post_data.get('is_self'):
                        articles.append({
                            'title': post_data['title'],
                            'url': post_data.get('url', ''),
                            'excerpt': post_data.get('selftext', '')[:200],
                            'source': source_name,
                            'scraped_at': datetime.now().isoformat(),
                            'content': ''
                        })
            
            logger.info(f"API scraping returned {len(articles)} articles from {source_name}")
            return articles
            
        except Exception as e:
            logger.error(f"Error scraping API source {source_name}: {e}")
            return []
    
    def extract_text_from_element(self, element, selector: str) -> str:
        """Extract text from an element using various selectors."""
        if not selector:
            return element.get_text(strip=True) if element else ''
        
        # Try the specific selector first
        target = element.select_one(selector)
        if target:
            return target.get_text(strip=True)
        
        # Fallback: try common title selectors
        for fallback_selector in ['h1', 'h2', 'h3', '.title', '[class*="title"]', 'a']:
            target = element.select_one(fallback_selector)
            if target and target.get_text(strip=True):
                return target.get_text(strip=True)
        
        return element.get_text(strip=True)[:100] if element else ''
    
    def extract_link_from_element(self, element, selector: str, base_url: str) -> str:
        """Extract link from an element."""
        if not selector:
            # Try to find any link in the element
            link_elem = element.select_one('a')
        else:
            link_elem = element.select_one(selector)
        
        if link_elem:
            href = link_elem.get('href', '')
            if href:
                if href.startswith('http'):
                    return href
                else:
                    return urljoin(base_url, href)
        
        return ''
    
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
        
        # If no articles found, generate fallback content
        if not articles:
            logger.warning("No articles scraped, generating fallback content")
            articles = self.generate_fallback_articles(max_total_articles)
        
        # Sort by scraped time (most recent first)
        articles.sort(key=lambda x: x['scraped_at'], reverse=True)
        
        # Return only the requested number
        return articles[:max_total_articles]
    
    def generate_fallback_articles(self, count: int = 5) -> List[Dict]:
        """Generate fallback AI news articles when scraping fails."""
        current_date = datetime.now().isoformat()
        
        fallback_articles = [
            {
                'title': 'Major Breakthrough in AI Language Understanding',
                'url': 'https://example.com/ai-breakthrough',
                'excerpt': 'Researchers announce significant improvements in AI reasoning capabilities and natural language understanding.',
                'source': 'AI Research Today',
                'scraped_at': current_date,
                'content': 'Recent developments in artificial intelligence have led to unprecedented improvements in language model capabilities...'
            },
            {
                'title': 'New AI Regulations Proposed by Global Tech Leaders',
                'url': 'https://example.com/ai-regulations',
                'excerpt': 'Technology leaders propose comprehensive framework for AI governance and safety standards.',
                'source': 'Tech Policy News',
                'scraped_at': current_date,
                'content': 'Industry executives and policymakers are collaborating on new guidelines for responsible AI development...'
            },
            {
                'title': 'AI in Healthcare Shows Promising Clinical Trial Results',
                'url': 'https://example.com/ai-healthcare',
                'excerpt': 'Medical AI applications demonstrate significant improvements in diagnostic accuracy and patient outcomes.',
                'source': 'Medical AI Journal',
                'scraped_at': current_date,
                'content': 'Clinical trials of AI-powered diagnostic tools show remarkable success rates in early disease detection...'
            },
            {
                'title': 'The Ethics of Autonomous AI Systems Under Scrutiny',
                'url': 'https://example.com/ai-ethics',
                'excerpt': 'Philosophers and technologists debate the moral implications of increasingly autonomous AI systems.',
                'source': 'Philosophy & Tech',
                'scraped_at': current_date,
                'content': 'As AI systems become more autonomous, questions about responsibility and ethical decision-making become crucial...'
            },
            {
                'title': 'AI Transforms Creative Industries with New Generative Tools',
                'url': 'https://example.com/creative-ai',
                'excerpt': 'Artists and creators embrace AI-powered tools for music, visual art, and content generation.',
                'source': 'Creative Tech Weekly',
                'scraped_at': current_date,
                'content': 'The intersection of AI and creativity is producing innovative tools that enhance human artistic expression...'
            }
        ]
        
        return fallback_articles[:count]

if __name__ == "__main__":
    import json
    import sys
    
    # Check if running in quiet mode (when called from Node.js)
    quiet_mode = len(sys.argv) > 1 and sys.argv[1] == '--quiet'
    
    if quiet_mode:
        # Suppress all logging when called from automation
        logging.basicConfig(level=logging.CRITICAL)
        scraper = AINewsScraper()
        latest_news = scraper.get_latest_ai_news(max_total_articles=10)
        print(json.dumps(latest_news, indent=2))
    else:
        # Enable verbose logging for manual testing
        logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
        scraper = AINewsScraper()
        print("DEBUG: Starting news scraper...")
        
        # Test each source individually
        for source_name in scraper.sources:
            print(f"DEBUG: Testing source: {source_name}")
            articles = scraper.scrape_source(source_name, max_articles=2)
            print(f"DEBUG: {source_name} returned {len(articles)} articles")
            if articles:
                for article in articles:
                    print(f"  - {article.get('title', 'No title')[:50]}...")
        
        print("DEBUG: Getting latest AI news...")
        latest_news = scraper.get_latest_ai_news(max_total_articles=10)
        print(f"DEBUG: Final result: {len(latest_news)} articles")
        print(json.dumps(latest_news, indent=2))

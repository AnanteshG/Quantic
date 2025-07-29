"""
AI News Scraper Package
A package for scraping and processing AI news from various sources.
"""

__version__ = "1.0.0"
__author__ = "QuanticDaily"

from .news_scraper import AINewsScraper
from .article_processor import ArticleProcessor
from .gemini_integration import GeminiSummarizer

__all__ = [
    'AINewsScraper',
    'ArticleProcessor', 
    'GeminiSummarizer'
]

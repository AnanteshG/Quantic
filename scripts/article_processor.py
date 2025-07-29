"""
Article Processor Module
Handles processing and analysis of scraped articles.
"""

import logging
import re
from typing import List, Dict, Optional
from datetime import datetime
import hashlib

logger = logging.getLogger(__name__)

class ArticleProcessor:
    """
    Processes and analyzes articles for quality, relevance, and content.
    """
    
    def __init__(self):
        # Keywords that indicate AI/tech relevance
        self.ai_keywords = [
            'artificial intelligence', 'ai', 'machine learning', 'ml', 'deep learning',
            'neural network', 'algorithm', 'automation', 'chatgpt', 'openai', 'gemini',
            'llm', 'large language model', 'natural language processing', 'nlp',
            'computer vision', 'robotics', 'data science', 'tensorflow', 'pytorch',
            'generative ai', 'gpt', 'transformer', 'anthropic', 'claude', 'midjourney',
            'stable diffusion', 'tech', 'technology', 'startup', 'silicon valley'
        ]
        
        # Words that might indicate low-quality content
        self.spam_keywords = [
            'click here', 'buy now', 'limited time', 'exclusive offer',
            'advertisement', 'sponsored content', 'affiliate'
        ]
    
    def calculate_relevance_score(self, article: Dict) -> float:
        """
        Calculate relevance score for an AI/tech article.
        
        Args:
            article: Article dictionary with title, content, etc.
            
        Returns:
            Relevance score (0.0 to 1.0)
        """
        score = 0.0
        total_text = f"{article.get('title', '')} {article.get('excerpt', '')} {article.get('content', '')}"
        total_text = total_text.lower()
        
        # Check for AI keywords
        keyword_matches = 0
        for keyword in self.ai_keywords:
            if keyword in total_text:
                keyword_matches += 1
        
        # Base score from keyword density
        if len(self.ai_keywords) > 0:
            score += (keyword_matches / len(self.ai_keywords)) * 0.7
        
        # Bonus for title containing AI keywords
        title_lower = article.get('title', '').lower()
        title_keywords = sum(1 for keyword in self.ai_keywords if keyword in title_lower)
        if title_keywords > 0:
            score += 0.2
        
        # Penalty for spam indicators
        spam_matches = sum(1 for spam_word in self.spam_keywords if spam_word in total_text)
        if spam_matches > 0:
            score -= spam_matches * 0.1
        
        # Content length bonus (longer articles tend to be more substantial)
        content_length = len(article.get('content', ''))
        if content_length > 1000:
            score += 0.1
        elif content_length > 500:
            score += 0.05
        
        # Ensure score is between 0 and 1
        return max(0.0, min(1.0, score))
    
    def extract_topics(self, article: Dict) -> List[str]:
        """
        Extract topics/tags from an article using simple keyword matching.
        
        Args:
            article: Article dictionary
            
        Returns:
            List of extracted topics
        """
        text = f"{article.get('title', '')} {article.get('content', '')}".lower()
        
        # Topic mappings
        topic_keywords = {
            'Machine Learning': ['machine learning', 'ml', 'neural network', 'deep learning'],
            'AI Research': ['research', 'study', 'paper', 'arxiv', 'academic'],
            'OpenAI': ['openai', 'chatgpt', 'gpt-4', 'gpt-3', 'dall-e'],
            'Google AI': ['google', 'gemini', 'bard', 'deepmind', 'tensorflow'],
            'Computer Vision': ['computer vision', 'image recognition', 'opencv', 'vision'],
            'NLP': ['natural language processing', 'nlp', 'language model', 'text'],
            'Robotics': ['robot', 'robotics', 'autonomous', 'automation'],
            'Startups': ['startup', 'funding', 'investment', 'venture capital'],
            'Big Tech': ['microsoft', 'apple', 'amazon', 'meta', 'facebook'],
            'Ethics': ['ethics', 'bias', 'fairness', 'responsible ai'],
            'Hardware': ['chip', 'gpu', 'nvidia', 'processor', 'hardware'],
            'Software': ['software', 'platform', 'api', 'framework', 'tool']
        }
        
        detected_topics = []
        for topic, keywords in topic_keywords.items():
            if any(keyword in text for keyword in keywords):
                detected_topics.append(topic)
        
        return detected_topics[:5]  # Limit to 5 topics
    
    def generate_summary(self, article: Dict, max_length: int = 300) -> str:
        """
        Generate a simple extractive summary of an article.
        
        Args:
            article: Article dictionary
            max_length: Maximum summary length
            
        Returns:
            Article summary
        """
        content = article.get('content', '')
        if not content:
            return article.get('excerpt', '')[:max_length]
        
        # Simple extractive summarization
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
        
        # Take first few sentences that fit within max_length
        summary = ""
        for sentence in sentences[:3]:  # Max 3 sentences
            if len(summary + sentence) < max_length:
                summary += sentence + ". "
            else:
                break
        
        return summary.strip() or article.get('excerpt', '')[:max_length]
    
    def deduplicate_articles(self, articles: List[Dict]) -> List[Dict]:
        """
        Remove duplicate articles based on title similarity and URL.
        
        Args:
            articles: List of articles
            
        Returns:
            Deduplicated list of articles
        """
        seen_hashes = set()
        unique_articles = []
        
        for article in articles:
            # Create hash based on title and URL
            title = article.get('title', '').lower().strip()
            url = article.get('url', '').strip()
            
            # Normalize title (remove common words, punctuation)
            normalized_title = re.sub(r'[^\w\s]', '', title)
            normalized_title = ' '.join(normalized_title.split())
            
            content_hash = hashlib.md5(f"{normalized_title}|{url}".encode()).hexdigest()
            
            if content_hash not in seen_hashes:
                seen_hashes.add(content_hash)
                unique_articles.append(article)
        
        logger.info(f"Deduplicated: {len(articles)} -> {len(unique_articles)} articles")
        return unique_articles
    
    def filter_by_quality(self, articles: List[Dict], min_score: float = 0.3) -> List[Dict]:
        """
        Filter articles by quality/relevance score.
        
        Args:
            articles: List of articles
            min_score: Minimum relevance score
            
        Returns:
            Filtered list of articles
        """
        quality_articles = []
        
        for article in articles:
            score = self.calculate_relevance_score(article)
            article['relevance_score'] = score
            
            if score >= min_score:
                quality_articles.append(article)
        
        # Sort by relevance score (highest first)
        quality_articles.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        logger.info(f"Quality filter: {len(articles)} -> {len(quality_articles)} articles")
        return quality_articles
    
    def process_articles(self, articles: List[Dict]) -> List[Dict]:
        """
        Process a list of articles: deduplicate, filter, and enhance.
        
        Args:
            articles: Raw articles from scraper
            
        Returns:
            Processed and enhanced articles
        """
        if not articles:
            return []
        
        logger.info(f"Processing {len(articles)} articles...")
        
        # Step 1: Deduplicate
        articles = self.deduplicate_articles(articles)
        
        # Step 2: Filter by quality
        articles = self.filter_by_quality(articles)
        
        # Step 3: Enhance each article
        for article in articles:
            # Extract topics
            article['topics'] = self.extract_topics(article)
            
            # Generate summary if not exists
            if not article.get('summary'):
                article['summary'] = self.generate_summary(article)
            
            # Add processing timestamp
            article['processed_at'] = datetime.now().isoformat()
        
        logger.info(f"Finished processing: {len(articles)} articles ready")
        return articles

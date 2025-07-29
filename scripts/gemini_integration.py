"""
Gemini Integration Module
Provides AI-powered article summarization and analysis using Google's Gemini API.
"""

import os
import logging
from typing import List, Dict, Optional
import time

logger = logging.getLogger(__name__)

# Try to import Gemini API
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("Google Generative AI not available. Install with: pip install google-generativeai")

class GeminiSummarizer:
    """
    Uses Google's Gemini API for article summarization and content enhancement.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Gemini summarizer.
        
        Args:
            api_key: Gemini API key (if not provided, will try to get from environment)
        """
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.model = None
        self.rate_limit_delay = 1  # Delay between API calls (seconds)
        
        if not GEMINI_AVAILABLE:
            logger.error("Gemini API not available")
            return
        
        if not self.api_key:
            logger.error("Gemini API key not provided")
            return
        
        try:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            logger.info("Gemini API initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini API: {e}")
    
    def is_available(self) -> bool:
        """Check if Gemini API is available and configured."""
        return GEMINI_AVAILABLE and self.model is not None
    
    def summarize_article(self, title: str, content: str, max_length: int = 250) -> str:
        """
        Generate a summary of an article using Gemini.
        
        Args:
            title: Article title
            content: Article content
            max_length: Maximum summary length in words
            
        Returns:
            Generated summary
        """
        if not self.is_available():
            return f"Summary not available: {content[:max_length]}..."
        
        try:
            prompt = f"""
            Please provide a concise, professional summary of the following AI/technology article.
            Focus on the key points, implications, and relevance to AI professionals.
            Keep the summary between 100-{max_length} words.
            Make it engaging and informative.
            
            Title: {title}
            
            Content: {content[:3000]}
            
            Summary:
            """
            
            response = self.model.generate_content(prompt)
            
            if response.text:
                summary = response.text.strip()
                # Ensure summary isn't too long
                words = summary.split()
                if len(words) > max_length:
                    summary = ' '.join(words[:max_length]) + '...'
                return summary
            else:
                logger.warning("Empty response from Gemini")
                return content[:max_length] + "..."
                
        except Exception as e:
            logger.error(f"Error generating summary with Gemini: {e}")
            return content[:max_length] + "..."
        finally:
            # Rate limiting
            time.sleep(self.rate_limit_delay)
    
    def extract_topics(self, title: str, content: str) -> List[str]:
        """
        Extract relevant topics from an article using Gemini.
        
        Args:
            title: Article title
            content: Article content
            
        Returns:
            List of extracted topics/tags
        """
        if not self.is_available():
            return ["AI", "Technology"]
        
        try:
            prompt = f"""
            Analyze the following AI/technology article and extract 3-5 relevant topics or tags.
            Focus on specific technologies, companies, concepts, or trends mentioned.
            Return only the topics as a comma-separated list, no explanations.
            Make topics specific and relevant to AI professionals.
            
            Title: {title}
            
            Content: {content[:2000]}
            
            Topics (comma-separated):
            """
            
            response = self.model.generate_content(prompt)
            
            if response.text:
                topics_text = response.text.strip()
                topics = [topic.strip() for topic in topics_text.split(',')]
                # Clean and filter topics
                clean_topics = []
                for topic in topics:
                    if topic and len(topic) > 2 and len(topic) < 30:
                        clean_topics.append(topic.title())
                return clean_topics[:5]
            else:
                logger.warning("Empty topics response from Gemini")
                return ["AI", "Technology"]
                
        except Exception as e:
            logger.error(f"Error extracting topics with Gemini: {e}")
            return ["AI", "Technology"]
        finally:
            # Rate limiting
            time.sleep(self.rate_limit_delay)
    
    def generate_newsletter_intro(self, articles: List[Dict]) -> str:
        """
        Generate an introduction for the newsletter using Gemini.
        
        Args:
            articles: List of articles to be included in newsletter
            
        Returns:
            Generated newsletter introduction
        """
        if not self.is_available():
            return "Welcome to this week's AI news roundup. Here are the latest developments in artificial intelligence and technology."
        
        try:
            # Create a summary of all article topics
            all_topics = []
            article_summaries = []
            
            for article in articles[:5]:  # Limit to first 5 articles
                title = article.get('title', '')
                topics = article.get('topics', [])
                all_topics.extend(topics)
                article_summaries.append(f"- {title}")
            
            # Get unique topics
            unique_topics = list(set(all_topics))
            
            prompt = f"""
            Write a brief, engaging introduction for an AI newsletter called "QuanticDaily".
            The newsletter covers the following articles this week:
            {chr(10).join(article_summaries)}
            
            Key topics covered: {', '.join(unique_topics[:8])}
            
            Requirements:
            - Keep it under 100 words
            - Professional but engaging tone
            - Highlight the most interesting trends or developments
            - Don't just list the articles, provide insight
            - Start with a compelling hook about the week in AI
            
            Introduction:
            """
            
            response = self.model.generate_content(prompt)
            
            if response.text:
                return response.text.strip()
            else:
                return "Welcome to this week's AI news roundup. Here are the latest developments in artificial intelligence and technology."
                
        except Exception as e:
            logger.error(f"Error generating newsletter intro with Gemini: {e}")
            return "Welcome to this week's AI news roundup. Here are the latest developments in artificial intelligence and technology."
        finally:
            time.sleep(self.rate_limit_delay)
    
    def enhance_articles(self, articles: List[Dict]) -> List[Dict]:
        """
        Enhance a list of articles with Gemini-generated summaries and topics.
        
        Args:
            articles: List of article dictionaries
            
        Returns:
            Enhanced articles with AI-generated content
        """
        if not self.is_available():
            logger.warning("Gemini not available, returning articles unchanged")
            return articles
        
        enhanced_articles = []
        
        for i, article in enumerate(articles):
            try:
                logger.info(f"Enhancing article {i+1}/{len(articles)}: {article.get('title', 'No title')[:50]}...")
                
                enhanced_article = article.copy()
                
                # Generate summary if not exists or is too short
                current_summary = article.get('summary', '')
                if not current_summary or len(current_summary) < 50:
                    enhanced_article['summary'] = self.summarize_article(
                        article.get('title', ''),
                        article.get('content', ''),
                        max_length=200
                    )
                
                # Extract topics if not exists
                if not article.get('topics'):
                    enhanced_article['topics'] = self.extract_topics(
                        article.get('title', ''),
                        article.get('content', '')
                    )
                
                enhanced_articles.append(enhanced_article)
                
            except Exception as e:
                logger.error(f"Error enhancing article {i}: {e}")
                enhanced_articles.append(article)  # Keep original if enhancement fails
        
        return enhanced_articles
    
    def test_connection(self) -> bool:
        """
        Test the Gemini API connection.
        
        Returns:
            True if connection is working, False otherwise
        """
        if not self.is_available():
            return False
        
        try:
            test_prompt = "Hello, please respond with 'Gemini API is working'"
            response = self.model.generate_content(test_prompt)
            
            if response.text and "working" in response.text.lower():
                logger.info("Gemini API test successful")
                return True
            else:
                logger.error("Gemini API test failed: unexpected response")
                return False
                
        except Exception as e:
            logger.error(f"Gemini API test failed: {e}")
            return False

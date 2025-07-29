#!/usr/bin/env python3
"""
Simplified newsletter generator that works without the full AI news scraper.
This version can be used as a fallback or standalone newsletter system.
"""

import sys
import os
import json
import smtplib
import time
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import logging
from pathlib import Path
from bs4 import BeautifulSoup

# Import newsletter utilities
try:
    from newsletter_utils import generate_unsubscribe_link, get_unsubscribe_footer_html
except ImportError:
    # Fallback if newsletter_utils is not available
    def generate_unsubscribe_link(email: str) -> str:
        return "https://quanticdaily.vercel.app/unsubscribe"
    
    def get_unsubscribe_footer_html(email: str) -> str:
        return f"""
        <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p>
                You're receiving this email because you subscribed to QuanticDaily.<br>
                <a href="https://quanticdaily.vercel.app/unsubscribe" style="color: #6b7280; text-decoration: underline;">
                    Unsubscribe from future emails
                </a>
            </p>
        </div>
        """

# Try to import Gemini API
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Google Generative AI not available. Install with: pip install google-generativeai")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SimpleNewsletterGenerator:
    def __init__(self):
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv()
        
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        self.gemini_model = None
        
        if GEMINI_AVAILABLE and self.gemini_api_key:
            try:
                genai.configure(api_key=self.gemini_api_key)
                self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
                logger.info("Gemini API initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
        else:
            logger.warning("Gemini API not available or not configured")
    
    def get_subscribers(self):
        """Get list of active subscribers from the subscribers.json file."""
        subscribers_file = Path(__file__).parent.parent / 'subscribers.json'
        
        try:
            if subscribers_file.exists():
                with open(subscribers_file, 'r') as f:
                    subscribers = json.load(f)
                    return [sub['email'] for sub in subscribers if sub.get('active', True)]
        except Exception as e:
            logger.error(f"Error reading subscribers file: {e}")
            
        return []
    
    def scrape_simple_article(self, url):
        """Simple article scraping without the full pipeline."""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Try to extract title
            title = None
            for selector in ['h1', '.article-title', '.entry-title', 'title']:
                element = soup.select_one(selector)
                if element and element.get_text().strip():
                    title = element.get_text().strip()
                    break
            
            # Try to extract content
            content = ""
            for selector in ['.article-content', '.entry-content', '.post-content', 'article', '.content']:
                element = soup.select_one(selector)
                if element:
                    # Get text and clean it up
                    content = element.get_text()
                    content = ' '.join(content.split())  # Clean whitespace
                    break
            
            return {
                'url': url,
                'title': title or 'Untitled Article',
                'content': content[:2000] if content else 'Content not available',  # Limit content
                'scraped_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            return None
    
    def summarize_with_gemini(self, article_text, title=""):
        """Summarize article using Gemini API."""
        if not self.gemini_model:
            return "Summary not available (Gemini API not configured)"
        
        try:
            prompt = f"""
            Please provide a concise, professional summary of the following AI/technology article. 
            Focus on the key points, implications, and relevance to AI professionals.
            Keep the summary between 150-300 words.
            
            Title: {title}
            
            Article Content:
            {article_text[:3000]}
            
            Summary:
            """
            
            response = self.gemini_model.generate_content(prompt)
            
            if response.text:
                return response.text.strip()
            else:
                return "Summary generation failed"
                
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return f"Summary not available: {str(e)}"
    
    def extract_topics_with_gemini(self, article_text, title=""):
        """Extract topics using Gemini API."""
        if not self.gemini_model:
            return ["AI", "Technology"]
        
        try:
            prompt = f"""
            Analyze the following AI/technology article and extract 3-5 relevant topics or tags.
            Focus on specific technologies, companies, concepts, or trends mentioned.
            Return only the topics as a comma-separated list.
            
            Title: {title}
            
            Article Content:
            {article_text[:2000]}
            
            Topics (comma-separated):
            """
            
            response = self.gemini_model.generate_content(prompt)
            
            if response.text:
                topics_text = response.text.strip()
                topics = [topic.strip() for topic in topics_text.split(',')]
                return [t for t in topics if t and len(t) > 2][:5]
            else:
                return ["AI", "Technology"]
                
        except Exception as e:
            logger.error(f"Error extracting topics: {e}")
            return ["AI", "Technology"]
    
    def scrape_weekly_news(self):
        """Scrape AI news from various sources."""
        # Sample AI news URLs
        urls = [
            "https://techcrunch.com/category/artificial-intelligence/",
            "https://venturebeat.com/ai/",
            "https://www.artificialintelligence-news.com/",
        ]
        
        articles = []
        
        for url in urls:
            logger.info(f"Scraping: {url}")
            article = self.scrape_simple_article(url)
            
            if article and len(article['content']) > 100:
                # Enhance with Gemini if available
                if self.gemini_model:
                    article['summary'] = self.summarize_with_gemini(article['content'], article['title'])
                    article['topics'] = self.extract_topics_with_gemini(article['content'], article['title'])
                else:
                    article['summary'] = article['content'][:300] + "..."
                    article['topics'] = ["AI", "Technology"]
                
                articles.append(article)
                
                # Small delay to be respectful
                time.sleep(2)
            
            # Limit to 5 articles for testing
            if len(articles) >= 5:
                break
        
        return articles
    
    def generate_newsletter_html(self, articles):
        """Generate HTML newsletter content."""
        if not articles:
            return None
            
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>QuanticDaily - AI News Weekly</title>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; }}
                .header {{ background: linear-gradient(135deg, #4a5e42 0%, #7a8f72 50%, #c8d3c1 100%); color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: bold; }}
                .header p {{ margin: 10px 0 0 0; opacity: 0.9; }}
                .content {{ padding: 30px; }}
                .article {{ margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }}
                .article:last-child {{ border-bottom: none; }}
                .article h2 {{ color: #333; font-size: 18px; margin: 0 0 10px 0; }}
                .article h2 a {{ color: #333; text-decoration: none; }}
                .article h2 a:hover {{ color: #1976d2; text-decoration: underline; }}
                .article .summary {{ color: #666; line-height: 1.6; margin-bottom: 10px; }}
                .article .read-more {{ margin: 10px 0; }}
                .read-more-btn {{ display: inline-block; background-color: #1976d2; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 12px; }}
                .read-more-btn:hover {{ background-color: #1565c0; }}
                .article .topics {{ margin-top: 10px; }}
                .topic {{ display: inline-block; background-color: #f0f0f0; color: #666; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-right: 5px; }}
                .footer {{ background-color: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>QuanticDaily</h1>
                    <p>Your Weekly AI News Digest</p>
                    <p>{datetime.now().strftime('%B %d, %Y')}</p>
                </div>
                
                <div class="content">
                    <h3>This Week in AI</h3>
                    <p>Here are the latest AI and technology developments:</p>
        """
        
        for article in articles:
            title = article.get('title', 'Untitled Article')
            summary = article.get('summary', 'No summary available.')
            topics = article.get('topics', [])
            article_url = article.get('url', '')
            
            # Truncate summary if too long
            if len(summary) > 400:
                summary = summary[:400] + "..."
            
            topics_html = ""
            if topics:
                topics_html = '<div class="topics">' + ''.join([f'<span class="topic">{topic}</span>' for topic in topics[:3]]) + '</div>'
            
            # Create clickable title and read more button
            if article_url:
                title_html = f'<h2><a href="{article_url}" target="_blank">{title}</a></h2>'
                read_more_html = f'<div class="read-more"><a href="{article_url}" target="_blank" class="read-more-btn">Read Full Article →</a></div>'
            else:
                title_html = f'<h2>{title}</h2>'
                read_more_html = ''
            
            html_content += f"""
                    <div class="article">
                        {title_html}
                        <div class="summary">{summary}</div>
                        {read_more_html}
                        {topics_html}
                    </div>
            """
        
        html_content += f"""
                </div>
                
                <div class="footer">
                    <p>Thank you for reading QuanticDaily!</p>
                    <p>© 2025 QuanticDaily. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    def send_newsletter(self, subscribers, html_content):
        """Send newsletter to all subscribers."""
        if not subscribers or not html_content:
            logger.warning("No subscribers or content to send")
            return False
            
        # Email configuration
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        sender_email = os.getenv('SENDER_EMAIL')
        sender_password = os.getenv('SENDER_PASSWORD')
        
        if not sender_email or not sender_password:
            logger.error("Email credentials not configured")
            return False
        
        try:
            # Create SMTP session
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(sender_email, sender_password)
            
            # Send email to each subscriber
            for email in subscribers:
                try:
                    # Personalize content with unsubscribe link
                    personalized_content = html_content + get_unsubscribe_footer_html(email)
                    
                    msg = MIMEMultipart('alternative')
                    msg['From'] = f"QuanticDaily <{sender_email}>"
                    msg['To'] = email
                    msg['Subject'] = f"QuanticDaily - AI News Weekly ({datetime.now().strftime('%B %d, %Y')})"
                    
                    html_part = MIMEText(personalized_content, 'html')
                    msg.attach(html_part)
                    
                    server.send_message(msg)
                    logger.info(f"Newsletter sent to {email}")
                    
                except Exception as e:
                    logger.error(f"Failed to send to {email}: {e}")
            
            server.quit()
            return True
            
        except Exception as e:
            logger.error(f"Error sending newsletters: {e}")
            return False
    
    def generate_and_send_newsletter(self):
        """Main function to generate and send newsletter."""
        logger.info("Starting simplified newsletter generation...")
        
        # Get subscribers
        subscribers = self.get_subscribers()
        if not subscribers:
            logger.warning("No subscribers found")
            return False
        
        logger.info(f"Found {len(subscribers)} subscribers")
        
        # Scrape news
        logger.info("Scraping AI news...")
        articles = self.scrape_weekly_news()
        
        if not articles:
            logger.error("No articles found")
            return False
        
        logger.info(f"Found {len(articles)} articles")
        
        # Generate newsletter
        html_content = self.generate_newsletter_html(articles)
        
        if not html_content:
            logger.error("Failed to generate newsletter content")
            return False
        
        # Send newsletter
        logger.info("Sending newsletter...")
        success = self.send_newsletter(subscribers, html_content)
        
        if success:
            logger.info("Newsletter sent successfully!")
        else:
            logger.error("Failed to send newsletter")
        
        return success

def main():
    """Main entry point."""
    generator = SimpleNewsletterGenerator()
    success = generator.generate_and_send_newsletter()
    
    if success:
        print("Newsletter generated and sent successfully!")
        sys.exit(0)
    else:
        print("Failed to generate or send newsletter")
        sys.exit(1)

if __name__ == "__main__":
    main()

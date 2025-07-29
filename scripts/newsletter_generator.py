#!/usr/bin/env python3
"""
QuanticDaily Newsletter Generator
Automated newsletter generation using AI news scraper and Gemini integration.
"""

import sys
import os
import json
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from pathlib import Path

# Get the absolute path to the scripts directory
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

# Try to import the AI news scraper modules
try:
    from news_scraper import AINewsScraper
    from article_processor import ArticleProcessor
    from gemini_integration import GeminiSummarizer
    print("Successfully imported AI news scraper modules")
except ImportError as e:
    print(f"Error importing AI news scraper modules: {e}")
    print("Make sure the ai-news-scraper is properly installed")
    print("For Gemini integration, install: pip install google-generativeai")
    sys.exit(1)

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not available, using system environment variables")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class NewsletterGenerator:
    """
    Generates and sends AI newsletter using the news scraper and Gemini AI.
    """
    
    def __init__(self):
        self.scraper = AINewsScraper()
        self.processor = ArticleProcessor()
        self.summarizer = GeminiSummarizer()
        
        # Email configuration
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.sender_email = os.getenv('SENDER_EMAIL')
        self.sender_password = os.getenv('SENDER_PASSWORD')
        
        if not self.sender_email or not self.sender_password:
            logger.warning("Email credentials not configured")
    
    def get_subscribers(self):
        """Get list of active subscribers."""
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        subscribers_file = Path(project_root) / 'subscribers.json'
        
        try:
            if subscribers_file.exists():
                with open(subscribers_file, 'r') as f:
                    subscribers = json.load(f)
                    return [sub['email'] for sub in subscribers if sub.get('active', True)]
        except Exception as e:
            logger.error(f"Error reading subscribers file: {e}")
            
        return []
    
    def generate_newsletter_html(self, articles, intro_text=""):
        """Generate HTML newsletter content."""
        if not articles:
            return None
        
        # Use Gemini to generate intro if available and not provided
        if not intro_text and self.summarizer.is_available():
            intro_text = self.summarizer.generate_newsletter_intro(articles)
        elif not intro_text:
            intro_text = "Welcome to this week's AI news roundup. Here are the latest developments in artificial intelligence and technology."
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>QuanticDaily - AI News Weekly</title>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #4a5e42 0%, #7a8f72 50%, #c8d3c1 100%); color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; font-weight: bold; }}
                .header p {{ margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }}
                .intro {{ padding: 20px 30px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef; }}
                .intro p {{ margin: 0; color: #495057; line-height: 1.6; font-size: 16px; }}
                .content {{ padding: 30px; }}
                .article {{ margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 25px; }}
                .article:last-child {{ border-bottom: none; }}
                .article h2 {{ color: #333; font-size: 20px; margin: 0 0 12px 0; line-height: 1.3; }}
                .article h2 a {{ color: #333; text-decoration: none; }}
                .article h2 a:hover {{ color: #1976d2; text-decoration: underline; }}
                .article .summary {{ color: #666; line-height: 1.6; margin-bottom: 15px; font-size: 14px; }}
                .article .read-more {{ margin: 15px 0; }}
                .read-more-btn {{ display: inline-block; background-color: #1976d2; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; }}
                .read-more-btn:hover {{ background-color: #1565c0; }}
                .article .meta {{ display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }}
                .article .topics {{ }}
                .topic {{ display: inline-block; background-color: #e3f2fd; color: #1976d2; padding: 4px 10px; border-radius: 15px; font-size: 12px; margin-right: 8px; margin-bottom: 5px; }}
                .article .source {{ color: #999; font-size: 12px; }}
                .article .score {{ color: #28a745; font-size: 12px; font-weight: bold; }}
                .footer {{ background-color: #f8f8f8; padding: 25px; text-align: center; color: #666; }}
                .footer p {{ margin: 5px 0; font-size: 14px; }}
                .footer .small {{ font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>QuanticDaily</h1>
                    <p>Your Weekly AI News Digest</p>
                    <p>{datetime.now().strftime('%B %d, %Y')}</p>
                </div>
                
                <div class="intro">
                    <p>{intro_text}</p>
                </div>
                
                <div class="content">
        """
        
        for i, article in enumerate(articles, 1):
            title = article.get('title', 'Untitled Article')
            summary = article.get('summary', 'No summary available.')
            topics = article.get('topics', [])
            source = article.get('source', 'Unknown').replace('_', ' ').title()
            relevance_score = article.get('relevance_score', 0)
            article_url = article.get('url', '')
            
            # Truncate summary if too long
            if len(summary) > 500:
                summary = summary[:500] + "..."
            
            topics_html = ""
            if topics:
                topics_html = '<div class="topics">' + ''.join([f'<span class="topic">{topic}</span>' for topic in topics[:4]]) + '</div>'
            
            score_html = f'<span class="score">★ {relevance_score:.1f}</span>' if relevance_score > 0 else ''
            
            # Create clickable title and read more button
            if article_url:
                title_html = f'<h2><a href="{article_url}" target="_blank">{i}. {title}</a></h2>'
                read_more_html = f'<div class="read-more"><a href="{article_url}" target="_blank" class="read-more-btn">Read Full Article →</a></div>'
            else:
                title_html = f'<h2>{i}. {title}</h2>'
                read_more_html = ''
            
            html_content += f"""
                    <div class="article">
                        {title_html}
                        <div class="summary">{summary}</div>
                        {read_more_html}
                        <div class="meta">
                            {topics_html}
                            <div>
                                <span class="source">{source}</span>
                                {score_html}
                            </div>
                        </div>
                    </div>
            """
        
        html_content += f"""
                </div>
                
                <div class="footer">
                    <p><strong>Thank you for reading QuanticDaily!</strong></p>
                    <p>Curated AI news powered by advanced algorithms</p>
                    <p class="small">© {datetime.now().year} QuanticDaily. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    def send_newsletter(self, subscribers, html_content, subject=None):
        """Send newsletter to all subscribers."""
        if not subscribers or not html_content:
            logger.warning("No subscribers or content to send")
            return False
            
        if not self.sender_email or not self.sender_password:
            logger.error("Email credentials not configured")
            return False
        
        if not subject:
            subject = f"QuanticDaily - AI News Weekly ({datetime.now().strftime('%B %d, %Y')})"
        
        try:
            # Create SMTP session
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            
            successful_sends = 0
            
            # Send email to each subscriber
            for email in subscribers:
                try:
                    msg = MIMEMultipart('alternative')
                    msg['From'] = f"QuanticDaily <{self.sender_email}>"
                    msg['To'] = email
                    msg['Subject'] = subject
                    
                    html_part = MIMEText(html_content, 'html')
                    msg.attach(html_part)
                    
                    server.send_message(msg)
                    logger.info(f"Newsletter sent to {email}")
                    successful_sends += 1
                    
                except Exception as e:
                    logger.error(f"Failed to send to {email}: {e}")
            
            server.quit()
            
            logger.info(f"Newsletter sent to {successful_sends}/{len(subscribers)} subscribers")
            return successful_sends > 0
            
        except Exception as e:
            logger.error(f"Error sending newsletters: {e}")
            return False
    
    def generate_and_send_newsletter(self):
        """Main function to generate and send newsletter."""
        logger.info("Starting newsletter generation...")
        
        # Get subscribers
        subscribers = self.get_subscribers()
        if not subscribers:
            logger.warning("No subscribers found")
            return False
        
        logger.info(f"Found {len(subscribers)} subscribers")
        
        # Scrape and process news
        logger.info("Scraping AI news...")
        raw_articles = self.scraper.get_latest_ai_news(max_total_articles=20)
        
        if not raw_articles:
            logger.error("No articles found")
            return False
        
        logger.info(f"Found {len(raw_articles)} raw articles")
        
        # Scrape full content for each article
        logger.info("Enriching articles with full content...")
        for article in raw_articles:
            if article.get('url'):
                content = self.scraper.scrape_article_content(article['url'])
                article['content'] = content
        
        # Process articles
        logger.info("Processing articles...")
        processed_articles = self.processor.process_articles(raw_articles)
        
        if not processed_articles:
            logger.error("No articles passed quality filter")
            return False
        
        logger.info(f"Processing resulted in {len(processed_articles)} quality articles")
        
        # Enhance with Gemini if available
        if self.summarizer.is_available():
            logger.info("Enhancing articles with Gemini AI...")
            enhanced_articles = self.summarizer.enhance_articles(processed_articles)
        else:
            logger.info("Gemini not available, using basic processing")
            enhanced_articles = processed_articles
        
        # Limit to top articles
        final_articles = enhanced_articles[:8]  # Top 8 articles
        
        # Generate newsletter
        logger.info("Generating newsletter HTML...")
        html_content = self.generate_newsletter_html(final_articles)
        
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
    try:
        generator = NewsletterGenerator()
        success = generator.generate_and_send_newsletter()
        
        if success:
            print("Newsletter generated and sent successfully!")
            sys.exit(0)
        else:
            print("Failed to generate or send newsletter")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        print(f"Newsletter generation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

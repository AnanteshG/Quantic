#!/usr/bin/env python3
"""
Email Authentication Test Script
Tests SMTP connection and authentication without sending newsletters.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not available, using system environment variables")

def test_email_auth():
    """Test email authentication and SMTP connection."""
    
    # Get email configuration
    sender_email = os.getenv('SENDER_EMAIL')
    sender_password = os.getenv('SENDER_PASSWORD')
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    
    print("=== Email Authentication Test ===")
    print(f"SMTP Server: {smtp_server}:{smtp_port}")
    print(f"Sender Email: {sender_email}")
    print(f"Password: {'*' * len(sender_password) if sender_password else 'NOT SET'}")
    print()
    
    if not sender_email or not sender_password:
        print("❌ ERROR: Email credentials not configured in .env file")
        print("\nPlease set:")
        print("SENDER_EMAIL=your-email@gmail.com")
        print("SENDER_PASSWORD=your-gmail-app-password")
        return False
    
    if sender_password == "your-gmail-app-password-here":
        print("❌ ERROR: Please replace 'your-gmail-app-password-here' with your actual Gmail App Password")
        print("\nTo generate a Gmail App Password:")
        print("1. Go to https://myaccount.google.com/")
        print("2. Security → 2-Step Verification → App passwords")
        print("3. Generate new app password for 'Mail'")
        print("4. Copy the 16-character password to your .env file")
        return False
    
    try:
        print("🔄 Testing SMTP connection...")
        
        # Create SMTP session
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        
        print("🔄 Testing authentication...")
        server.login(sender_email, sender_password)
        
        print("✅ SUCCESS: Email authentication successful!")
        print("📧 Ready to send newsletters!")
        
        server.quit()
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ AUTHENTICATION ERROR: {e}")
        print("\nCommon solutions:")
        print("1. Make sure you're using a Gmail App Password, not your regular password")
        print("2. Enable 2-Factor Authentication on your Google account")
        print("3. Generate a new App Password specifically for this application")
        print("4. Make sure 'Less secure app access' is not blocking the connection")
        return False
        
    except smtplib.SMTPConnectError as e:
        print(f"❌ CONNECTION ERROR: {e}")
        print("\nCheck your internet connection and SMTP settings")
        return False
        
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        return False

def send_test_email():
    """Send a test email to verify the complete email sending pipeline."""
    
    sender_email = os.getenv('SENDER_EMAIL')
    sender_password = os.getenv('SENDER_PASSWORD')
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    
    print("\n=== Test Email Sending ===")
    recipient = input(f"Enter test email address (or press Enter to use {sender_email}): ").strip()
    
    if not recipient:
        recipient = sender_email
    
    try:
        # Create test email
        msg = MIMEMultipart('alternative')
        msg['From'] = f"QuanticDaily <{sender_email}>"
        msg['To'] = recipient
        msg['Subject'] = "QuanticDaily Newsletter System Test"
        
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #4a5e42 0%, #7a8f72 50%, #c8d3c1 100%); color: white; padding: 20px; text-align: center; border-radius: 8px; }
                .content { padding: 20px; background-color: #f9f9f9; margin-top: 10px; border-radius: 8px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>QuanticDaily Test</h1>
                <p>Newsletter System Test Email</p>
            </div>
            <div class="content">
                <h2>✅ Email System Working!</h2>
                <p>This is a test email to verify that your QuanticDaily newsletter system is configured correctly.</p>
                <p><strong>System Status:</strong> All systems operational</p>
                <p><strong>Sent at:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
        </body>
        </html>
        """.replace('{datetime.now().strftime(\'%Y-%m-%d %H:%M:%S\')}', 
                   __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ SUCCESS: Test email sent to {recipient}")
        print("📧 Check your inbox to confirm delivery!")
        return True
        
    except Exception as e:
        print(f"❌ ERROR sending test email: {e}")
        return False

if __name__ == "__main__":
    print("QuanticDaily Email System Tester\n")
    
    # Test authentication
    auth_success = test_email_auth()
    
    if auth_success:
        print("\n" + "="*50)
        send_test = input("Would you like to send a test email? (y/n): ").lower().strip()
        
        if send_test in ['y', 'yes']:
            send_test_email()
    
    print("\n" + "="*50)
    print("Email test complete!")

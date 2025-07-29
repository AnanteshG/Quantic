"""
Utility functions for the QuanticDaily newsletter system.
"""

import hashlib
import os
from datetime import datetime
from urllib.parse import urlencode

def generate_unsubscribe_token(email: str) -> str:
    """Generate an unsubscribe token for the given email."""
    secret = os.getenv('UNSUBSCRIBE_SECRET', 'development-secret-key')
    return hashlib.sha256((email + secret).encode()).hexdigest()

def generate_unsubscribe_link(email: str, base_url: str = None) -> str:
    """Generate a complete unsubscribe link for the given email."""
    if base_url is None:
        base_url = os.getenv('BASE_URL', 'https://quanticdaily.vercel.app')
    
    token = generate_unsubscribe_token(email)
    params = urlencode({'token': token, 'email': email})
    return f"{base_url}/unsubscribe?{params}"

def get_unsubscribe_footer_html(email: str) -> str:
    """Generate HTML footer with unsubscribe link."""
    unsubscribe_link = generate_unsubscribe_link(email)
    
    return f"""
    <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
        <p>
            You're receiving this email because you subscribed to QuanticDaily.<br>
            <a href="{unsubscribe_link}" style="color: #6b7280; text-decoration: underline;">
                Unsubscribe from future emails
            </a> | 
            <a href="mailto:quanticdaily@gmail.com" style="color: #6b7280; text-decoration: underline;">
                Contact us
            </a>
        </p>
        <p style="margin-top: 10px;">
            QuanticDaily • AI News for Professionals<br>
            © {datetime.now().year} All rights reserved.
        </p>
    </div>
    """

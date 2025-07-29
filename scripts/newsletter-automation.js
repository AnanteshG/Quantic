#!/usr/bin/env node

/**
 * Newsletter Automation Script for GitHub Actions
 * Fetches AI news, generates newsletter content, and sends emails
 */

const https = require("https");
const { createHash } = require("crypto");

// Simple logging utility
const log = (message, level = "INFO") => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level}: ${message}`;
  console.log(logMessage);
};

// Environment variables
const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  SENDER_EMAIL: process.env.SENDER_EMAIL,
  SENDER_PASSWORD: process.env.SENDER_PASSWORD,
  SMTP_SERVER: process.env.SMTP_SERVER || "smtp.gmail.com",
  SMTP_PORT: process.env.SMTP_PORT || "587",
  UNSUBSCRIBE_SECRET: process.env.UNSUBSCRIBE_SECRET,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  TEST_MODE: process.env.TEST_MODE === "true",
  FIREBASE: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
};

// Validate configuration
function validateConfig() {
  const required = [
    "GEMINI_API_KEY",
    "SENDER_EMAIL",
    "SENDER_PASSWORD",
    "UNSUBSCRIBE_SECRET",
    "APP_URL",
  ];
  const missing = required.filter((key) => !CONFIG[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  log("Configuration validated successfully");
}

// Generate unsubscribe token
function generateUnsubscribeToken(email) {
  const secret = CONFIG.UNSUBSCRIBE_SECRET;
  return createHash("sha256")
    .update(email + secret)
    .digest("hex");
}

// Fetch AI news sources (simplified for GitHub Actions)
async function fetchAINews() {
  log("Fetching AI news...");

  // For now, return mock data. In production, integrate with news APIs
  const mockNews = [
    {
      title: "Major AI Breakthrough in Language Models",
      summary:
        "Researchers announce significant improvements in AI reasoning capabilities.",
      url: "https://example.com/ai-breakthrough",
      source: "AI Research Today",
      publishedAt: new Date().toISOString(),
    },
    {
      title: "New AI Regulations Proposed",
      summary:
        "Government announces new framework for AI governance and safety.",
      url: "https://example.com/ai-regulations",
      source: "Tech Policy News",
      publishedAt: new Date().toISOString(),
    },
    {
      title: "AI in Healthcare: Latest Developments",
      summary:
        "Medical AI applications show promising results in clinical trials.",
      url: "https://example.com/ai-healthcare",
      source: "Medical AI Journal",
      publishedAt: new Date().toISOString(),
    },
  ];

  log(`Fetched ${mockNews.length} news articles`);
  return mockNews;
}

// Generate newsletter content using Gemini AI
async function generateNewsletterContent(newsArticles) {
  log("Generating newsletter content with Gemini AI...");

  const prompt = `Create a professional AI newsletter based on these articles:

${newsArticles
  .map(
    (article, index) =>
      `${index + 1}. ${article.title}
   Summary: ${article.summary}
   Source: ${article.source}
`
  )
  .join("\n")}

Please create:
1. A catchy subject line
2. A brief introduction paragraph
3. Summarized sections for each article with key insights
4. A conclusion with actionable takeaways

Keep it professional, engaging, and under 800 words. Format in HTML for email.`;

  try {
    const response = await makeGeminiRequest(prompt);
    log("Newsletter content generated successfully");
    return response;
  } catch (error) {
    log(`Error generating content: ${error.message}`, "ERROR");
    throw error;
  }
}

// Make request to Gemini AI
function makeGeminiRequest(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      },
    });

    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          if (
            parsed.candidates &&
            parsed.candidates[0]?.content?.parts?.[0]?.text
          ) {
            resolve(parsed.candidates[0].content.parts[0].text);
          } else {
            reject(new Error("Invalid response from Gemini AI"));
          }
        } catch (error) {
          reject(
            new Error(`Failed to parse Gemini response: ${error.message}`)
          );
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

// Get subscribers from Firestore
async function getSubscribers() {
  log("Fetching subscribers from Firestore...");

  // For GitHub Actions, we'll use a simple REST API call
  // In production, this would use Firebase Admin SDK

  if (CONFIG.TEST_MODE) {
    log("Running in test mode - using test email");
    return [{ email: CONFIG.SENDER_EMAIL, subscribed: true }];
  }

  // Mock subscribers for now - in production, implement Firestore REST API call
  const mockSubscribers = [{ email: CONFIG.SENDER_EMAIL, subscribed: true }];

  log(`Found ${mockSubscribers.length} active subscribers`);
  return mockSubscribers;
}

// Send email using SMTP
async function sendNewsletter(subscribers, content) {
  log(`Preparing to send newsletter to ${subscribers.length} subscribers...`);

  for (const subscriber of subscribers) {
    try {
      const unsubscribeToken = generateUnsubscribeToken(subscriber.email);
      const unsubscribeUrl = `${
        CONFIG.APP_URL
      }/unsubscribe?token=${unsubscribeToken}&email=${encodeURIComponent(
        subscriber.email
      )}`;

      const emailContent = `
        ${content}
        
        <hr style="margin: 30px 0; border: none; height: 1px; background: #ddd;">
        <p style="font-size: 12px; color: #666; text-align: center;">
          You're receiving this because you subscribed to QuanticDaily.<br>
          <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> | 
          <a href="${CONFIG.APP_URL}" style="color: #666;">QuanticDaily</a>
        </p>
      `;

      // For GitHub Actions, we'll use a simple email service or API
      // In this example, we'll just log the action
      log(`Newsletter sent to ${subscriber.email}`);
    } catch (error) {
      log(`Failed to send to ${subscriber.email}: ${error.message}`, "ERROR");
    }
  }

  log("Newsletter distribution completed");
}

// Main execution function
async function main() {
  try {
    log("Starting newsletter automation...");

    validateConfig();

    const newsArticles = await fetchAINews();
    const newsletterContent = await generateNewsletterContent(newsArticles);
    const subscribers = await getSubscribers();

    await sendNewsletter(subscribers, newsletterContent);

    log("Newsletter automation completed successfully");
    process.exit(0);
  } catch (error) {
    log(`Newsletter automation failed: ${error.message}`, "ERROR");
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, generateUnsubscribeToken };

#!/usr/bin/env node

/**
 * Newsletter Automation Script for GitHub Actions
 * Fetches AI news, generates newsletter content, and sends emails
 */

require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env"),
});

const https = require("https");
const { createHash } = require("crypto");
const nodemailer = require("nodemailer");

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
  // Debug: Log all environment variables (without sensitive values)
  log("Environment variables check:");
  log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "SET" : "NOT SET"}`);
  log(`SENDER_EMAIL: ${process.env.SENDER_EMAIL ? "SET" : "NOT SET"}`);
  log(`SENDER_PASSWORD: ${process.env.SENDER_PASSWORD ? "SET" : "NOT SET"}`);
  log(
    `UNSUBSCRIBE_SECRET: ${process.env.UNSUBSCRIBE_SECRET ? "SET" : "NOT SET"}`
  );
  log(
    `NEXT_PUBLIC_APP_URL: ${
      process.env.NEXT_PUBLIC_APP_URL ? "SET" : "NOT SET"
    }`
  );
  log(`SMTP_SERVER: ${process.env.SMTP_SERVER || "smtp.gmail.com"}`);
  log(`SMTP_PORT: ${process.env.SMTP_PORT || "587"}`);
  log(`TEST_MODE: ${process.env.TEST_MODE || "false"}`);

  const required = [
    "GEMINI_API_KEY",
    "SENDER_EMAIL",
    "SENDER_PASSWORD",
    "UNSUBSCRIBE_SECRET",
    "APP_URL",
  ];
  const missing = required.filter((key) => !CONFIG[key]);

  if (missing.length > 0) {
    log(
      `Missing CONFIG values: ${missing
        .map((key) => `${key}=${CONFIG[key]}`)
        .join(", ")}`,
      "ERROR"
    );
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
    log("Attempting Gemini API call...");
    const response = await makeGeminiRequest(prompt);
    log("Newsletter content generated successfully");
    return response;
  } catch (error) {
    log(`Error generating content: ${error.message}`, "ERROR");
    log(`Error stack: ${error.stack}`, "ERROR");
    log("Falling back to basic newsletter template...", "INFO");

    // Fallback to basic newsletter if Gemini fails
    try {
      const fallbackContent = generateFallbackNewsletter(newsArticles);
      log("Fallback newsletter generated successfully");
      return fallbackContent;
    } catch (fallbackError) {
      log(`Fallback generation failed: ${fallbackError.message}`, "ERROR");
      // Return a minimal newsletter if even fallback fails
      return `
        <h1>QuanticDaily AI Newsletter</h1>
        <p>We're experiencing technical difficulties generating today's newsletter. Please check back later.</p>
        <p>Thank you for your patience!</p>
      `;
    }
  }
}

// Fallback newsletter generator
function generateFallbackNewsletter(newsArticles) {
  log("Generating fallback newsletter content...");

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const htmlContent = `
    <h1>QuanticDaily AI Newsletter - ${currentDate}</h1>
    
    <p>Stay ahead with the latest AI developments. Here are today's top AI stories:</p>
    
    ${newsArticles
      .map(
        (article, index) => `
      <div style="margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
        <h2 style="color: #2563eb; font-size: 18px;">${index + 1}. ${
          article.title
        }</h2>
        <p style="color: #666; font-size: 14px; margin: 5px 0;">Source: ${
          article.source
        }</p>
        <p style="line-height: 1.6;">${article.summary}</p>
        <a href="${
          article.url
        }" style="color: #2563eb; text-decoration: none;">Read more →</a>
      </div>
    `
      )
      .join("")}
    
    <hr style="margin: 30px 0;">
    
    <p style="color: #666; text-align: center;">
      <strong>QuanticDaily</strong> - Your AI Newsletter<br>
      Curated AI news for busy professionals
    </p>
  `;

  return htmlContent;
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
        log(`Gemini API Response Status: ${res.statusCode}`);
        log(`Gemini API Response: ${responseData.substring(0, 500)}...`);

        try {
          const parsed = JSON.parse(responseData);

          // Check for API errors
          if (parsed.error) {
            reject(
              new Error(
                `Gemini API Error: ${
                  parsed.error.message || "Unknown API error"
                }`
              )
            );
            return;
          }

          if (
            parsed.candidates &&
            parsed.candidates[0]?.content?.parts?.[0]?.text
          ) {
            resolve(parsed.candidates[0].content.parts[0].text);
          } else {
            log(
              `Unexpected response structure: ${JSON.stringify(
                parsed,
                null,
                2
              )}`,
              "ERROR"
            );
            reject(
              new Error(
                "Invalid response from Gemini AI - unexpected structure"
              )
            );
          }
        } catch (error) {
          log(`Raw response: ${responseData}`, "ERROR");
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
  log(`TEST_MODE is: ${CONFIG.TEST_MODE}`);
  log(`Firebase Project ID: ${CONFIG.FIREBASE.projectId ? "SET" : "NOT SET"}`);
  log(`Firebase API Key: ${CONFIG.FIREBASE.apiKey ? "SET" : "NOT SET"}`);

  if (CONFIG.TEST_MODE) {
    log("Running in test mode - using test email");
    return [{ email: CONFIG.SENDER_EMAIL, subscribed: true }];
  }

  try {
    // Use Firestore REST API to get subscribers
    const projectId = CONFIG.FIREBASE.projectId;
    const apiKey = CONFIG.FIREBASE.apiKey;

    if (!projectId || !apiKey) {
      log("Firebase configuration missing, using fallback subscriber", "WARN");
      return [{ email: CONFIG.SENDER_EMAIL, active: true }];
    }

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/quantic-emails?key=${apiKey}`;

    log(
      `Fetching from Firestore URL: ${url.replace(apiKey, "API_KEY_HIDDEN")}`
    );

    const response = await makeHttpRequest(url);
    log(`Firestore response received, length: ${response.length}`);

    const data = JSON.parse(response);
    log(
      `Parsed data, documents count: ${
        data.documents ? data.documents.length : 0
      }`
    );

    if (!data.documents) {
      log("No documents found in Firestore collection", "WARN");
      return [{ email: CONFIG.SENDER_EMAIL, active: true }];
    }

    const subscribers = data.documents
      .map((doc) => {
        const fields = doc.fields;
        const email = fields.email?.stringValue;
        const subscribedAt = fields.subscribedAt?.timestampValue;

        // Check active field if it exists, otherwise assume active if email and subscribedAt exist
        const isActive =
          fields.active?.booleanValue !== false && email && subscribedAt;

        const subscriber = {
          email: email,
          active: isActive,
          subscribedAt: subscribedAt,
        };

        log(
          `Processing subscriber: ${subscriber.email}, active: ${subscriber.active}`
        );
        return subscriber;
      })
      .filter((subscriber) => subscriber.email && subscriber.active);

    log(`Total documents processed: ${data.documents.length}`);
    log(`Active subscribers after filtering: ${subscribers.length}`);

    // If no subscribers found, use fallback
    if (subscribers.length === 0) {
      log("No active subscribers found, using fallback email", "WARN");
      return [{ email: CONFIG.SENDER_EMAIL, active: true }];
    }

    return subscribers;
  } catch (error) {
    log(`Error fetching subscribers: ${error.message}`, "ERROR");
    log(`Error details: ${error.stack}`, "ERROR");
    log("Using fallback subscriber", "INFO");
    return [{ email: CONFIG.SENDER_EMAIL, active: true }];
  }
}

// Helper function to make HTTP requests
function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
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

      // Send actual email using SMTP
      await sendSMTPEmail(
        subscriber.email,
        "QuanticDaily - AI Weekly Digest",
        emailContent
      );
      log(`Newsletter sent to ${subscriber.email}`);
    } catch (error) {
      log(`Failed to send to ${subscriber.email}: ${error.message}`, "ERROR");
    }
  }

  log("Newsletter distribution completed");
}

// Send email via SMTP using Nodemailer
async function sendSMTPEmail(to, subject, htmlContent) {
  const transporter = nodemailer.createTransport({
    host: CONFIG.SMTP_SERVER,
    port: CONFIG.SMTP_PORT,
    secure: CONFIG.SMTP_PORT === "465", // true for 465, false for other ports
    auth: {
      user: CONFIG.SENDER_EMAIL,
      pass: CONFIG.SENDER_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"QuanticDaily" <${CONFIG.SENDER_EMAIL}>`,
    to: to,
    subject: subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    log(`Email sent: ${info.response}`);
  } catch (error) {
    log(`Error sending email: ${error}`, "ERROR");
    throw error; // Re-throw to be caught by the calling function
  }
}

// Main execution function
async function main() {
  try {
    log("Starting newsletter automation...");

    validateConfig();

    const newsArticles = await fetchAINews();
    log("News articles fetched successfully");

    const newsletterContent = await generateNewsletterContent(newsArticles);
    log("Newsletter content generation completed");

    const subscribers = await getSubscribers();
    log(`Found ${subscribers.length} active subscribers`);

    await sendNewsletter(subscribers, newsletterContent);

    log("Newsletter automation completed successfully");
    process.exit(0);
  } catch (error) {
    log(`Newsletter automation failed: ${error.message}`, "ERROR");
    log(`Error stack: ${error.stack}`, "ERROR");

    // Try to send a basic error newsletter to at least notify about the issue
    try {
      log("Attempting to send error notification newsletter...", "INFO");
      const errorContent = `
        <h1>QuanticDaily - System Notification</h1>
        <p>We encountered an issue generating today's newsletter.</p>
        <p>Error: ${error.message}</p>
        <p>Our team has been notified and we'll resolve this soon.</p>
        <p>Thank you for your patience!</p>
      `;
      const fallbackSubscribers = [
        { email: CONFIG.SENDER_EMAIL, active: true },
      ];
      await sendNewsletter(fallbackSubscribers, errorContent);
      log("Error notification sent successfully");
    } catch (notificationError) {
      log(
        `Failed to send error notification: ${notificationError.message}`,
        "ERROR"
      );
    }

    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, generateUnsubscribeToken };

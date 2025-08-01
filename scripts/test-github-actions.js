#!/usr/bin/env node

/**
 * Test GitHub Actions Workflow Locally
 * This script simulates the GitHub Actions environment to test the newsletter automation
 */

const https = require("https");
const { createHash } = require("crypto");
const nodemailer = require("nodemailer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { CONFIG, log } = require("./config");

// --- Utility Functions ---

function generateUnsubscribeToken(email) {
  const secret = CONFIG.UNSUBSCRIBE_SECRET || "test-secret-key-for-development";
  return createHash("sha256")
    .update(email + secret)
    .digest("hex");
}

// --- Data Fetching ---

async function fetchAINews() {
  log("Fetching AI news using Python scraper...");
  return new Promise((resolve, reject) => {
    const pythonCommand = "python";
    exec(
      `${pythonCommand} scripts/news_scraper.py --quiet`,
      (error, stdout, stderr) => {
        if (error) {
          log(`Scraper error: ${error.message}`, "ERROR");
          log(`Scraper stderr: ${stderr}`, "ERROR");
          return reject(new Error(`Failed to execute news scraper.`));
        }
        try {
          let jsonText = stdout.trim();
          const arrayStart = jsonText.indexOf("[");
          const arrayEnd = jsonText.lastIndexOf("]");
          if (arrayStart === -1 || arrayEnd === -1) {
            throw new Error("No JSON array found in scraper output.");
          }
          jsonText = jsonText.substring(arrayStart, arrayEnd + 1);
          const articles = JSON.parse(jsonText);
          log(`Successfully scraped ${articles.length} articles.`);
          resolve(articles);
        } catch (parseError) {
          log(
            `Error parsing JSON from scraper: ${parseError.message}`,
            "ERROR"
          );
          log(`Raw stdout: ${stdout}`, "DEBUG");
          reject(new Error("Failed to parse news articles from scraper."));
        }
      }
    );
  });
}

async function getSubscribers() {
  log("Fetching subscribers from Firestore...");
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.FIREBASE.projectId}/databases/(default)/documents/quantic-emails?key=${CONFIG.FIREBASE.apiKey}`;
    const response = await makeHttpRequest(url);
    const documents = JSON.parse(response).documents || [];
    const subscribers = documents
      .map((doc) => doc.fields)
      .filter((sub) => sub.active && sub.active.booleanValue)
      .map((sub) => ({ email: sub.email.stringValue }));

    if (subscribers.length === 0) {
      log("No active subscribers found.", "WARN");
      return [];
    }

    log(`Found ${subscribers.length} active subscribers.`);
    return subscribers;
  } catch (error) {
    log(`Failed to fetch subscribers: ${error.message}`, "ERROR");
    return [];
  }
}

// --- Content Generation ---

async function generateNewsletterContent(newsArticles) {
  log("Generating newsletter content with Gemini AI...");
  const prompt = `Based on these articles, create content for the QuanticDaily AI newsletter:

${newsArticles
  .map(
    (article, i) =>
      `${i + 1}. ${article.title}: ${
        article.summary || article.excerpt || "No summary available"
      }`
  )
  .join("\n")}

Provide a JSON object with the following keys:
- "subject": A catchy, professional subject line (under 15 words).
- "introduction": A brief, engaging intro paragraph (2-3 sentences).
- "conclusion": A short concluding paragraph with a positive outlook (2 sentences).

Do not include the articles themselves in the response. The output must be only the JSON object.`;

  try {
    const response = await makeGeminiRequest(prompt);
    // Clean up the response to ensure it's valid JSON
    const jsonString = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const content = JSON.parse(jsonString);
    log("Successfully generated newsletter content from Gemini.");
    // Attach the original articles for use in the template
    content.articles = newsArticles;
    return content;
  } catch (error) {
    log(`Gemini content generation failed: ${error.message}`, "ERROR");
    log("Falling back to simple content generation.", "WARN");
    return generateFallbackNewsletter(newsArticles);
  }
}

function generateFallbackNewsletter(newsArticles) {
  return {
    subject: "QuanticDaily - AI Weekly Digest",
    introduction:
      "Welcome to QuanticDaily! Here are the top AI stories of the week, curated just for you.",
    conclusion:
      "Stay informed on the latest in AI technology and innovation. We'll see you next week!",
    articles: newsArticles,
  };
}

// --- Email Sending (Test Mode) ---

async function sendTestNewsletter(subscribers, content) {
  log(
    `🧪 TEST MODE: Would send newsletter to ${subscribers.length} subscribers...`
  );
  const templatePath = path.join(__dirname, "email-template.html");
  const subject = content.subject || "QuanticDaily - AI Weekly Digest";

  try {
    const htmlTemplate = fs.readFileSync(templatePath, "utf-8");

    // In test mode, only send to the first subscriber
    const testSubscriber = subscribers[0];
    if (!testSubscriber) {
      log("⚠️ No subscribers to test with", "WARN");
      return { successCount: 0, failureCount: 0 };
    }

    const unsubscribeToken = generateUnsubscribeToken(testSubscriber.email);
    const unsubscribeUrl = `${
      CONFIG.APP_URL
    }/unsubscribe?token=${unsubscribeToken}&email=${encodeURIComponent(
      testSubscriber.email
    )}`;

    const articlesHtml = content.articles
      .map(
        (article) => `
      <div class="article">
        <h2><a href="${article.url}">${article.title}</a></h2>
        <p>${
          article.summary ||
          article.excerpt ||
          "Read the full article for more details."
        }</p>
        <a href="${
          article.url
        }" target="_blank" class="read-more">Read More &rarr;</a>
      </div>`
      )
      .join("");

    let emailHtml = htmlTemplate
      .replace("{{INTRODUCTION}}", content.introduction)
      .replace("{{ARTICLES}}", articlesHtml)
      .replace("{{CONCLUSION}}", content.conclusion)
      .replace("{{UNSUBSCRIBE_URL}}", unsubscribeUrl)
      .replace("{{APP_URL}}", CONFIG.APP_URL);

    await sendSMTPEmail(testSubscriber.email, subject, emailHtml);
    log(`✅ Test newsletter sent successfully to ${testSubscriber.email}`);
    return { successCount: 1, failureCount: 0 };
  } catch (error) {
    log(`❌ Failed to send test newsletter: ${error.message}`, "ERROR");
    return { successCount: 0, failureCount: 1 };
  }
}

async function sendSMTPEmail(to, subject, htmlContent) {
  const transporter = nodemailer.createTransport({
    host: CONFIG.SMTP_SERVER,
    port: CONFIG.SMTP_PORT,
    secure: CONFIG.SMTP_PORT === 465 || CONFIG.SMTP_PORT === "465",
    auth: {
      user: CONFIG.SENDER_EMAIL,
      pass: CONFIG.SENDER_PASSWORD,
    },
  });

  const logoPath = path.join(__dirname, "..", "public", "logo.png");

  const mailOptions = {
    from: `"QuanticDaily" <${CONFIG.SENDER_EMAIL}>`,
    to: to,
    subject: subject,
    html: htmlContent,
    attachments: [
      {
        filename: "logo.png",
        path: logoPath,
        cid: "logo", // same cid value as in the HTML img src
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    log(`Email sent: ${info.response}`);
  } catch (error) {
    log(`Error sending email via SMTP: ${error}`, "ERROR");
    throw error;
  }
}

// --- Main Execution ---

async function main() {
  let exitCode = 0;
  try {
    log("🧪 Starting GitHub Actions workflow test...");

    // Set default values for missing environment variables
    if (!CONFIG.UNSUBSCRIBE_SECRET) {
      CONFIG.UNSUBSCRIBE_SECRET = "test-secret-key-for-development";
      log("⚠️ Using default UNSUBSCRIBE_SECRET for testing", "WARN");
    }
    if (!CONFIG.APP_URL) {
      CONFIG.APP_URL = "https://quanticdaily.vercel.app";
      log("⚠️ Using default APP_URL for testing", "WARN");
    }

    log("📰 Fetching AI news...");
    const newsArticles = await fetchAINews();

    if (!newsArticles || newsArticles.length === 0) {
      throw new Error("No news articles were fetched. Cannot send newsletter.");
    }

    log("👥 Fetching subscribers...");
    const subscribers = await getSubscribers();

    if (subscribers.length === 0) {
      log("⚠️ No active subscribers found. Newsletter not sent.", "WARN");
      return;
    }

    log("✍️ Generating newsletter content...");
    const newsletterContent = await generateNewsletterContent(newsArticles);

    log("📧 Sending test newsletter...");
    const result = await sendTestNewsletter(subscribers, newsletterContent);

    log("✅ GitHub Actions workflow test completed successfully!");
    log(
      `📊 Results: ${result.successCount} successful, ${result.failureCount} failed`
    );
  } catch (error) {
    log(
      `
--- GITHUB ACTIONS TEST FAILED ---
`,
      "ERROR"
    );
    log(`Error: ${error.message}`, "ERROR");
    log(`Stack Trace: ${error.stack}`, "ERROR");
    exitCode = 1;
  } finally {
    log(`
--- GITHUB ACTIONS TEST FINISHED ---`);
    log(`Exiting with code ${exitCode}.`);
    process.exit(exitCode);
  }
}

// --- Helpers ---

function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", (error) => reject(error));
    req.end();
  });
}

function makeGeminiRequest(prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = CONFIG.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const data = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };

    const req = https.request(url, options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(responseData);
            const text = parsed.candidates[0].content.parts[0].text;
            resolve(text);
          } catch (e) {
            reject(new Error(`Failed to parse Gemini response: ${e.message}`));
          }
        } else {
          reject(
            new Error(`Gemini API error ${res.statusCode}: ${responseData}`)
          );
        }
      });
    });
    req.on("error", (e) => reject(new Error(`Request failed: ${e.message}`)));
    req.write(data);
    req.end();
  });
}

if (require.main === module) {
  main();
}

module.exports = { main, generateUnsubscribeToken };

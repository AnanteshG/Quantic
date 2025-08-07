#!/usr/bin/env node

/**
 * Newsletter Automation Script for GitHub Actions
 * Fetches AI news, generates newsletter content, and sends emails using a template.
 */

const https = require("https");
const { createHash } = require("crypto");
const nodemailer = require("nodemailer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { CONFIG, log, validateConfig } = require("./config");

// --- Utility Functions ---

function generateUnsubscribeToken(email) {
  const secret = CONFIG.UNSUBSCRIBE_SECRET;
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
      log("No active subscribers found, using fallback email.", "WARN");
      return [{ email: CONFIG.SENDER_EMAIL }];
    }
    return subscribers;
  } catch (error) {
    log(`Failed to fetch subscribers: ${error.message}`, "ERROR");
    log("Using fallback subscriber.", "INFO");
    return [{ email: CONFIG.SENDER_EMAIL }];
  }
}

// --- Content Generation ---

async function generateNewsletterContent(newsArticles) {
  log("Generating newsletter content with Gemini AI...");
  const prompt = `Based on these articles, create content for the QuanticDaily AI newsletter:

${newsArticles
  .map((article, i) => `${i + 1}. ${article.title}: ${article.summary}`)
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
    introduction: "Here are the top AI stories of the week:",
    conclusion: "Stay informed on the latest in AI!",
    articles: newsArticles,
  };
}

// --- Email Sending ---

async function sendNewsletter(subscribers, content) {
  log(`Preparing to send newsletter to ${subscribers.length} subscribers...`);
  const templatePath = path.join(__dirname, "email-template.html");
  const subject = content.subject || "QuanticDaily - AI Weekly Digest";

  try {
    const htmlTemplate = fs.readFileSync(templatePath, "utf-8");

    for (const subscriber of subscribers) {
      try {
        const unsubscribeToken = generateUnsubscribeToken(subscriber.email);
        const unsubscribeUrl = `${
          CONFIG.APP_URL
        }/unsubscribe?token=${unsubscribeToken}&email=${encodeURIComponent(
          subscriber.email
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

        await sendSMTPEmail(subscriber.email, subject, emailHtml);
        log(`Newsletter sent to ${subscriber.email}`);
      } catch (error) {
        log(`Failed to send to ${subscriber.email}: ${error.message}`, "ERROR");
      }
    }
    log("Newsletter distribution completed.");
  } catch (error) {
    log(`Failed to read email template: ${error.message}`, "ERROR");
    throw error; // Propagate error to main handler
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
    log("Starting newsletter automation...");
    validateConfig();

    const newsArticles = await fetchAINews();

    // Don't send newsletter if no real articles are available
    if (!newsArticles || newsArticles.length === 0) {
      log(
        "No real AI news articles found. Skipping newsletter send to avoid sending empty content.",
        "WARN"
      );
      log("Newsletter automation completed - no content to send.");
      return;
    }

    log(
      `Found ${newsArticles.length} real AI news articles. Proceeding with newsletter generation.`
    );

    const newsletterContent = await generateNewsletterContent(newsArticles);
    const subscribers = await getSubscribers();

    await sendNewsletter(subscribers, newsletterContent);

    log("Newsletter automation completed successfully.");
  } catch (error) {
    log(
      `
--- SCRIPT FAILED ---
`,
      "ERROR"
    );
    log(`Error: ${error.message}`, "ERROR");
    log(`Stack Trace: ${error.stack}`, "ERROR");
    await sendErrorNotification(error);
    exitCode = 1;
  } finally {
    log(`
--- SCRIPT FINISHED ---`);
    log(`Exiting with code ${exitCode}.`);
    process.exit(exitCode);
  }
}

async function sendErrorNotification(error) {
  try {
    log("Attempting to send error notification...", "INFO");
    const errorContent = `<h1>QuanticDaily - System Alert</h1><p>The newsletter automation failed.</p><p><b>Error:</b> ${error.message}</p><p>Please check the logs for more details.</p>`;
    await sendSMTPEmail(
      CONFIG.SENDER_EMAIL,
      "CRITICAL: Newsletter Automation Failed",
      errorContent
    );
    log("Error notification sent successfully.");
  } catch (notificationError) {
    log(
      `Failed to send error notification: ${notificationError.message}`,
      "ERROR"
    );
  }
}

// --- Helpers & Entrypoint ---

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

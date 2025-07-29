#!/usr/bin/env node

/**
 * Newsletter automation script for QuanticDaily
 * This script handles the scheduling and execution of weekly newsletters
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

class NewsletterScheduler {
  constructor() {
    this.scriptPath = path.join(__dirname, "newsletter_generator.py");
    this.logFile = path.join(__dirname, "..", "newsletter.log");
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    console.log(message);

    // Append to log file
    fs.appendFileSync(this.logFile, logMessage);
  }

  async runNewsletterGeneration() {
    return new Promise((resolve, reject) => {
      this.log("Starting newsletter generation...");

      const pythonProcess = spawn("python", [this.scriptPath], {
        cwd: path.dirname(this.scriptPath),
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data) => {
        const output = data.toString();
        stdout += output;
        this.log(`Python stdout: ${output.trim()}`);
      });

      pythonProcess.stderr.on("data", (data) => {
        const output = data.toString();
        stderr += output;
        this.log(`Python stderr: ${output.trim()}`);
      });

      pythonProcess.on("close", (code) => {
        if (code === 0) {
          this.log("Newsletter generation completed successfully");
          resolve({ success: true, stdout, stderr });
        } else {
          this.log(`Newsletter generation failed with code ${code}`);
          reject({ success: false, code, stdout, stderr });
        }
      });

      pythonProcess.on("error", (error) => {
        this.log(`Error running newsletter generation: ${error.message}`);
        reject({ success: false, error: error.message });
      });
    });
  }

  async scheduleWeeklyNewsletter() {
    this.log("Setting up weekly newsletter schedule...");

    // Calculate next Monday at 9:00 AM
    const now = new Date();
    const nextMonday = new Date();

    // Find next Monday
    const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);

    // If it's already past 9 AM on Monday, schedule for next week
    if (now.getDay() === 1 && now.getHours() >= 9) {
      nextMonday.setDate(nextMonday.getDate() + 7);
    }

    const timeUntilNextRun = nextMonday.getTime() - now.getTime();

    this.log(`Next newsletter scheduled for: ${nextMonday.toLocaleString()}`);
    this.log(
      `Time until next run: ${Math.round(
        timeUntilNextRun / (1000 * 60 * 60)
      )} hours`
    );

    // Schedule the newsletter
    setTimeout(async () => {
      try {
        await this.runNewsletterGeneration();

        // Schedule the next one (in 7 days)
        setTimeout(
          () => this.scheduleWeeklyNewsletter(),
          7 * 24 * 60 * 60 * 1000
        );
      } catch (error) {
        this.log(`Newsletter generation failed: ${JSON.stringify(error)}`);

        // Retry in 1 hour
        setTimeout(() => this.scheduleWeeklyNewsletter(), 60 * 60 * 1000);
      }
    }, timeUntilNextRun);
  }

  async runNow() {
    this.log("Running newsletter generation immediately...");
    try {
      const result = await this.runNewsletterGeneration();
      this.log("Newsletter generation completed");
      return result;
    } catch (error) {
      this.log(`Newsletter generation failed: ${JSON.stringify(error)}`);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const scheduler = new NewsletterScheduler();

  const command = process.argv[2];

  switch (command) {
    case "run":
      try {
        await scheduler.runNow();
        process.exit(0);
      } catch (error) {
        process.exit(1);
      }
      break;

    case "schedule":
      scheduler.scheduleWeeklyNewsletter();
      scheduler.log("Newsletter scheduler is running. Press Ctrl+C to stop.");

      // Keep the process alive
      process.on("SIGINT", () => {
        scheduler.log("Newsletter scheduler stopped");
        process.exit(0);
      });
      break;

    case "test":
      scheduler.log("Testing newsletter generation (dry run)...");
      try {
        await scheduler.runNow();
        scheduler.log("Test completed successfully");
      } catch (error) {
        scheduler.log("Test failed");
      }
      break;

    default:
      console.log(`
QuanticDaily Newsletter Automation

Usage:
  node newsletter_scheduler.js run      - Run newsletter generation immediately
  node newsletter_scheduler.js schedule - Start weekly scheduling (runs continuously)
  node newsletter_scheduler.js test     - Test newsletter generation

Environment Variables Required:
  SENDER_EMAIL      - Email address to send from
  SENDER_PASSWORD   - Email password or app password
  SMTP_SERVER       - SMTP server (default: smtp.gmail.com)
  SMTP_PORT         - SMTP port (default: 587)
      `);
      process.exit(0);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { NewsletterScheduler };

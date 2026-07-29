const { exec } = require("child_process");
const path = require("path");

const { runUnstopIngestion } = require("./unstopIngestion");

async function refreshInternships() {
  console.log(`[Refresh] ${new Date().toISOString()} — Starting internship refresh`);

  // ---------------------------
  // 1. Run Unstop ingestion
  // ---------------------------
  try {
    await runUnstopIngestion();
    console.log("[Refresh] Unstop ingestion complete.");
  } catch (err) {
    console.error("[Refresh] Unstop ingestion failed:", err.message);
  }

  // ---------------------------
  // 2. Run Internshala scraper
  // ---------------------------
  await new Promise((resolve) => {
    const scriptPath = path.resolve(__dirname, "scrapers/internshala_scraper.py");

    const pythonCmd =
      process.platform === "win32" ? "python" : "python3";

    exec(
      `${pythonCmd} "${scriptPath}"`,
      { timeout: 5 * 60 * 1000 },
      (error, stdout, stderr) => {
        if (error) {
          if (
            error.code === 127 ||
            error.message.includes("not found")
          ) {
            console.warn(
              "[Refresh] Python not found. Skipping Internshala scraper."
            );
          } else {
            console.error(
              "[Refresh] Internshala scraper failed:",
              error.message
            );
          }

          return resolve();
        }

        if (stdout) console.log(stdout.trim());

        if (stderr) console.warn(stderr.trim());

        console.log("[Refresh] Internshala scrape complete.");

        resolve();
      }
    );
  });

  console.log("[Refresh] Internship refresh completed.");
}

module.exports = {
  refreshInternships,
};
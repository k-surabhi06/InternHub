const express = require("express");
const router = express.Router();

const { refreshInternships } = require("../../ingestion/refreshService");

router.post("/refresh", async (req, res) => {
  try {
    if (
      req.headers["x-trigger-secret"] !== process.env.TRIGGER_SECRET
    ) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    await refreshInternships();

    return res.json({
      success: true,
      message: "Internships refreshed successfully.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Refresh failed.",
    });
  }
});

module.exports = router;
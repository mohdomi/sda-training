const express = require("express");
const router = express.Router();
const { healthCheck, metrics } = require("../../../middleware/monitoring");
const { authenticate, authorize } = require("../../../middleware/auth");

// Public liveness probe — enriched with live stats from MonitoringService
router.get("/", healthCheck);

// Full per-route breakdown — admin only (could leak traffic patterns otherwise)
router.get("/metrics", authenticate, authorize("admin"), metrics);

module.exports = router;

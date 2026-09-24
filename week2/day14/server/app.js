const express = require("express");
const v1Router = require("./routes/api/v1");
const healthRoutes = require("./routes/api/v1/healthRoutes");
const { errorHandler } = require("./middleware/errorHandler");
const { monitoringMiddleware } = require("./middleware/monitoring");

const app = express();

app.use(express.json());
app.use(monitoringMiddleware);
app.use("/health", healthRoutes);
app.use("/api/v1", v1Router);
app.use(errorHandler);

module.exports = app;

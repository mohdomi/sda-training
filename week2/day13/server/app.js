const express = require("express");
const v1Router = require("./routes/api/v1");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use("/api/v1", v1Router);
app.use(errorHandler);

module.exports = app;

const http = require("http");

const req = http.get("http://localhost:3000/health", (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on("error", () => process.exit(1));
req.setTimeout(3000, () => {
  req.destroy();
  process.exit(1);
});

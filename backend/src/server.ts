import { createApp } from "./app.js";
import { parseTrustProxy } from "./config.js";

const port = Number(process.env.PORT ?? 3000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);

createApp({ corsOrigin, trustProxy }).listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

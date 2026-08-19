import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT || 3001);
const app = createApp();

app.listen(port, () => {
  console.log(`Ticket resolver API on http://localhost:${port} (AI_MODE=${process.env.AI_MODE || "demo"})`);
});

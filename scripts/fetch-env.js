import fs from "fs";
import path from "path";

const GIST_RAW_URL =
  "https://gist.githubusercontent.com/Dhruval7878/ac9880dda5eb555e0f5ff01a5231d2b4/raw/bcbe30ce2c9f1eea66b13b3f75971bdb20ea35a4/gistfile1.txt";
const envPath = path.resolve(".env");

if (fs.existsSync(envPath)) {
  console.log("✅ .env already exists, skipping fetch.");
  process.exit(0);
}

try {
  const res = await fetch(GIST_RAW_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const content = await res.text();
  fs.writeFileSync(envPath, content);
  console.log("✅ .env fetched and written from gist.");
} catch (err) {
  console.error("❌ Could not fetch .env:", err.message);
  console.error("Fallback: copy .env.example to .env and fill manually.");
}

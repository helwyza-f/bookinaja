import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const mode = (process.argv[2] || "").trim().toLowerCase();
const rootDir = resolve(import.meta.dirname, "..");

const fileMap = {
  local: ".env.local.template",
  development: ".env.local.template",
  dev: ".env.local.template",
  prod: ".env.prod.template",
  production: ".env.prod.template",
};

const sourceName = fileMap[mode];

if (!sourceName) {
  console.error("Unknown env mode. Use: local or prod");
  process.exit(1);
}

const sourcePath = resolve(rootDir, sourceName);
const targetPath = resolve(rootDir, ".env");

if (!existsSync(sourcePath)) {
  console.error(`Env source not found: ${sourceName}`);
  process.exit(1);
}

copyFileSync(sourcePath, targetPath);
const envContent = readFileSync(targetPath, "utf8");
const lines = Object.fromEntries(
  envContent
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

console.log(`Active env: ${sourceName} -> .env`);
console.log(`API URL: ${lines.EXPO_PUBLIC_API_URL || "-"}`);
console.log(`ANDROID API URL: ${lines.EXPO_PUBLIC_API_URL_ANDROID || "-"}`);
console.log(`WEB URL: ${lines.EXPO_PUBLIC_WEB_URL || "-"}`);

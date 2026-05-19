import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const appRoot = path.join(projectRoot, "app");
const outputDir = path.join(projectRoot, ".expo", "types");
const require = createRequire(import.meta.url);

process.env.EXPO_ROUTER_APP_ROOT = appRoot;

const requireContext =
  require("expo-router/build/testing-library/require-context-ponyfill").default;
const { EXPO_ROUTER_CTX_IGNORE } = require("expo-router/_ctx-shared");
const { getTypedRoutesDeclarationFile } = require("expo-router/build/typed-routes/generate");

fs.mkdirSync(outputDir, { recursive: true });

const ctx = requireContext(appRoot, true, EXPO_ROUTER_CTX_IGNORE);
const file = getTypedRoutesDeclarationFile(ctx, {});

if (!file) {
  throw new Error("Failed to generate Expo Router typed routes");
}

fs.writeFileSync(path.join(outputDir, "router.d.ts"), file);
console.log("Expo Router typed routes synced.");

import { mkdirSync, copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = join(__dirname, "..", "src", "data");
const destination = join(__dirname, "..", "dist", "data");

mkdirSync(destination, { recursive: true });

const files = [
  "inventory.json",
  "vendors.json",
  "recipes.json",
  "policies.json"
];

for (const file of files) {
  const src = join(source, file);
  const dest = join(destination, file);

  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`Copied ${file}`);
  } else {
    console.log(`Missing ${file}`);
  }
}

console.log("Asset copy completed.");
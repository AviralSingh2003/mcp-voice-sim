// Copy the built bundles into a consuming project, recording the source version.
// Usage: node vendor.mjs ../saathi/web/vendor
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("usage: node vendor.mjs <target-dir>");
  process.exit(1);
}
mkdirSync(target, { recursive: true });
for (const file of ["mcp-voice-sim.js", "card-runtime.js"]) {
  copyFileSync(join("dist", file), join(target, file));
}
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
let commit = "uncommitted";
try {
  commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {
  /* not a git checkout */
}
writeFileSync(
  join(target, "VERSION"),
  `mcp-voice-sim ${pkg.version} (${commit})\nBuilt bundles copied by vendor.mjs. Do not edit by hand.\n`,
);
console.log(`vendored mcp-voice-sim ${pkg.version} (${commit}) -> ${target}`);

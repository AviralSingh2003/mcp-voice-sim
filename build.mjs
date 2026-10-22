import { build } from "esbuild";

await build({
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/mcp-voice-sim.js",
  legalComments: "eof",
});

await build({
  entryPoints: ["src/card-runtime.js"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  outfile: "dist/card-runtime.js",
  legalComments: "eof",
});

console.log("built dist/mcp-voice-sim.js and dist/card-runtime.js");

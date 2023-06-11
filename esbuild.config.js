const esbuild = require("esbuild");

const isProduction = process.env.NODE_ENV === "production";

let sharedConfig = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/change.js",
  loader: { ".ts": "ts" },
  target: "es2020",
};

if (isProduction) {
  sharedConfig = { ...sharedConfig, minify: true };
} else {
  sharedConfig = { ...sharedConfig, sourcemap: true };
}

async function start() {
  const ctx = await esbuild.context(sharedConfig);

  if (!isProduction) {
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    await ctx.build();
  }
}

start();

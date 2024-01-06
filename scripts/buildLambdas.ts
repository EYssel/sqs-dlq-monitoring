import * as esbuild from "esbuild";
import * as path from "path";

const lambdaPaths = ["lambda/slackListener/", "lambda/googleListener/"];

async function buildLambdas() {
  for (const lambdaPath of lambdaPaths) {
    let pathTs = path.join(`src/${lambdaPath}`, "index.ts");
    let pathJs = path.join(`lib/${lambdaPath}`, "index.js");

    await esbuild.build({
      platform: "node",
      target: ["esnext"],
      minify: true,
      bundle: true,
      keepNames: true,
      sourcemap: "linked",
      sourcesContent: false,
      entryPoints: [pathTs],
      outfile: pathJs,
      external: [""],
      logLevel: "warning",
      metafile: true,
    });
  }
}

buildLambdas();

import { build } from "esbuild";
import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });
await build({
  entryPoints: ["src/app.ts", "src/model.ts", "src/catalog.ts"],
  outdir: "dist/assets",
  bundle: false,
  format: "esm",
  target: "es2022",
  minify: false,
  sourcemap: true,
});
await cp("index.html", "dist/index.html");
await cp("styles.css", "dist/assets/styles.css");
await cp("assets", "dist/assets", { recursive: true });
await writeFile("dist/.nojekyll", "");
const bundle = await build({
  entryPoints: ["src/app.ts"],
  bundle: true,
  format: "iife",
  target: "es2022",
  write: false,
  minify: true,
});
const css = await readFile("styles.css", "utf8");
let offline = await readFile("index.html", "utf8");
const assets = {};
for (const name of [
  "hero.jpg",
  ...Array.from(
    { length: 8 },
    (_, i) => `product-${String(i + 1).padStart(2, "0")}.jpg`,
  ),
]) {
  assets[`assets/${name}`] =
    `data:image/jpeg;base64,${(await readFile(`assets/${name}`)).toString("base64")}`;
}
offline = offline.replace(
  /<link\b[^>]*href="assets\/styles\.css"[^>]*>/,
  `<style>${css}</style>`,
);
offline = offline.replace(
  '<script type="module" src="assets/app.js"></script>',
  `<script>window.__DEMO_ASSETS__=${JSON.stringify(assets)};<\/script><script>${bundle.outputFiles[0].text.replaceAll("</script", "<\\/script")}<\/script>`,
);
if (offline.includes('href="assets/styles.css"') || offline.includes('src="assets/app.js"')) {
  throw new Error('Offline artifact still references an external build file.');
}
await writeFile("review.html", offline);
console.log("Built dist/ and self-contained review.html");

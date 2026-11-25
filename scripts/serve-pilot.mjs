import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const dist = resolve(root, "dist");
const upstream = new URL(
  process.env.APPAREL_API_BASE_URL || "http://localhost:8091",
);
if (
  upstream.protocol !== "http:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(upstream.hostname) ||
  upstream.username ||
  upstream.password ||
  upstream.pathname !== "/" ||
  upstream.search ||
  upstream.hash
)
  throw new Error(
    "APPAREL_API_BASE_URL must be a local http origin, for example http://localhost:8091",
  );
const port = Number(process.env.APPAREL_PORT || 5175);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".json": "application/json",
};
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/media/")) {
    // Preserve the browser Host and Origin pair; cookies and CSRF stay same-origin.
    const destination = new URL(upstream);
    destination.pathname = url.pathname;
    destination.search = url.search;
    const proxy = http.request(
      destination,
      { method: req.method, headers: req.headers },
      (r) => {
        res.writeHead(r.statusCode || 502, {
          ...r.headers,
          "cache-control": "no-store",
        });
        r.pipe(res);
      },
    );
    proxy.on("error", () => {
      if (!res.headersSent)
        res.writeHead(503, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        });
      res.end(
        JSON.stringify({
          code: "E0503",
          message: "本機後端尚未連線，請確認服務已啟動。",
          data: null,
          timestamp: new Date(Date.now() + 8 * 3600_000)
            .toISOString()
            .replace("Z", "+08:00"),
        }),
      );
    });
    proxy.setTimeout(15000, () => proxy.destroy(new Error("upstream timeout")));
    req.pipe(proxy);
    return;
  }
  try {
    const decoded = decodeURIComponent(url.pathname);
    const review = decoded === "/review.html";
    const file = review
      ? resolve(root, "review.html")
      : resolve(dist, `.${decoded === "/" ? "/index.html" : decoded}`);
    if (
      (!review && !file.startsWith(dist + sep)) ||
      !(await stat(file)).isFile()
    )
      throw new Error("not found");
    let data = await readFile(file);
    if (
      !review &&
      (decoded === "/" || decoded === "/index.html") &&
      url.searchParams.get("mode") !== "demo"
    ) {
      const html = data
        .toString()
        .replace(
          '<script type="module" src="assets/app.js"></script>',
          '<script>window.__APPAREL_PILOT_API_BASE__="/api/v1";</script><script type="module" src="assets/app.js"></script>',
        );
      data = Buffer.from(html);
    }
    res.writeHead(200, {
      "content-type": mime[extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("找不到檔案");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Local pilot http://localhost:${port}/ -> ${upstream.origin}\nDemo remains http://localhost:${port}/?mode=demo and /review.html`,
  ),
);

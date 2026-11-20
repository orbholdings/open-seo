// Test-only crawl origin. Returns two known HTML pages and never connects
// to a network target. The production gateway has its own transport tests.
import { createServer } from "node:http";

const catalog = new Map([
  [
    "/",
    '<title>Sample shop</title><h1>Products</h1><a href="/contact">Contact</a>',
  ],
  ["/contact", "<h1>Contact us</h1><p>Our shop opens at nine.</p>"],
]);

createServer((request, response) => {
  let url;
  try {
    url = new URL(request.headers["x-crawl-url"]);
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (url.origin !== "https://catalog.example.com") {
    response.writeHead(403).end();
    return;
  }
  if (url.pathname === "/robots.txt") {
    response
      .writeHead(200, { "Content-Type": "text/plain" })
      .end("User-agent: *\nAllow: /\n");
    return;
  }
  const page = catalog.get(url.pathname);
  if (!page) {
    response.writeHead(404).end();
    return;
  }
  response
    .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    .end("<!doctype html><html><body>" + page + "</body></html>");
}).listen(
  Number(process.env.FIXTURE_PORT ?? 8090),
  process.env.FIXTURE_HOST ?? "0.0.0.0",
);

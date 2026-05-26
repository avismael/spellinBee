const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT || 4173);
const root = __dirname;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function safePath(urlPath) {
  const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
  const resolved = path.normalize(path.join(root, decodeURIComponent(requestedPath)));
  return resolved.startsWith(root) ? resolved : path.join(root, "index.html");
}

const server = http.createServer((request, response) => {
  const filePath = safePath(new URL(request.url, `http://${request.headers.host}`).pathname);
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "text/plain; charset=utf-8" });
    response.end(content);
  });
});

server.listen(port, () => {
  console.log(`Spelling Bee INSE running at http://localhost:${port}`);
});

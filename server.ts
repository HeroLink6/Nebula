const fastify = require("fastify");
const fastifyStatic = require("@fastify/static");
const { fileURLToPath } = require("url");
const path = require("path");
const fs = require("fs");
const { createBareServer } = require("@nebula-services/bare-server-node");
const { createServer } = require("http");
const cookieParser = require("@fastify/cookie");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bare = createBareServer("/bare/");
const rh = require("rammerhead/src/server/index.js").default();

const failureFile = fs.readFileSync("Checkfailed.html", "utf8");

const LICENSE_SERVER_URL = "https://license.mercurywork.shop/validate?license=";

const rammerheadScopes = [
  "/rammerhead.js",
  "/hammerhead.js",
  "/transport-worker.js",
  "/task.js",
  "/iframe-task.js",
  "/worker-hammerhead.js",
  "/messaging",
  "/sessionexists",
  "/deletesession",
  "/newsession",
  "/editsession",
  "/needpassword",
  "/syncLocalStorage",
  "/api/shuffleDict",
  "/mainport"
];

const rammerheadSession = /^\/[a-z0-9]{32}/;

function shouldRouteRh(req) {
  const url = new URL(req.url, "http://0.0.0.0");
  return (
    rammerheadScopes.includes(url.pathname) ||
    rammerheadSession.test(url.pathname)
  );
}

function routeRhRequest(req, res) {
  rh.emit("request", req, res);
}

function routeRhUpgrade(req, socket, head) {
  rh.emit("upgrade", req, socket, head);
}

const serverFactory = (handler, opts) => {
  return createServer()
    .on("request", (req, res) => {
      if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
      } else if (shouldRouteRh(req)) {
        routeRhRequest(req, res);
      } else {
        handler(req, res);
      }
    })
    .on("upgrade", (req, socket, head) => {
      if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
      } else if (shouldRouteRh(req)) {
        routeRhUpgrade(req, socket, head);
      }
    });
};

const app = fastify({ logger: true, serverFactory });

app.register(cookieParser);
app.register(require("@fastify/compress"));

// Uncomment if you wish to add masqr.
/* app.addHook("preHandler", async (req, reply) => {
    // ... (unchanged)
}); */

app.register(fastifyStatic, {
  root: path.join(__dirname, "dist"),
  prefix: "/",
  serve: true,
  wildcard: false
});

app.get("/search=:query", async (req, res) => {
  const { query } = req.params; // Define the type for req.params

  const response = await fetch(
    `http://api.duckduckgo.com/ac?q=${query}&format=json`
  ).then((apiRes) => apiRes.json());

  res.send(response);
});

app.setNotFoundHandler((req, res) => {
  res.sendFile("index.html"); // SPA catch-all
});

app.listen({
  port: 8080
});


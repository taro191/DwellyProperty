// Startup file for Plesk Node.js (Phusion Passenger) or any host that runs `node app.js`.
// Requires `npm run build` first. Passenger supplies the port; elsewhere PORT or 3000 is used.
const { createServer } = require("node:http");
const next = require("next");

const port = Number(process.env.PORT) || 3000;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`Dwelly ready on port ${port}`);
  });
});

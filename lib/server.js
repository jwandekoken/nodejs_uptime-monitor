/*
  Server related tasks
*/

// dependencies
const http = require("http");
const https = require("https");
const { StringDecoder } = require("string_decoder");
const fs = require("fs");
const path = require("path");
const util = require("util");
const debug = util.debuglog("server");

const config = require("./config");
const handlers = require("./handlers");
const helpers = require("./helpers");

// instantiate the server module object
const server = {};

// instantiate the HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// instantiate the HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, "../https/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "../https/cert.pem")),
};
server.httpsServer = https.createServer(
  server.httpsServerOptions,
  (req, res) => {
    server.unifiedServer(req, res, true);
  }
);

// all the server logic for both the http and https server
server.unifiedServer = function (req, res, https = false) {
  const protocol = !https ? `http` : `https`;
  const port = !https ? config.httpPort : config.httpsPort;
  const domain = `${protocol}://${config.domainWithoutPort}:${port}`;

  // get the URL and parse it
  const parsedUrl = new URL(req.url, domain);

  // get the path
  const path = parsedUrl.pathname;
  // removing the "/" at the beginning or end of the path
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  // get the query string as an object
  const queryStringObject = Object.fromEntries(parsedUrl.searchParams);

  // get the http method
  const method = req.method.toLowerCase();

  // get the headers as an object
  const headers = req.headers;

  // get the payload, if any
  const decoder = new StringDecoder("utf8");
  let buffer = "";
  // nodejs deals with streams of data, this is, it receives the data in a stream of data (not all at once), so, as this data is streaming in, the request object emits the "data" event, which we are listening for, and sends it (to the callback we passed to the event) a bunch of undecoded data, which we know should be on the utf8 format, so we decode it using our decoder, and append the result to the buffer we created
  req.on("data", function (chunk) {
    buffer += decoder.write(chunk);
  });
  req.on("end", function () {
    buffer += decoder.end();

    // choose the handler this request should go to. If one is not found, use the notFound handler
    let chosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;

    // construct the data obj to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: buffer.length > 0 ? helpers.parseJsonToObject(buffer) : buffer,
    };

    // if the request is within the public directory, use the public handler instead
    chosenHandler =
      trimmedPath.indexOf("public/") > -1 ? handlers.public : chosenHandler;

    // route the request to the handlers specified in the router
    chosenHandler(data, function (statusCode, payload, contentType) {
      // determine the type of response (fallback to JSON)
      contentType = typeof contentType == "string" ? contentType : "json";

      // use the status code called back by the handler, or defaul to 200
      statusCode = typeof statusCode == "number" ? statusCode : 200;

      // return the response parts that are content-specific
      let payloadString = "";
      if (contentType == "json") {
        res.setHeader("Content-Type", "application/json");
        payload = typeof payload == "object" ? payload : {};
        payloadString = JSON.stringify(payload);
      }

      if (contentType == "html") {
        res.setHeader("Content-Type", "text/html");
        payloadString = typeof payload == "string" ? payload : "";
      }

      if (contentType == "favicon") {
        res.setHeader("Content-Type", "image/x-icon");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      if (contentType == "css") {
        res.setHeader("Content-Type", "text/css");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      if (contentType == "png") {
        res.setHeader("Content-Type", "image/png");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      if (contentType == "jpg") {
        res.setHeader("Content-Type", "image/jpeg");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      if (contentType == "plain") {
        res.setHeader("Content-Type", "text/plain");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      // return the response-parts that are common to all content-types
      res.writeHead(statusCode);
      res.end(payloadString);

      // if the response is 200, print green, otherwise, print red
      if (statusCode == 200) {
        debug(
          "\x1b[32m%s\x1b[0m",
          method.toUpperCase() + " /" + trimmedPath + " " + statusCode
        );
      } else {
        debug(
          "\x1b[31m%s\x1b[0m",
          method.toUpperCase() + " /" + trimmedPath + " " + statusCode
        );
      }
    });
  });
};

// define a request router
server.router = {
  "": handlers.index,
  "account/create": handlers.accountCreate,
  "account/edit": handlers.accountEdit,
  "account/deleted": handlers.accountDeleted,
  "session/create": handlers.sessionCreate,
  "session/deleted": handlers.sessionDeleted,
  "checks/all": handlers.checksList,
  "checks/create": handlers.checksCreate,
  "checks/edit": handlers.checksEdit,
  ping: handlers.ping,
  "api/users": handlers.users,
  "api/tokens": handlers.tokens,
  "api/checks": handlers.checks,
  "favicon.ico": handlers.favicon,
  public: handlers.public,
};

// init script
server.init = function () {
  // start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log(
      "\x1b[36m%s\x1b[0m",
      `Server listening on port ${config.httpPort}`
    );
  });

  // start the HTTPs server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(
      "\x1b[35m%s\x1b[0m",
      `Server listening on port ${config.httpsPort}`
    );
  });
};

// export the module
module.exports = server;

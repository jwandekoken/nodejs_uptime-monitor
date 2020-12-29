/*
  Primary file for the API
*/

// dependencies
const http = require("http");
const https = require("https");
const { StringDecoder } = require("string_decoder");
const fs = require("fs");

const config = require("./lib/config");
const handlers = require("./lib/handlers");
const helpers = require("./lib/helpers");

// instantiate the HTTP server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});
// start the HTTP server
httpServer.listen(config.httpPort, () => {
  console.log(`Server listening on port ${config.httpPort}`);
});

// instantiate the HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem"),
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res, true);
});
// start the HTTPS server
httpsServer.listen(config.httpsPort, () => {
  console.log(`Server listening on port ${config.httpsPort}`);
});

// all the server logic for both the http and https server
const unifiedServer = function (req, res, https = false) {
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
    const chosenHandler =
      typeof router[trimmedPath] !== "undefined"
        ? router[trimmedPath]
        : handlers.notFound;

    // construct the data obj to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: buffer.length > 0 ? helpers.parseJsonToObject(buffer) : buffer,
    };

    // route the request to the handlers specified in the router
    chosenHandler(data, function (statusCode, payload) {
      // use the status code called back by the handler, or defaul to 200
      statusCode = typeof statusCode == "number" ? statusCode : 200;

      // use the payload called back by the handler, or default to an empty obj
      payload = typeof payload == "object" ? payload : {};

      // convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // return the response
      // https://nodejs.org/api/http.html#http_response_setheader_name_value
      res.setHeader("Content-Type", "application/json");
      // https://nodejs.org/api/http.html#http_response_writehead_statuscode_statusmessage_headers
      res.writeHead(statusCode);
      res.end(payloadString);

      console.log("returning this response: ", statusCode, payloadString);
    });
  });
};

// define a request router
const router = {
  ping: handlers.ping,
  users: handlers.users,
};

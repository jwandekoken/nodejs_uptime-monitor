/*
  Primary file for the API
*/

// dependencies
// https://nodejs.org/api/http.html
const http = require("http");
// https://nodejs.org/api/url.html
//const url = require("url");

// the server should respond to all requests with a string
const server = http.createServer((req, res) => {
  // get the URL and parse it
  // url.parse is DEPRECATED. See below link
  // https://nodejs.org/api/url.html#url_url_parse_urlstring_parsequerystring_slashesdenotehost
  //let parsedUrl = url.parse(req.url, true);
  // insted, we have to use the WHATWG URL API.
  // https://nodejs.org/api/url.html#url_new_url_input_base
  const parsedUrl = new URL(req.url, "http://localhost:3000");
  console.log("parsedUrl: ", parsedUrl);

  // get the path
  const path = parsedUrl.pathname;
  // removing the "/" at the beginning or end of the path
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");
  console.log(trimmedPath);

  // send the response
  res.end("hello world\n");

  // log the request path
  console.log("Request received on path: " + trimmedPath);
});

// start the server, and have it listen on port 3000
server.listen(3000, () => {
  console.log("Server listening on port 3000");
});

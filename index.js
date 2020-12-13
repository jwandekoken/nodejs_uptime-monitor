/*
  Primary file for the API
*/

// dependencies
// https://nodejs.org/api/http.html
const http = require("http");
// https://nodejs.org/api/url.html
//const url = require("url");
const { StringDecoder } = require("string_decoder");

// the server should respond to all requests with a string
const server = http.createServer((req, res) => {
  // get the URL and parse it
  /*
    url.parse (which the instructor is using) is DEPRECATED. See below link
    https://nodejs.org/api/url.html#url_url_parse_urlstring_parsequerystring_slashesdenotehost
    let parsedUrl = url.parse(req.url, true);
    insted, we have to use the WHATWG URL API.
  https://nodejs.org/api/url.html#url_new_url_input_base
  */
  const parsedUrl = new URL(req.url, "http://localhost:3000");

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

    // send the response
    res.end("hello world\n");

    console.log(buffer);
  });
});

// start the server, and have it listen on port 3000
server.listen(3000, () => {
  console.log("Server listening on port 3000");
});

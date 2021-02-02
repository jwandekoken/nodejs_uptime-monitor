/*
  frontend logic for the application
*/

// container for the frontend application
const app = {};

// config
app.config = {
  sessionToken: false,
};

// AJAX Client (for the resful API)
app.client = {};

// interface for making API calls
app.client.request = (
  headers,
  path,
  method,
  queryStringObject,
  payload,
  cb
) => {
  // set defaults
  headers = typeof headers == "object" && headers !== null ? null : {};
  path = typeof path == "string" ? path : "/";
  method =
    typeof method == "string" &&
    ["POST", "GET", "PUT", "DELETE"].indexOf(method) > -1
      ? method.toUpperCase()
      : "GET";
  queryStringObject =
    typeof queryStringObject == "object" && queryStringObject !== null
      ? null
      : {};
  payload = typeof payload == "object" && payload !== null ? null : {};
  cb = typeof cb == "function" ? cb : false;

  // for each query string parameter sent, add it to the path
  let requestUrl = `${path}?`;
  let counter = 0;
  for (var queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      counter++;
      // if at least one query string parameter has already been added, prepend new ones with an ampersand
      if (counter > 1) {
        requestUrl += "&";
      }
      // add the key and value
      requestUrl += `${queryKey}=${queryStringObject[queryKey]}`;
    }
  }

  // form the http request as a JSON type
  const xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-Type", "application/json");

  // for each header sent, add it to the request
  for (var headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // if there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader("token", app.config.sessionToken.id);
  }

  // when the request comes back, handle the response
  xhr.onreadystatechange = () => {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      const statusCode = xhr.status;
      const reponseReturned = xhr.responseText;

      // callback if requested
      if (cb) {
        try {
          const parsedResponse = JSON.parse(reponseReturned);
          cb(statusCode, parsedResponse);
        } catch (error) {
          cb(statusCode, false);
        }
      }
    }
  };

  // send the payload as JSON
  const payloadString = JSON.stringify(payload);
  xhr.send(payloadString);
};

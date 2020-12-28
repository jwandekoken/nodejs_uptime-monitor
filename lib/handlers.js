/*
  Request handlers
*/

// dependencies
//

// define the handlers
const handlers = {};

// ping handler
handlers.ping = function (data, cb) {
  // callback a http status code
  cb(200);
};

// not found handlers
handlers.notFound = function (data, cb) {
  cb(404);
};

// export the module
module.exports = handlers;

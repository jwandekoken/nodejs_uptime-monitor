/*
  Primary file for the API
*/

// dependencies
const server = require("./lib/server");
const workers = require("./lib/workers");
const cli = require("./lib/cli");

// declare the app
const app = {};

// init function
app.init = function () {
  // start the server
  server.init();

  // start the workers
  workers.init();

  // start the CLI, but make sure it starts last
  setTimeout(() => {
    cli.init();
  }, 50);
};

// execute
app.init();

// export the app
module.exports = app;

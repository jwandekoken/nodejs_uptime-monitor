/*
 * CLI-Related Tasks
 *
 */

// Dependencies
const readline = require("readline");
const util = require("util");
const debug = util.debuglog("cli");
const events = require("events");
// in order to use events we actually have to extend our own class from the base class, and then instantiate it
class _event extends events {}
const e = new _event();

// instantiate the CLI module object
const cli = {};

// input processor
cli.processInput = (str) => {
  str = typeof str == "string" && str.trim().length > 0 ? str.trim() : false;

  // only process the input if the user actually wrote something. Otherwise ignore
  if (str) {
    // codify the unique strings that identify the unique questions allowed to be asked
    const uniqueInputs = [
      "man",
      "help",
      "exit",
      "stats",
      "list users",
      "more user info",
      "more check info",
      "list logs",
      "more log info",
    ];

    // go through the possible inputs, emit an event when a match is found
    let matchFound = false;
    let counter = 0;
    // tests whether at least one element in the array passes the test implemented by the provided function. It returns a Boolean value.
    uniqueInputs.some((input) => {
      if (str.toLowerCase().indexOf(input) > -1) {
        matchFound = true;
        // emit an event matching the unique input, and include the full string given by the user
        e.emit(input, str);
        return true;
      }
    });

    // if no match is found, tell the user to try again
    if (!matchFound) {
      console.log("Sorry, try again");
    }
  }
};

// init script
cli.init = () => {
  // send the start message to the console, in dark blue
  console.log("\x1b[34m%s\x1b[0m", `The CLI is running`);

  // start the interface (the prompt)
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  // create an initial prompt
  _interface.prompt();

  // handle each line of input separately
  // this gonna be emitted everytime the user write something and presses return/enter and send us a line they just wrote
  _interface.on("line", (str) => {
    // send to the input processor
    cli.processInput(str);

    // re-initialize the prompt afterwards
    _interface.prompt();
  });

  // if the user stops the CLI, kill the associated process
  _interface.on("close", () => {
    // https://nodejs.org/api/process.html#process_process_exit_code
    process.exit(0);
  });
};

// export the module
module.exports = cli;

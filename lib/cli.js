/*
 * CLI-Related Tasks
 *
 */

/*
 * Dependencies
 */
const readline = require('readline');
const util = require('util');
const debug = util.debuglog('cli');
const events = require('events');
// in order to use events we actually have to extend our own class from the base class, and then instantiate it
class _event extends events {}
const e = new _event();

/*
 * instantiate the CLI module object
 */
const cli = {};

/*
 * input handlers
 */
e.on('man', (str) => {
  cli.responders.help();
});

e.on('help', (str) => {
  cli.responders.help();
});

e.on('exit', (str) => {
  cli.responders.exit();
});

e.on('stats', (str) => {
  cli.responders.stats();
});

e.on('list users', (str) => {
  cli.responders.listUsers();
});

e.on('more user info', (str) => {
  cli.responders.moreUserInfo(str);
});

e.on('list checks', (str) => {
  cli.responders.listChecks(str);
});

e.on('more check info', (str) => {
  cli.responders.moreCheckInfo(str);
});

e.on('list logs', (str) => {
  cli.responders.listLogs();
});

e.on('more log info', (str) => {
  cli.responders.moreLogInfo(str);
});

/*
 * responders
 */
cli.responders = {};

// help/man responder
cli.responders.help = () => {
  const commands = {
    exit: 'Kill the CLI (and the rest of the application)',
    man: 'Show this help page',
    help: 'Alias of the "man" command',
    stats:
      'Get statistics on the underlying operating system and resource utilization',
    'list users':
      'Show a list of all the registered (undeleted users in the system)',
    'more user info --{userId}': 'Show details of a specific user',
    'list checks --up --down':
      'Show a list of all the active checks in the system, including their state. The "--up" and the "--down" flags are both optional',
    'more check info --{checkId}': 'Show details of a specified check',
    'list logs':
      'Show a list of all the files available to be read (compressed and uncompressed)',
    'more log info --{fileName}': 'Show details of a specified log file',
  };

  // Show a header for the help page that is as wide as the screen
  cli.horizontalLine();
  cli.centered('CLI MANUAL');
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Show each command, followed by its explanation, in white and yellow respectivelly
  for (let key in commands) {
    if (commands.hasOwnProperty(key)) {
      const value = commands[key];
      let line = `\x1b[33m${key}\x1b[0m`;
      const padding = 60 - line.length;
      for (i = 0; i < padding; i++) {
        line += ' ';
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  }

  cli.verticalSpace();

  // End with another horizontal line
  cli.horizontalLine();
};

// exit responder
cli.responders.exit = () => {
  process.exit(0);
};

// stats responder
cli.responders.stats = () => {
  console.log('You asked for stats');
};

// list users responder
cli.responders.listUsers = () => {
  console.log('You asked to list users');
};

// more user info responder
cli.responders.moreUserInfo = (str) => {
  console.log('You asked for more user info', str);
};

// list checks responder
cli.responders.listChecks = (str) => {
  console.log('You asked to list checks', str);
};

// more check info responder
cli.responders.moreCheckInfo = (str) => {
  console.log('You asked for more check info', str);
};

// list logs responder
cli.responders.listLogs = () => {
  console.log('You asked to list logs');
};

// more logs info responder
cli.responders.moreLogInfo = (str) => {
  console.log('You asked for more log info', str);
};

/*
 * CLI Output Display Functions
 */

// create a vertical space
cli.verticalSpace = (lines) => {
  lines = typeof lines == 'number' && lines > 0 ? lines : 1;
  for (i = 0; i < lines; i++) {
    console.log('');
  }
};

// create a horizontal line across the screen
cli.horizontalLine = () => {
  // get the available screen size
  const width = process.stdout.columns;

  let line = '';
  for (i = 0; i < width; i++) {
    line += '-';
  }
  console.log(line);
};

// create centered text on the screen
cli.centered = (str) => {
  str = typeof str == 'string' && str.trim().length > 0 ? str.trim() : '';

  // get the available screen size
  const width = process.stdout.columns;

  // calculate the left padding there should be
  const leftPadding = Math.floor((width - str.length) / 2);

  // put in left padded spaces before the string itself
  let line = '';
  for (i = 0; i < leftPadding; i++) {
    line += ' ';
  }
  line += str;
  console.log(line);
};

/*
 * input processor
 */
cli.processInput = (str) => {
  str = typeof str == 'string' && str.trim().length > 0 ? str.trim() : false;

  // only process the input if the user actually wrote something. Otherwise ignore
  if (str) {
    // codify the unique strings that identify the unique questions allowed to be asked
    const uniqueInputs = [
      'man',
      'help',
      'exit',
      'stats',
      'list users',
      'more user info',
      'list checks',
      'more check info',
      'list logs',
      'more log info',
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
      console.log('Sorry, try again');
    }
  }
};

/*
 * Init CLI
 */
cli.init = () => {
  // send the start message to the console, in dark blue
  console.log('\x1b[34m%s\x1b[0m', `The CLI is running`);

  // start the interface (the prompt)
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  // create an initial prompt
  _interface.prompt();

  // handle each line of input separately
  // this gonna be emitted everytime the user write something and presses return/enter and send us a line they just wrote
  _interface.on('line', (str) => {
    // send to the input processor
    cli.processInput(str);

    // re-initialize the prompt afterwards
    _interface.prompt();
  });

  // if the user stops the CLI, kill the associated process
  _interface.on('close', () => {
    // https://nodejs.org/api/process.html#process_process_exit_code
    process.exit(0);
  });
};

module.exports = cli;

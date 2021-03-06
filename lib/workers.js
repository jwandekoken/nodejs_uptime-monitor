/*
  Worker-related tasks
*/

// dependencies
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
//const url = require("url"); is deprecated
const util = require("util");
const debug = util.debuglog("workers");

const _data = require("./data");
const helpers = require("./helpers");
const _logs = require("./logs");

// instantiate the worker object
const workers = {};

// lookup all checks, get their data, send to a validator
workers.gatherAllChecks = function () {
  // get all the checks
  _data.list("checks", (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // read in the check data
        _data.read("checks", check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // pass it to the check validator, and let that function continue or log errors as needed
            workers.validateCheckData(originalCheckData);
          } else {
            debug("Error reading one of the check's data");
          }
        });
      });
    } else {
      debug("Error: Could not find any checks to process");
    }
  });
};

// sanity-check the check-data
workers.validateCheckData = function (originalCheckData) {
  originalCheckData =
    typeof originalCheckData == "object" && originalCheckData !== null
      ? originalCheckData
      : {};

  originalCheckData.id =
    typeof originalCheckData.id == "string" &&
    originalCheckData.id.trim().length == 20
      ? originalCheckData.id.trim()
      : false;

  originalCheckData.userPhone =
    typeof originalCheckData.userPhone == "string" &&
    originalCheckData.userPhone.trim().length == 10
      ? originalCheckData.userPhone.trim()
      : false;

  originalCheckData.protocol =
    typeof originalCheckData.protocol == "string" &&
    ["http", "https"].indexOf(originalCheckData.protocol) > -1
      ? originalCheckData.protocol
      : false;

  originalCheckData.url =
    typeof originalCheckData.url == "string" &&
    originalCheckData.url.trim().length > 0
      ? originalCheckData.url.trim()
      : false;

  originalCheckData.method =
    typeof originalCheckData.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(originalCheckData.method) > -1
      ? originalCheckData.method
      : false;

  originalCheckData.successCodes =
    typeof originalCheckData.successCodes == "object" &&
    originalCheckData.successCodes instanceof Array &&
    originalCheckData.successCodes.length > 0
      ? originalCheckData.successCodes
      : false;

  originalCheckData.timeoutSeconds =
    typeof originalCheckData.timeoutSeconds == "number" &&
    originalCheckData.timeoutSeconds % 1 === 0 &&
    originalCheckData.timeoutSeconds >= 1 &&
    originalCheckData.timeoutSeconds <= 5
      ? originalCheckData.timeoutSeconds
      : false;

  // set the keys that may not be set (if the workers have never seen this check before)
  originalCheckData.state =
    typeof originalCheckData.state == "string" &&
    ["up", "down"].indexOf(originalCheckData.state) > -1
      ? originalCheckData.state
      : "down";

  originalCheckData.lastChecked =
    typeof originalCheckData.lastChecked == "number" &&
    originalCheckData.lastChecked > 0
      ? originalCheckData.lastChecked
      : false;

  // if all the checks pass, pass the data along to the next step in the process
  if (
    originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds
  ) {
    workers.performCheck(originalCheckData);
  } else {
    debug("Error: One of the checks is not properly formatted. Skipping it.");
  }
};

// perform the check, send the originalCheckData and the outcome of the check process, to the next step in the process
workers.performCheck = function (originalCheckData) {
  // prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false,
  };

  // mark that the outcome has not been sent yet
  let outcomeSent = false;

  // parse the hostname and the path out of the original check data
  // THIS url API IS DEPRECATED
  /*const parsedUrlWithDeprecatedModule = url.parse(
    originalCheckData.protocol + "://" + originalCheckData.url,
    true
  );*/
  // use this one instead
  const parsedUrl = new URL(
    originalCheckData.protocol + "://" + originalCheckData.url
  );

  const hostName = parsedUrl.hostname;

  // we want the path, with the queryString/searchParams, equivalent to the deprecated urlObject.path (https://nodejs.org/api/url.html#url_urlobject_path)
  // https://nodejs.org/api/url.html#url_url_pathname
  // https://nodejs.org/api/url.html#url_url_searchparams
  const path = `${parsedUrl.pathname}${parsedUrl.searchParams}`;

  // construct the request
  const requestDetails = {
    protocol: originalCheckData.protocol + ":",
    hostname: hostName,
    method: originalCheckData.method.toUpperCase(),
    path: path,
    timeout: originalCheckData.timeoutSeconds * 1000,
  };

  // instantiate the request object (using either the http or http module)
  var _moduleToUse = originalCheckData.protocol == "http" ? http : https;
  var req = _moduleToUse.request(requestDetails, function (res) {
    // grab the status of the sent request
    const status = res.statusCode;

    // update the checkoutcome and pass the data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // bind to the error event so it doesn't get thrown
  req.on("error", (err) => {
    // update the checkoutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: err,
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // bind to the timeout event
  req.on("timeout", (err) => {
    // update the checkoutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: "timeout",
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // end the request (which is the same as sending the request)
  req.end();
};

// process the check outcome, update the check data as needed, trigger an alert if needed
// special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = function (originalCheckData, checkOutcome) {
  // decide if the check is considered up or down
  const state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? "up"
      : "down";

  // decide if an alert is warranted
  // we only wanna alert the user if the check state had changed, and only if there was a previous check done before (remember that the original state is 'down', so we have to check this)
  const alertWarranted =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;

  // log the outcome
  const timeOfCheck = Date.now();
  workers.log(
    originalCheckData,
    checkOutcome,
    state,
    alertWarranted,
    timeOfCheck
  );

  // update the check data
  const newCheckData = originalCheckData;
  originalCheckData.state = state;
  originalCheckData.lastChecked = timeOfCheck;

  // save the updates
  _data.update("checks", newCheckData.id, newCheckData, (err) => {
    if (!err) {
      // send the new check data to the next phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        debug("Check outcome has not changed, no alert needed");
      }
    } else {
      debug("Error trying to save updates to one of the checks");
    }
  });
};

// alert the user as to a change in their check status
workers.alertUserToStatusChange = function (newCheckData) {
  const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${
    newCheckData.protocol
  }://${newCheckData.url} is currently ${newCheckData.state}`;

  helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) => {
    if (!err) {
      debug(
        "Success: User was alerted to a status change in their check, via sms: ",
        msg
      );
    } else {
      debug("Twilio err: ", err);
      debug(
        "Error: Could not send sms alert to user who had a state change in their check"
      );
    }
  });
};

workers.log = function (
  originalCheckData,
  checkOutcome,
  state,
  alertWarranted,
  timeOfCheck
) {
  // form the log data
  const logData = {
    check: originalCheckData,
    outcome: checkOutcome,
    state: state,
    alert: alertWarranted,
    time: timeOfCheck,
  };

  // convert data to a string
  const logString = JSON.stringify(logData);

  // determine the name of the log file
  const logFileName = originalCheckData.id;

  // append the log string to the file
  _logs.append(logFileName, logString, function (err) {
    if (!err) {
      debug("Logging to file succeeded");
    } else {
      debug("loggin to file failed");
    }
  });
};

// timer to execute the worker-process once per minute
workers.loop = function () {
  setInterval(() => {
    workers.gatherAllChecks();
    // one minute
  }, 1000 * 60);
};

// Rotate (compress) the log files
workers.rotateLogs = function () {
  // list all the (non compressed) log files
  _logs.list(false, function (err, logs) {
    if (!err && logs && logs.length > 0) {
      logs.forEach(function (logName) {
        // compress the data to a different file
        const logId = logName.replace(".log", "");
        const newFileId = logId + "-" + Date.now();
        _logs.compress(logId, newFileId, function (err) {
          if (!err) {
            // truncate the log
            _logs.truncate(logId, function (err) {
              if (!err) {
                debug("Success truncating logFile");
              } else {
                debug("Error truncating logFile");
              }
            });
          } else {
            debug("Error compressing one of the log files", err);
          }
        });
      });
    } else {
      debug("Error: could not find any logs to rotate");
    }
  });
};

// timer to execute the log-rotation process once per day
workers.logRotationLoop = function () {
  setInterval(() => {
    workers.rotateLogs();
    // one day
  }, 1000 * 60 * 60 * 24);
};

// init script
workers.init = function () {
  // send to console, in yellow
  // the "\x1b[33m%s\x1b[0m" gonna tell node to put this console.log in yellow. The "%s" takes the string (in our case "Background workers are running"), and insert it inside the code
  console.log("\x1b[33m%s\x1b[0m", "Background workers are running");

  // execute all the checks immediately
  workers.gatherAllChecks();

  // call the loop so the checks will execute later on
  workers.loop();

  // compress all the logs immediately
  workers.rotateLogs();

  // call the compression loop so logs will be compressed later on
  workers.logRotationLoop();
};

// export the module
module.exports = workers;

/*
  Worker-related tasks
*/

// dependencies
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const url = require("url");

const _data = require("./data");
const helpers = require("./helpers");
const { worker } = require("cluster");

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
            console.log("Error reading one of the check's data");
          }
        });
      });
    } else {
      console.log("Error: Could not find any checks to process");
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
    console.log(
      "Error: One of the checks is not properly formatted. Skipping it."
    );
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

  console.log("requestDetails: ", requestDetails);

  // instantiate the request object (using either the http or http module)
  var _moduleToUse = originalCheckData.protocol == "http" ? http : https;
  var req = _moduleToUse.request(requestDetails, function (res) {
    // grab the status of the sent request
    const status = res.statusCode;

    console.log(originalCheckData.id + " request status: ", status);

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

  console.log(
    "indexOf:",
    originalCheckData.successCodes.indexOf(checkOutcome.responseCode)
  );
  console.log(originalCheckData.id + "state after outcome: ", state);

  // decide if an alert is warranted
  // we only wanna alert the user if the check state had changed, and only if there was a previous check done before (remember that the original state is 'down', so we have to check this)
  const alertWarranted =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;

  // update the check data
  const newCheckData = originalCheckData;
  originalCheckData.state = state;
  originalCheckData.lastChecked = Date.now();

  // save the updates
  _data.update("checks", newCheckData.id, newCheckData, (err) => {
    if (!err) {
      // send the new check data to the next phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log("Check outcome has not changed, no alert needed");
      }
    } else {
      console.log("Error trying to save updates to one of the checks");
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
      console.log(
        "Success: User was alerted to a status change in their check, via sms: ",
        msg
      );
    } else {
      console.log("Twilio err: ", err);
      console.log(
        "Error: Could not send sms alert to user who had a state change in their check"
      );
    }
  });
};

// timer to execute the worker-process once per minute
workers.loop = function () {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// init script
workers.init = function () {
  // execute all the checks immediately
  workers.gatherAllChecks();

  // call the loop so the checks will execute later on
  workers.loop();
};

// export the module
module.exports = workers;

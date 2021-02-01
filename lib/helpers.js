/*
  Helpers for various tasks
*/

// dependencies
const crypto = require("crypto");
const querystring = require("querystring");
const https = require("https");
const path = require("path");
const fs = require("fs");

const config = require("./config");

// container for all the helpers
const helpers = {};

// create a SHA256 hash
helpers.hash = function (str) {
  if (typeof str == "string" && str.length > 0) {
    // https://nodejs.org/api/crypto.html#crypto_crypto_createhmac_algorithm_key_options
    const hash = crypto
      .createHmac("sha256", config.hashingSecret)
      .update(str)
      .digest("hex");

    return hash;
  } else {
    return false;
  }
};

// parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function (str) {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (error) {
    console.log(error);
    return {};
  }
};

// create a string of random alphanumeric characters, of a given length
helpers.createRandomString = function (strLength) {
  strLength = typeof strLength == "number" && strLength > 0 ? strLength : false;

  if (strLength) {
    // define all the possible characters that could go into a string
    const possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";

    // start the final string
    let str = "";

    for (i = 1; i <= strLength; i++) {
      // get a random character from the possibleCharacters string
      // Math.random(): returns a floating-point, pseudo-random number in the range 0 to less than 1 (inclusive of 0, but not 1)
      // multiplying by the possibleCharacters.length we will get random numbers from 0 to the max length of the possibleCharacters string
      const randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );

      // append this character to the final string
      str += randomCharacter;
    }

    // return the final string
    return str;
  } else {
    return false;
  }
};

// Send an SMS message via Twilio
helpers.sendTwilioSms = function (phone, msg, cb) {
  // Validate parameters
  phone =
    typeof phone == "string" && phone.trim().length < 13 ? phone.trim() : false;
  msg =
    typeof msg == "string" && msg.trim().length > 0 && msg.trim().length <= 1600
      ? msg.trim()
      : false;

  if (phone && msg) {
    // Config the request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: "+55" + phone,
      Body: msg,
    };

    // stringify the payload
    const stringPayload = querystring.stringify(payload);

    // configure the request details
    const requestDetails = {
      protocol: "https:",
      hostname: "api.twilio.com",
      method: "POST",
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(stringPayload),
      },
    };

    // instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // grab the status of the sent request
      const status = res.statusCode;
      // callback successfully if the request went through
      if (status == 200 || status == 201) {
        cb(false);
      } else {
        cb("Status code returned was " + status);
      }
    });

    // bind to the error event so it doesn't get thrown
    req.on("error", (e) => {
      cb(e);
    });

    // add the payload
    req.write(stringPayload);

    // end the request (and send the request)
    req.end();
  } else {
    cb("Given parameters were missign or invalid");
  }
};

// get the string content of a template
helpers.getTemplate = function (templateName, data, cb) {
  templateName =
    typeof templateName == "string" && templateName.length > 0
      ? templateName
      : false;

  data = typeof data == "object" && data !== null ? data : {};

  if (templateName) {
    const templatesDir = path.join(__dirname, "/../templates/");
    fs.readFile(templatesDir + templateName + ".html", "utf8", (err, str) => {
      if (!err && str && str.length > 0) {
        // do interpolation on the string
        const finalString = helpers.interpolate(str, data);
        cb(false, finalString);
      } else {
        cb("No template could be found");
      }
    });
  } else {
    cb("A valid template name was not specified");
  }
};

// add the universal header and footer to a string, and pass provided data object to the header and footer for interpolation
helpers.addUniversalTemplates = function (str, data, cb) {
  str = typeof str == "string" && str.length > 0 ? str : "";
  data = typeof data == "object" && data !== null ? data : {};

  // get the header
  helpers.getTemplate("_header", data, (err, headerString) => {
    if (!err && headerString) {
      // get the footer
      helpers.getTemplate("_footer", data, (err, footerString) => {
        if (!err && footerString) {
          // add them all together
          const fullString = headerString + str + footerString;
          cb(false, fullString);
        } else {
          cb("Could not find the footer template");
        }
      });
    } else {
      cb("Could not find the header template");
    }
  });
};

// take a given string and a data object and find/replace all the keys within in it
helpers.interpolate = (str, data) => {
  str = typeof str == "string" && str.length > 0 ? str : "";
  data = typeof data == "object" && data !== null ? data : {};

  // add the templateGlobals to the data object, prepending their key name with "global"
  for (var keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data["global." + keyName] = config.templateGlobals[keyName];
    }
  }

  // for each key in the data object, insert its value into the string at the corresponding placeholder
  for (var key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] == "string") {
      var replace = data[key];
      var find = "{" + key + "}";
      str = str.replace(find, replace);
    }
  }
  return str;
};

// get the contents of a static (public) asset
helpers.getStaticAsset = function (fileName, cb) {
  fileName =
    typeof fileName == "string" && fileName.length > 0 ? fileName : false;
  if (fileName) {
    const publicDir = path.join(__dirname, "/../public/");
    fs.readFile(publicDir + fileName, (err, data) => {
      if (!err && data) {
        cb(false, data);
      } else {
        cb("No file could be found");
      }
    });
  } else {
    cb("A valid file name was not specified");
  }
};

// export the module
module.exports = helpers;

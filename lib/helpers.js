/*
  Helpers for various tasks
*/

// dependencies
const crypto = require("crypto");
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

// export the module
module.exports = helpers;
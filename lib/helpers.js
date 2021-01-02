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

// export the module
module.exports = helpers;

/*
  Request handlers
*/

// dependencies
const _data = require("./data");
const helpers = require("./helpers");

// define the handlers
const handlers = {};

// users
handlers.users = function (data, cb) {
  const acceptableMethods = ["post", "get", "put", "delete"];
  // check if the request method exists within the acceptableMethods arr
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, cb);
  } else {
    cb(405);
  }
};

// container for the users submethods
handlers._users = {};

// users - post
// required data: firstName, lastName, phone, password, tosAgreement
// optional data: none
handlers._users.post = function (data, cb) {
  // check that all required fields are filled out
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;

  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;

  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;

  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  const tosAgreement =
    typeof data.payload.tosAgreement == "boolean" &&
    data.payload.tosAgreement == true
      ? true
      : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // make sure that the user doesnt already exist
    // (the unique field is the 'phone')
    // if we get an error is because the user-file does not exist. This is what we want
    _data.read("users", phone, function (err, data) {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // create the user object
          const userObj = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement,
          };

          // store the user
          // each user gonna be stored as a file with the phone number as name, inside the '/users' folder
          _data.create("users", phone, userObj, function (err) {
            if (!err) {
              cb(200);
            } else {
              console.log(err);
              cb(500, { Error: "Could not create the new user" });
            }
          });
        } else {
          cb(500, { Error: "Could not hash the user's password" });
        }
      } else {
        // user already exists
        cb(400, { Error: "A user with that phone number already exists" });
      }
    });
  } else {
    cb(400, { Error: "Missing required fields" });
  }
};

// users - get
// required data: phone
// optional data: none
// @TODO only let an authenticated user access their object. Don't let them access anyone else's
handlers._users.get = function (data, cb) {
  // check that the phone number is valid
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
    // lookup the user
    _data.read("users", phone, function (err, userData) {
      if (!err && userData) {
        // remove the hashed password from the user object before returning it to the requester
        delete userData.hashedPassword;
        cb(200, userData);
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

// users - put
// required data: phone
// optional data: firstName, lastName, password (at least one must be specified)
// @TODO only let an authenticated user update their own object. Don't let them update anyone else's
handlers._users.put = function (data, cb) {
  // check for the required field
  const phone =
    typeof data.payload.phone == "string" && data.payload.phone.length == 10
      ? data.payload.phone
      : false;

  // check for the optional fields
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;

  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;

  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  // error if the phone is invalid
  if (phone) {
    // error if nothing is sent to update
    if (firstName || lastName || password) {
      // lookup the user
      _data.read("users", phone, function (err, userData) {
        if (!err && userData) {
          // update the fields necessary
          if (firstName) {
            userData.firstName = firstName;
          }

          if (lastName) {
            userData.lastName = lastName;
          }

          if (password) {
            userData.hashedPassword = helpers.hash(password);
          }

          // store the new updates
          _data.update("users", phone, userData, function (err) {
            if (!err) {
              cb(200);
            } else {
              console.log(err);
              cb(500, { Error: "Could not update the user" });
            }
          });
        } else {
          cb(400, { Error: "The specified user does not exist" });
        }
      });
    } else {
      cb(400, { Error: "Missing fields to update" });
    }
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

// users - delete
// required field: phone
// @TODO only let an authenticated user delete their object. Dont let them delete anyone else's
// @TODO cleanup (delete) any other data files associated with this user
handlers._users.delete = function (data, cb) {
  // check that the phone number is valid
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.length == 10
      ? data.queryStringObject.phone
      : false;

  if (phone) {
    // lookup the user
    _data.read("users", phone, function (err, userData) {
      if (!err && userData) {
        _data.delete("users", phone, function (err) {
          if (!err) {
            cb(200);
          } else {
            cb(500, { Error: "Could not delete the specified user" });
          }
        });
      } else {
        cb(400, { Error: "Could not find the specified user" });
      }
    });
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

// tokens
handlers.tokens = function (data, cb) {
  const acceptableMethods = ["post", "get", "put", "delete"];
  // check if the request method exists within the acceptableMethods arr
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, cb);
  } else {
    cb(405);
  }
};

// container for the tokens submethods
handlers._tokens = {};

// tokens - post
// required data: phone, password
// optional data: none
handlers._tokens.post = function (data, cb) {
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;

  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone && password) {
    // lookup the user who matches that phone number
    _data.read("users", phone, function (err, userData) {
      if (!err && userData) {
        // hash the sent password, and compare it to the password stored in the user object
        const hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword) {
          // if valid, create a new token with a random name. Set expiration date 1 hour in the future
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expires,
          };

          // store the token
          _data.create("tokens", tokenId, tokenObject, function (err) {
            if (!err) {
              cb(200, tokenObject);
            } else {
              cb(500, { Error: "Could not create the new token" });
            }
          });
        } else {
          cb(400, {
            Error:
              "Password did not match the specified user's stored password",
          });
        }
      } else {
        cb(400, { Error: "Could not find the specified user" });
      }
    });
  } else {
    cb(400, { Error: "Missing required fields" });
  }
};

// tokens - get
// required data: id
// optional data: none
handlers._tokens.get = function (data, cb) {
  // check that the phone number is valid
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // lookup the token
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        cb(200, tokenData);
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

// tokens - put
handlers._tokens.put = function (data, cb) {};

// tokens - delete
handlers._tokens.delete = function (data, cb) {};

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

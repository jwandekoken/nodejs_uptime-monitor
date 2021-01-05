/*
  Request handlers
*/

// dependencies
const config = require("./config");
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
handlers._users.get = function (data, cb) {
  // check that the phone number is valid
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
    // get the token from the headers
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    // verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
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
        cb(403, {
          Error: "Missing required token in header, or token is invalid",
        });
      }
    });
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

// users - put
// required data: phone
// optional data: firstName, lastName, password (at least one must be specified)
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
      // get the token from the headers
      const token =
        typeof data.headers.token == "string" ? data.headers.token : false;

      handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
        if (tokenIsValid) {
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
          cb(403, {
            Error: "Missing required token in header, or token is invalid",
          });
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
// @TODO cleanup (delete) any other data files associated with this user
handlers._users.delete = function (data, cb) {
  // check that the phone number is valid
  const phone =
    typeof data.queryStringObject.phone == "string" &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;

  if (phone) {
    // get the token from the headers
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
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
        cb(403, {
          Error: "Missing required token in header, or token is invalid",
        });
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
// required data: id, extend
// optional data: none
handlers._tokens.put = function (data, cb) {
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;

  const extend =
    typeof data.payload.extend == "boolean" && data.payload.extend == true
      ? true
      : false;

  if (id && extend) {
    // lookup the token
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        // Check to make sure the token isn't expired already
        if (tokenData.expires > Date.now()) {
          // set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          // store the new update
          _data.update("tokens", id, tokenData, function (err) {
            if (!err) {
              cb(200);
            } else {
              cb(500, { Error: "Could not update the token's expiration" });
            }
          });
        } else {
          cb(400, {
            Error: "Token has already expired, and cannot be extended",
          });
        }
      } else {
        cb(400, { Error: "Specified token does not exist" });
      }
    });
  } else {
    cb(400, { Error: "Missing required field(s) or field(s) are invalid" });
  }
};

// tokens - delete
// required data: id
// optional data: none
handlers._tokens.delete = function (data, cb) {
  // check that the id is valid
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // lookup the user
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        _data.delete("tokens", id, function (err) {
          if (!err) {
            cb(200);
          } else {
            cb(500, { Error: "Could not delete the specified token" });
          }
        });
      } else {
        cb(400, { Error: "Could not find the specified token" });
      }
    });
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

// verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function (id, phone, cb) {
  // lookup the token
  _data.read("tokens", id, function (err, tokenData) {
    if (!err && tokenData) {
      // check that the token is for the given user and has not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        cb(true);
      } else {
        cb(false);
      }
    } else {
      cb(false);
    }
  });
};

// checks
handlers.checks = function (data, cb) {
  const acceptableMethods = ["post", "get", "put", "delete"];
  // check if the request method exists within the acceptableMethods arr
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, cb);
  } else {
    cb(405);
  }
};

// container for the checks submethods
handlers._checks = {};

// checks - post
// required data: protocol, url, method, sucessCodes, timeoutSeconds
// optional data: none
handlers._checks.post = function (data, cb) {
  // validate inputs
  const protocol =
    typeof data.payload.protocol == "string" &&
    ["https", "http"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;

  const url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;

  const successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // get the token from the headers
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    // lookup the user by reading the token
    _data.read("tokens", token, function (err, tokenData) {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;

        // lookup the user data
        _data.read("users", userPhone, (err, userData) => {
          if (!err && userData) {
            const userChecks =
              typeof userData.checks == "object" &&
              userData.checks instanceof Array
                ? userData.checks
                : [];

            // verify that the user has less than the number of max-checks-per-user
            console.log(config);
            console.log(userChecks);
            if (userChecks.length < config.maxChecks) {
              // create a random id for the check
              const checkId = helpers.createRandomString(20);

              // create the check object, and include the user's phone
              const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds,
              };

              // save the object
              _data.create("checks", checkId, checkObject, (err) => {
                if (!err) {
                  // add the check if to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // save the new user data
                  _data.update("users", userPhone, userData, (err) => {
                    if (!err) {
                      // return the data about the new check
                      cb(200, checkObject);
                    } else {
                      cb(500, {
                        Error: "Could not update the user with the new check",
                      });
                    }
                  });
                } else {
                  cb(500, { Error: "Could not create the new check" });
                }
              });
            } else {
              cb(400, {
                Error: `The user already has the maximum number of checks (${config.maxChecks})`,
              });
            }
          } else {
            cb(403);
          }
        });
      } else {
        cb(403);
      }
    });
  } else {
    cb(400, { Error: "Missing required inputs, or inputs are invalid" });
  }
};

// checks - get
// required data: id
// optional data: none
handlers._checks.get = function (data, cb) {
  // check that the id is valid
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // lookup the check
    _data.read("checks", id, (err, checkData) => {
      if (!err && checkData) {
        // get the token from the headers
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;

        // verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          function (tokenIsValid) {
            if (tokenIsValid) {
              // return the checkData
              cb(200, checkData);
            } else {
              cb(403, {
                Error: "Missing required token in header, or token is invalid",
              });
            }
          }
        );
      } else {
        cb(404);
      }
    });
  } else {
    cb(400, { Error: "Missing required field" });
  }
};

// checks - put
// required data: id
// optional data: protocol, url, method, successCodes, timeoutSeconds (one must be sent)
handlers._checks.put = function (data, cb) {
  // check for the required field
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;

  // check for the optional fields
  const protocol =
    typeof data.payload.protocol == "string" &&
    ["https", "http"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;

  const url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;

  const successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;

  // check if id is valid
  if (id) {
    // check to make sure one or more optional fields has been sent
    if (protocol || url || method || successCodes || timeoutSeconds) {
      // lookup the check
      _data.read("checks", id, (err, checkData) => {
        if (!err && checkData) {
          const token =
            typeof data.headers.token == "string" ? data.headers.token : false;

          // verify that the given token is valid and belongs to the user who created the check
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone,
            function (tokenIsValid) {
              console.log(tokenIsValid);
              if (tokenIsValid) {
                // update the check where necessary
                if (protocol) {
                  checkData.protocol = protocol;
                }
                if (url) {
                  checkData.url = url;
                }
                if (method) {
                  checkData.method = method;
                }
                if (successCodes) {
                  checkData.successCodes = successCodes;
                }
                if (timeoutSeconds) {
                  checkData.timeoutSeconds = timeoutSeconds;
                }

                // store the new updates
                _data.update("checks", id, checkData, (err) => {
                  if (!err) {
                    cb(200);
                  } else {
                    cb(500, { Error: "Could not update the check" });
                  }
                });
              } else {
                cb(403, {
                  Error:
                    "Missing required token in header, or token is invalid",
                });
              }
            }
          );
        } else {
          cb(400, { Error: "Check ID did not exist" });
        }
      });
    } else {
      cb(400, { Error: "Missing fields to update" });
    }
  } else {
    cb(400, { Error: "Missing required fields" });
  }
};

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

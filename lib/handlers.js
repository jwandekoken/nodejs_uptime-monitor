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
handlers._users.get = function (data, cb) {};

// users - put
handlers._users.put = function (data, cb) {};

// users - delete
handlers._users.delete = function (data, cb) {};

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

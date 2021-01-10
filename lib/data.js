/*
    Library for storing and editing data
*/

// dependencies
const fs = require("fs");
const path = require("path");

const helpers = require("./helpers");

// container for the module (to be exported)
const lib = {};

// base directory of the data folder
lib.baseDir = path.join(__dirname, "/../.data/");

// write data to a file
lib.create = function (dir, file, data, cb) {
  // open the file for writing
  // https://nodejs.org/api/fs.html#fs_fs_open_path_flags_mode_callback
  // https://nodejs.org/api/fs.html#fs_file_system_flags
  // 'w': Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
  // 'wx': Like 'w' but fails if the path exists.
  fs.open(
    lib.baseDir + dir + "/" + file + ".json",
    "wx",
    function (err, fileDescriptor) {
      if (!err && fileDescriptor) {
        // convert data to string
        const stringData = JSON.stringify(data);

        // write to file and close it
        // https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback
        fs.writeFile(fileDescriptor, stringData, function (err) {
          if (!err) {
            // close the file
            fs.close(fileDescriptor, function (err) {
              if (!err) {
                // we are using the callback error pattern. So, if the cb gets called with false, this means that we have no error
                cb(false);
              } else {
                cb("Error closing the new file");
              }
            });
          } else {
            cb("Error writing to new file");
          }
        });
      } else {
        cb("Could not create new file, it may already exists");
      }
    }
  );
};

// read data from a file
lib.read = function (dir, file, cb) {
  // https://nodejs.org/api/fs.html#fs_fs_readfile_path_options_callback
  fs.readFile(
    lib.baseDir + dir + "/" + file + ".json",
    "utf8",
    function (err, data) {
      if (!err && data) {
        const parsedData = helpers.parseJsonToObject(data);
        cb(false, parsedData);
      } else {
        cb(err, data);
      }
    }
  );
};

// update data inside a file
lib.update = function (dir, file, data, cb) {
  // open the file for writing
  // https://nodejs.org/api/fs.html#fs_file_system_flags
  // 'r+': Open file for reading and writing. An exception occurs if the file does not exist.
  fs.open(
    lib.baseDir + dir + "/" + file + ".json",
    "r+",
    function (err, fileDescriptor) {
      if (!err && fileDescriptor) {
        // convert data to string
        const stringData = JSON.stringify(data);

        // truncate the file
        // https://nodejs.org/api/fs.html#fs_fs_truncate_path_len_callback
        // Passing a file descriptor is deprecated and may result in an error being thrown in the future. -> This is why i am passing the path
        fs.truncate(lib.baseDir + dir + "/" + file + ".json", function (err) {
          if (!err) {
            // write to the file and close it
            fs.writeFile(fileDescriptor, stringData, function (err) {
              if (!err) {
                fs.close(fileDescriptor, function (err) {
                  if (!err) {
                    cb(false);
                  } else {
                    cb("Error closing file");
                  }
                });
              } else {
                cb("Error writing to existing file");
              }
            });
          } else {
            cb("Error truncating file");
          }
        });
      } else {
        cb("Could not open the file for update, it may not exist yet");
      }
    }
  );
};

// delete a file
lib.delete = function (dir, file, cb) {
  // unlink the file
  fs.unlink(lib.baseDir + dir + "/" + file + ".json", function (err) {
    if (!err) {
      cb(false);
    } else {
      cb("Error deliting file");
    }
  });
};

// list all the items in a directory
lib.list = function (dir, cb) {
  // https://nodejs.org/api/fs.html#fs_fs_readdir_path_options_callback
  fs.readdir(lib.baseDir + dir + "/", (err, data) => {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach((filename) => {
        trimmedFileNames.push(filename.replace(".json", ""));
      });

      cb(false, trimmedFileNames);
    } else {
      cb(err, data);
    }
  });
};

// export the module
module.exports = lib;

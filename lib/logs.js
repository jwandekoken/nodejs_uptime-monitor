/*
  Library for storing and rotating logs
*/

// dependencies
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// container for the module
const lib = {};

// base directory of the logs folder
lib.baseDir = path.join(__dirname, "../.logs/");

// append a string to a file. Create the file if it does not exist
lib.append = function (file, str, cb) {
  // open the file for appending
  // https://nodejs.org/api/fs.html#fs_file_system_flags
  // 'a': Open file for appending. The file is created if it does not exist.
  fs.open(lib.baseDir + file + ".log", "a", function (err, fileDescriptor) {
    if (!err && fileDescriptor) {
      // append to the file and close it
      fs.appendFile(fileDescriptor, str + "\n", function (err) {
        if (!err) {
          fs.close(fileDescriptor, function (err) {
            if (!err) {
              cb(false);
            } else {
              cb("Error closing file that was being appended");
            }
          });
        } else {
          cb("Error appending to file");
        }
      });
    } else {
      cb("Could not open file for appending");
    }
  });
};

// list all the logs, and optionally include the compressed logs
lib.list = function (includeCompressedLogs, cb) {
  fs.readdir(lib.baseDir, function (err, data) {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach((fileName) => {
        // add the .log files
        if (fileName.indexOf(".log") > -1) {
          trimmedFileNames.push(fileName.replace(".log", ""));
        }

        // add on the .gz files
        if (fileName.indexOf(".gz.b64") > -1 && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace(".gz.b64", ""));
        }
      });

      cb(false, trimmedFileNames);
    } else {
      cb(err, data);
    }
  });
};

// compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = function (logId, newFileId, cb) {
  const sourceFile = logId + ".log";
  const destFile = newFileId + ".gz.b64";

  // read the source file
  fs.readFile(lib.baseDir + sourceFile, "utf8", (err, inputString) => {
    if (!err && inputString) {
      // compress the data using gzip
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // send the compressed data to the destination file
          // 'w+': Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
          // 'wx+': Like 'w+' but fails if the path exists.
          fs.open(lib.baseDir + destFile, "wx", (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              // write to the destination file
              fs.writeFile(fileDescriptor, buffer.toString("base64"), (err) => {
                if (!err) {
                  // close the destination file
                  fs.close(fileDescriptor, (err) => {
                    if (!err) {
                      cb(false);
                    } else {
                      cb(err);
                    }
                  });
                } else {
                  cb(err);
                }
              });
            } else {
              cb(err);
            }
          });
        } else {
          cb(err);
        }
      });
    } else {
      cb(err);
    }
  });
};

// decompress the contents of a .gz.b64 file into a string variable
lib.decompress = function (fileId, cb) {
  const fileName = fileId + ".gz.b64";
  fs.readFile(lib.baseDir + fileName, "utf8", (err, str) => {
    if (!err && str) {
      // decompress the data
      const inputBuffer = Buffer.from(str, "base64");
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (!err && outputBuffer) {
          // callback
          const str = outputBuffer.toString();
          cb(false, str);
        } else {
          cb(err);
        }
      });
    } else {
      cb(err);
    }
  });
};

// truncate a log file
lib.truncate = function (logId, cb) {
  fs.truncate(lib.baseDir + logId + ".log", 0, (err) => {
    if (!err) {
      cb(false);
    } else {
      cb(err);
    }
  });
};

// export the module
module.exports = lib;

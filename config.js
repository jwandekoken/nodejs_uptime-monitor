/*
  Create and export configuration variables
*/

const environments = {};

// staging (default) environment
environments.staging = {
  port: 3000,
  envName: "staging",
};

// production environment
environments.production = {
  port: 5000,
  envName: "production",
};

// determine which environment was passed as a command-line argument
const currentEnvironment =
  typeof process.env.NODE_ENV == "string"
    ? process.env.NODE_ENV.toLowerCase()
    : "";

// check that the current environment is one of the environments above, is not, default to staging
const environmentToExport =
  typeof environments[currentEnvironment] == "object"
    ? environments[currentEnvironment]
    : environments.staging;

// export the module
module.exports = environmentToExport;

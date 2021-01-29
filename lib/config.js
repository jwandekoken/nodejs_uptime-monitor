/*
  Create and export configuration variables
*/

const environments = {};

// staging (default) environment
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: "staging",
  domainWithoutPort: "localhost",
  hashingSecret: "thisIsASecret",
  maxChecks: 5,
  twilio: {
    accountSid: "ACa8328afe6443ad991f35e8b7909db166",
    authToken: "00b934c3a3734a48f39d948cae9db73a",
    fromPhone: "+15123593869",
  },
  templateGlobals: {
    appName: "UptimeChecker",
    companyName: "NotARealCompany, Inc",
    yearCreated: "2021",
    baseUrl: "http://localhost:3000/",
  },
};

// production environment
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: "production",
  domainWithoutPort: "localhost",
  hashingSecret: "thisIsASecret",
  maxChecks: 5,
  twilio: {
    accountSid: "ACa8328afe6443ad991f35e8b7909db166",
    authToken: "00b934c3a3734a48f39d948cae9db73a",
    fromPhone: "+15123593869",
  },
  templateGlobals: {
    appName: "UptimeChecker",
    companyName: "NotARealCompany, Inc",
    yearCreated: "2021",
    baseUrl: "http://localhost:5000/",
  },
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

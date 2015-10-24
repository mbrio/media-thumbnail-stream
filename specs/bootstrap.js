"use strict";

global.babel = require("babel/register")();
process.on('unhandledRejection', function unhandledRejection(reason, p) {
  throw reason;
});

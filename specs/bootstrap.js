"use strict";

global.babel = require("babel-register")({
  presets: ['es2015', 'stage-0']
});
process.on('unhandledRejection', function unhandledRejection(reason, p) {
  throw reason;
});

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var ScreenshotStream = (function () {
  function ScreenshotStream(options) {
    _classCallCheck(this, ScreenshotStream);
  }

  _createClass(ScreenshotStream, [{
    key: 'isReadableStream',
    value: function isReadableStream(input) {
      return input && typeof input._read === 'function';
    }
  }, {
    key: 'isWritableStream',
    value: function isWritableStream(output) {
      return output && typeof output._write === 'function';
    }
  }, {
    key: 'screenshot',
    value: function screenshot() {
      throw new Error("Not implemented");
    }
  }]);

  return ScreenshotStream;
})();

exports['default'] = ScreenshotStream;
module.exports = exports['default'];
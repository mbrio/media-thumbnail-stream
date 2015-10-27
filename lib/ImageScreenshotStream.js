'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _gm = require('gm');

var _gm2 = _interopRequireDefault(_gm);

var _ScreenshotStream2 = require('./ScreenshotStream');

var _ScreenshotStream3 = _interopRequireDefault(_ScreenshotStream2);

var ImageScreenshotStream = (function (_ScreenshotStream) {
  _inherits(ImageScreenshotStream, _ScreenshotStream);

  function ImageScreenshotStream() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, ImageScreenshotStream);

    _get(Object.getPrototypeOf(ImageScreenshotStream.prototype), 'constructor', this).call(this, options);

    this.options = options;
  }

  _createClass(ImageScreenshotStream, [{
    key: 'createImageProcessorInstance',
    value: function createImageProcessorInstance() {
      return _gm2['default'].subClass({ imageMagick: this.options.useImageMagick });
    }
  }, {
    key: 'validateOptionStreams',
    value: function validateOptionStreams(options) {
      if (!this.isReadableStream(options.input)) {
        return Promise.reject(new Error('You must specify a valid input stream.'));
      }

      if (!this.isWritableStream(options.output) && typeof options.callback !== 'function') {
        return Promise.reject(new Error('You must specify a valid output stream or callback.'));
      }

      return null;
    }
  }, {
    key: 'screenshot',
    value: function screenshot() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var errorPromise = this.validateOptionStreams(options);
      if (errorPromise) {
        return errorPromise;
      }

      var gm = this.createImageProcessorInstance();
      options.input.pause();

      return new Promise(function (resolve, reject) {
        var procClosed = false;
        var processExited = false;
        var exitError = null;
        var exitHandled = false;
        var outputStream = options.output;
        var dataWritten = false;

        function handleExit(err) {
          if (exitHandled) {
            return;
          }
          if (err) {
            exitError = err;
          }

          if (processExited && procClosed) {
            exitHandled = true;
            if (exitError) {
              reject(exitError);
            } else {
              resolve();
            }
          }
        }

        options.input.on('error', function (err) {
          if (outputStream) {
            outputStream.emit('error', err);
          }
          processExited = true;
          handleExit(err);
        });

        if (options.output) {
          options.output.on('error', function (err) {
            processExited = true;
            handleExit(err);
          });
          options.output.on('close', function () {
            setTimeout(function () {
              handleExit();
            }, 20);
          });
        }

        options.input.resume();

        var processor = gm(options.input);
        if (typeof options.configureImageProcessor === 'function') {
          processor = options.configureImageProcessor(processor);
        }

        processor.stream(function (err, innerStdout, innerStderr) {
          if (typeof options.callback === 'function') {
            outputStream = innerStdout;
          }

          innerStdout.on('error', function (err) {
            processExited = true;
            handleExit(err);
          });

          innerStdout.on('close', function () {
            procClosed = true;
            processExited = true;

            if (!dataWritten) {
              handleExit(new Error('Could not generate image thumbnail, file may not be supported'));
            } else {
              handleExit();
            }
          });

          innerStdout.on('data', function (chunk) {
            dataWritten = true;
          });

          if (typeof options.callback === 'function') {
            options.callback(innerStdout, innerStderr);
          } else {
            innerStdout.pipe(options.output);
          }
        });
      });
    }
  }]);

  return ImageScreenshotStream;
})(_ScreenshotStream3['default']);

exports['default'] = ImageScreenshotStream;
module.exports = exports['default'];
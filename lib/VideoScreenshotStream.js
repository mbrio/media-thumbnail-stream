'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x4, _x5, _x6) { var _again = true; _function: while (_again) { var object = _x4, property = _x5, receiver = _x6; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x4 = parent; _x5 = property; _x6 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _which = require('which');

var _which2 = _interopRequireDefault(_which);

var _ScreenshotStream = require('./ScreenshotStream');

var _ScreenshotStream2 = _interopRequireDefault(_ScreenshotStream);

var _ImageScreenshotStream2 = require('./ImageScreenshotStream');

var _ImageScreenshotStream3 = _interopRequireDefault(_ImageScreenshotStream2);

var _child_process = require('child_process');

function _findExecutableUsingWhich(file) {
  return new Promise(function (resolve, reject) {
    (0, _which2['default'])(file, function (err, filepath) {
      if (err) {
        return resolve();
      }
      resolve(filepath);
    });
  });
}

var VideoScreenshotStream = (function (_ImageScreenshotStream) {
  _inherits(VideoScreenshotStream, _ImageScreenshotStream);

  function VideoScreenshotStream() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, VideoScreenshotStream);

    _get(Object.getPrototypeOf(VideoScreenshotStream.prototype), 'constructor', this).call(this, options);
    this._cachedExecutable = null;
  }

  _createClass(VideoScreenshotStream, [{
    key: 'findExecutableUsingWhich',
    value: function findExecutableUsingWhich() {
      return _findExecutableUsingWhich('ffmpeg');
    }
  }, {
    key: 'findExecutableUsingOptions',
    value: function findExecutableUsingOptions() {
      var filepath = this.options.ffmpeg;

      if (filepath) {
        return _findExecutableUsingWhich(filepath);
      } else {
        return Promise.resolve();
      }
    }
  }, {
    key: 'findExecutableUsingEnvironment',
    value: function findExecutableUsingEnvironment() {
      var filepath = process.env.FFMPEG_PATH;

      if (filepath) {
        return _findExecutableUsingWhich(filepath);
      } else {
        return Promise.resolve();
      }
    }
  }, {
    key: 'findExecutable',
    value: function findExecutable() {
      var _this = this;

      if (this._cachedExecutable) {
        return Promise.resolve(this._cachedExecutable);
      }

      return Promise.all([this.findExecutableUsingOptions(), this.findExecutableUsingEnvironment(), this.findExecutableUsingWhich()]).then(function (values) {
        _this._cachedExecutable = values.find(function (item) {
          return item;
        });
        return Promise.resolve(_this._cachedExecutable);
      });
    }
  }, {
    key: 'screenshot',
    value: function screenshot() {
      var _this2 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var errorPromise = this.validateOptionStreams(options);
      if (errorPromise) {
        return errorPromise;
      }

      var imageStreamOptions = Object.create(options);
      var initialCallback = options.callback;
      var initialOutput = options.output;
      var exitError = null;
      var exitHandled = false;
      var videoDone = false;
      var photoDone = false;

      return new Promise(function (resolve, reject) {
        function handleExit(err) {
          if (exitHandled) {
            return;
          }
          if (err && !exitError) {
            exitError = err;
          }

          if (videoDone && photoDone) {
            exitHandled = true;
            if (exitError) {
              reject(exitError);
            } else {
              resolve();
            }
          }
        }

        options.callback = function (stdout, stderr) {
          imageStreamOptions.input = stdout;
          if (imageStreamOptions.output) {
            delete imageStreamOptions.output;
          }

          imageStreamOptions.callback = function (innerStdout, innerStderr) {
            if (typeof initialCallback === 'function') {
              initialCallback(innerStdout, innerStderr);
            } else {
              innerStdout.pipe(initialOutput);
            }
          };

          _get(Object.getPrototypeOf(VideoScreenshotStream.prototype), 'screenshot', _this2).call(_this2, imageStreamOptions)['catch'](handleExit).then(function () {
            photoDone = true;
            handleExit();
          });
        };

        _this2._videoScreenshot(options)['catch'](handleExit).then(function () {
          videoDone = true;
          handleExit();
        });
      });
    }
  }, {
    key: '_videoScreenshot',
    value: function _videoScreenshot() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var errorPromise = this.validateOptionStreams(options);
      if (errorPromise) {
        return errorPromise;
      }

      var seek = Number(options.seek) || 5;

      options.input.pause();

      return this.findExecutable().then(function (ffmpegCmd) {
        return new Promise(function (resolve, reject) {
          var stdoutClosed = false;
          var stdinClosed = false;
          var procClosed = false;
          var processExited = false;
          var exitError = null;
          var exitHandled = false;
          var outputStream = options.output;

          function handleExit(err) {
            if (exitHandled) {
              return;
            }
            if (err) {
              exitError = err;
            }

            if (processExited && stdoutClosed && stdinClosed && procClosed) {
              exitHandled = true;
              if (exitError) {
                reject(exitError);
              } else {
                resolve();
              }
            }
          }

          var ffmpegArgs = ['-i', 'pipe:0', '-ss', seek, '-f', 'mjpeg', '-q:v', 1, '-vframes', 1, '-'];
          var proc = (0, _child_process.spawn)(ffmpegCmd, ffmpegArgs);
          if (typeof options.callback === 'function') {
            outputStream = proc.stdout;
          }

          var dataWritten = false;

          proc.stdout.on('data', function (chunk) {
            dataWritten = true;
          });
          proc.stdout.on('close', function () {
            stdoutClosed = true;
            handleExit();
          });

          proc.stdin.on('error', function () {});
          proc.stdin.on('close', function () {
            stdinClosed = true;
            handleExit();
          });

          options.input.on('error', function (err) {
            if (outputStream) {
              outputStream.emit('error', err);
            }

            processExited = true;
            proc.kill();
            handleExit(err);
          });

          if (options.output) {
            options.output.on('error', function (err) {
              processExited = true;
              proc.kill();
              handleExit(err);
            });
            options.output.on('close', function () {
              setTimeout(function () {
                handleExit();
                proc.kill();
              }, 20);
            });
          }

          proc.on('error', function (err) {
            if (outputStream) {
              outputStream.emit('error', err);
            }

            processExited = true;
            handleExit(err);
          });

          proc.on('exit', function (code, signal) {
            var error = null;

            if (signal) {
              error = new Error('ffmpeg was killed with signal ' + signal);
            } else if (code) {
              error = new Error('ffmpeg exited with code ' + code);
            } else if (!dataWritten) {
              error = new Error('Could not generate video thumbnail, seek time may be out of bounds or file may not be supported');
            }

            processExited = true;
            procClosed = true;

            if (error && outputStream) {
              outputStream.emit('error', error);
            }
            handleExit(error);
          });

          options.input.resume();
          options.input.pipe(proc.stdin);

          if (typeof options.callback === 'function') {
            options.callback(proc.stdout, proc.stderr);
          } else {
            proc.stdout.pipe(options.output);
          }
        });
      });
    }
  }]);

  return VideoScreenshotStream;
})(_ImageScreenshotStream3['default']);

exports['default'] = VideoScreenshotStream;
module.exports = exports['default'];
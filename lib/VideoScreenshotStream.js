'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _which = require('which');

var _which2 = _interopRequireDefault(_which);

var _ScreenshotStream = require('./ScreenshotStream');

var _ScreenshotStream2 = _interopRequireDefault(_ScreenshotStream);

var _ImageScreenshotStream = require('./ImageScreenshotStream');

var _ImageScreenshotStream2 = _interopRequireDefault(_ImageScreenshotStream);

var _nodeUuid = require('node-uuid');

var _nodeUuid2 = _interopRequireDefault(_nodeUuid);

var _fluentFfmpeg = require('fluent-ffmpeg');

var _fluentFfmpeg2 = _interopRequireDefault(_fluentFfmpeg);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var VideoScreenshotStream = function (_ImageScreenshotStrea) {
  _inherits(VideoScreenshotStream, _ImageScreenshotStrea);

  function VideoScreenshotStream() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, VideoScreenshotStream);

    var _this = _possibleConstructorReturn(this, (VideoScreenshotStream.__proto__ || Object.getPrototypeOf(VideoScreenshotStream)).call(this, options));

    _this._cachedExecutable = null;
    return _this;
  }

  _createClass(VideoScreenshotStream, [{
    key: 'screenshot',
    value: function screenshot() {
      var _this2 = this;

      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var errorPromise = this.validateOptionStreams(options);
      if (errorPromise) {
        return errorPromise;
      }

      var imageStreamOptions = Object.create(options);
      var initialCallback = options.callback;
      var initialOutput = options.output;
      var exitHandled = false;
      var videoDone = false;
      var photoDone = false;

      return new Promise(function (resolve, reject) {
        function handleExit(err) {
          if (exitHandled) {
            return;
          }

          if (err || videoDone && photoDone) {
            exitHandled = true;
            if (err) {
              reject(err);
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

          _get(VideoScreenshotStream.prototype.__proto__ || Object.getPrototypeOf(VideoScreenshotStream.prototype), 'screenshot', _this2).call(_this2, imageStreamOptions).catch(handleExit).then(function () {
            photoDone = true;
            handleExit();
          });
        };

        _this2._videoScreenshot(options).catch(handleExit).then(function () {
          videoDone = true;
          handleExit();
        });
      });
    }
  }, {
    key: '_videoScreenshot',
    value: function _videoScreenshot() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var errorPromise = this.validateOptionStreams(options);
      if (errorPromise) {
        return errorPromise;
      }

      var seek = Number(options.seek) || '5%';

      var outputStream = options.output,
          inputStream = options.input;

      var tmpDir = options.tmpDir || '/tmp/media-thumbnail-stream';
      var uuid = _nodeUuid2.default.v4();
      var tmpFilename = uuid;
      var tmpPath = _path2.default.join(tmpDir, tmpFilename);
      var tmpSsFilename = uuid + '-ss.png';
      var tmpSsPath = _path2.default.join(tmpDir, tmpSsFilename);

      inputStream.pause();

      _mkdirp2.default.sync(tmpDir);

      return new Promise(function (resolve, reject) {
        var exitHandled = false;
        var complete = false;

        function handleExit(err) {
          if (exitHandled) {
            return;
          }

          if (err) {
            exitHandled = true;

            try {
              _fs2.default.unlinkSync(tmpPath);
              _fs2.default.unlinkSync(tmpSsPath);
            } catch (ex) {}

            reject(err);
          } else if (complete) {
            exitHandled = true;

            try {
              _fs2.default.unlinkSync(tmpPath);
              _fs2.default.unlinkSync(tmpSsPath);
            } catch (ex) {}

            resolve();
          }
        }

        var tmpStream = _fs2.default.createWriteStream(tmpPath);

        inputStream.on('error', handleExit);
        if (typeof options.callback !== 'function') {
          outputStream.on('error', handleExit);
        }
        tmpStream.on('error', handleExit);

        inputStream.resume();
        inputStream.pipe(tmpStream);

        tmpStream.on('close', function () {
          (0, _fluentFfmpeg2.default)(tmpPath).on('error', handleExit).on('end', function () {
            var ssStream = _fs2.default.createReadStream(tmpSsPath);
            ssStream.on('error', handleExit);
            ssStream.on('close', function () {
              complete = true;
              handleExit();
            });

            if (typeof options.callback === 'function') {
              options.callback(ssStream, null);
            } else {
              ssStream.pipe(outputStream);
            }
          }).screenshots({
            timestamps: [seek],
            filename: tmpSsFilename,
            folder: tmpDir
          });
        });
      });
    }
  }]);

  return VideoScreenshotStream;
}(_ImageScreenshotStream2.default);

exports.default = VideoScreenshotStream;
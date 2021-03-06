"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ImageScreenshotStream = exports.VideoScreenshotStream = exports.ScreenshotStream = undefined;
exports.default = mediaThumbnail;

var _VideoScreenshotStream = require('./VideoScreenshotStream');

var _VideoScreenshotStream2 = _interopRequireDefault(_VideoScreenshotStream);

var _ImageScreenshotStream = require('./ImageScreenshotStream');

var _ImageScreenshotStream2 = _interopRequireDefault(_ImageScreenshotStream);

var _ScreenshotStream = require('./ScreenshotStream');

var _ScreenshotStream2 = _interopRequireDefault(_ScreenshotStream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.ScreenshotStream = _ScreenshotStream2.default;
exports.VideoScreenshotStream = _VideoScreenshotStream2.default;
exports.ImageScreenshotStream = _ImageScreenshotStream2.default;


function isVideo(mediaType) {
  return typeof mediaType === 'string' && mediaType.toLowerCase() === 'video';
}

function mediaThumbnail() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  options.mediaType = isVideo(options.mediaType) ? 'video' : 'image';
  var processor = null;

  if (options.mediaType === 'video') {
    processor = new _VideoScreenshotStream2.default({ useImageMagick: !!options.useImageMagick });
  } else {
    processor = new _ImageScreenshotStream2.default({ useImageMagick: !!options.useImageMagick });
  }

  return processor.screenshot(options);
}
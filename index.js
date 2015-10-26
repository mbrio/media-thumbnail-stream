"use strict";

import VideoScreenshotStream from './src/VideoScreenshotStream';
import ImageScreenshotStream from './src/ImageScreenshotStream';
import ScreenshotStream from './src/ScreenshotStream';

export { ScreenshotStream, VideoScreenshotStream, ImageScreenshotStream };

function isVideo(mediaType) {
  return typeof mediaType === 'string' && mediaType.toLowerCase() === 'video';
}

export default function mediaThumbnail(options = {}) {
  options.mediaType = isVideo(options.mediaType) ? 'video' : 'image';
  let processor = null;

  if (options.mediaType === 'video') {
    processor = new VideoScreenshotStream();
  } else {
    processor = new ImageScreenshotStream();
  }

  return processor.screenshot(options);
}

"use strict";

import VideoScreenshotStream from './VideoScreenshotStream';
import ImageScreenshotStream from './ImageScreenshotStream';
import ScreenshotStream from './ScreenshotStream';

export { ScreenshotStream, VideoScreenshotStream, ImageScreenshotStream };

function isVideo(mediaType) {
  return typeof mediaType === 'string' && mediaType.toLowerCase() === 'video';
}

export default function mediaThumbnail(options = {}) {
  options.mediaType = isVideo(options.mediaType) ? 'video' : 'image';
  let processor = null;

  if (options.mediaType === 'video') {
    processor = new VideoScreenshotStream({ useImageMagick: !!options.useImageMagick });
  } else {
    processor = new ImageScreenshotStream({ useImageMagick: !!options.useImageMagick });
  }

  return processor.screenshot(options);
}
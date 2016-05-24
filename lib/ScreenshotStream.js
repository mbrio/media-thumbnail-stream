'use strict';

export default class ScreenshotStream {
  constructor(options) {}

  isReadableStream(input) {
    return input && typeof input._read === 'function';
  }

  isWritableStream(output) {
    return output && typeof output._write === 'function';
  }

  screenshot() {
    throw new Error("Not implemented");
  }
}
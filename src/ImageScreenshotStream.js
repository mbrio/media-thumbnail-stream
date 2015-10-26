'use strict';

import gmlib from 'gm';
import ScreenshotStream from './ScreenshotStream';

export default class ImageScreenshotStream extends ScreenshotStream {
  constructor(options = {}) {
    super(options);

    this.options = options;
  }

  createImageProcessorInstance() {
    return gmlib.subClass({ imageMagick: this.options.useImageMagick });
  }

  validateOptionStreams(options) {
    if (!this.isReadableStream(options.input)) {
      return Promise.reject(new Error('You must specify a valid input stream.'));
    }

    if (!this.isWritableStream(options.output) && typeof options.callback !== 'function') {
      return Promise.reject(new Error('You must specify a valid output stream or callback.'));
    }

    return null;
  }

  screenshot(options = {}) {
    let errorPromise = this.validateOptionStreams(options);
    if (errorPromise) { return errorPromise; }

    let gm = this.createImageProcessorInstance();
    options.input.pause();

    return new Promise((resolve, reject) => {
      let procClosed = false;
      let processExited = false;
      let exitError = null;
      let exitHandled = false;

      function handleExit(err) {
        if (exitHandled) { return; }
        if (err) { exitError = err; }

        if (processExited && procClosed) {
          exitHandled = true;
          if (exitError) { reject(exitError); }
          else { resolve(); }
        }
      }

      options.input.on('error', err => {
        processExited = true;
        handleExit(err);
      });

      if (options.output) {
        options.output.on('error', err => {
          processExited = true;
          handleExit(err);
        });
        options.output.on('close', () => {
          setTimeout(() => {
            handleExit();
          }, 20);
        });
      }

      options.input.resume();

      let processor = gm(options.input);
      if (typeof options.configureImageProcessor === 'function') {
        processor = options.configureImageProcessor(processor);
      }

      processor.stream((err, innerStdout, innerStderr) => {
          innerStdout.on('error', err => {
            processExited = true;
            handleExit(err);
          });

          innerStdout.on('close', () => {
            procClosed = true;
            processExited = true;
            handleExit();
          });

          if(typeof options.callback === 'function') { options.callback(innerStdout, innerStderr); }
          else { innerStdout.pipe(options.output); }
        });
    });
  }
}

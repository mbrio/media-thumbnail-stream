'use strict';

import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import os from 'os';
import which from 'which';
import ScreenshotStream from './ScreenshotStream';
import ImageScreenshotStream from './ImageScreenshotStream';
import UUIDGenerator from 'node-uuid';
import ffmpeg from 'fluent-ffmpeg';

export default class VideoScreenshotStream extends ImageScreenshotStream {
  constructor(options = {}) {
    super(options);
    this._cachedExecutable = null;
  }

  screenshot(options = {}) {
    let errorPromise = this.validateOptionStreams(options);
    if (errorPromise) { return errorPromise; }

    let imageStreamOptions = Object.create(options);
    let initialCallback = options.callback;
    let initialOutput = options.output;
    let exitHandled = false;
    let videoDone = false;
    let photoDone = false;

    return new Promise((resolve, reject) => {
      function handleExit(err) {
        if (exitHandled) { return; }

        if (err || (videoDone && photoDone)) {
          exitHandled = true;
          if (err) { reject(err); }
          else { resolve(); }
        }
      }

      options.callback = (stdout, stderr) => {
        imageStreamOptions.input = stdout;
        if (imageStreamOptions.output) { delete imageStreamOptions.output; }

        imageStreamOptions.callback = (innerStdout, innerStderr) => {
          if (typeof initialCallback === 'function') { initialCallback(innerStdout, innerStderr); }
          else { innerStdout.pipe(initialOutput); }
        };

        super.screenshot(imageStreamOptions).catch(handleExit).then(() => {
          photoDone = true;
          handleExit();
        });
      };

      this._videoScreenshot(options).catch(handleExit).then(() => {
        videoDone = true;
        handleExit();
      });
    });
  }

  _videoScreenshot(options = {}) {
    let errorPromise = this.validateOptionStreams(options);
    if (errorPromise) { return errorPromise; }

    let seek = Number(options.seek) || '5%';

    const { output: outputStream, input: inputStream } = options;
    const tmpDir = options.tmpDir || '/tmp/media-thumbnail-stream';
    const uuid = UUIDGenerator.v4();
    const tmpFilename = uuid;
    const tmpPath = path.join(tmpDir, tmpFilename);
    const tmpSsFilename = `${uuid}-ss.png`;
    const tmpSsPath = path.join(tmpDir, tmpSsFilename);

    inputStream.pause();

    mkdirp.sync(tmpDir);

    return new Promise((resolve, reject) => {
      let exitHandled = false;
      let complete = false;

      function handleExit(err) {
        if (exitHandled) { return; }

        if (err) {
          exitHandled = true;

          try {
            fs.unlinkSync(tmpPath);
            fs.unlinkSync(tmpSsPath);
          } catch (ex) {}

          reject(err);
        } else if (complete) {
          exitHandled = true;

          try {
            fs.unlinkSync(tmpPath);
            fs.unlinkSync(tmpSsPath);
          } catch (ex) {}

          resolve();
        }
      }

      let tmpStream = fs.createWriteStream(tmpPath);

      inputStream.on('error', handleExit);
      if (typeof options.callback !== 'function') { outputStream.on('error', handleExit); }
      tmpStream.on('error', handleExit);

      inputStream.resume();
      inputStream.pipe(tmpStream);

      tmpStream.on('close', () => {
        ffmpeg(tmpPath)
  				.on('error', handleExit)
  				.on('end', () => {
            let ssStream = fs.createReadStream(tmpSsPath);
            ssStream.on('error', handleExit);
            ssStream.on('close', () => {
              complete = true;
              handleExit();
            });

            if (typeof options.callback === 'function') { options.callback(ssStream, null); }
            else { ssStream.pipe(outputStream); }
          })
  				.screenshots({
  					timestamps: [seek],
  					filename: tmpSsFilename,
  					folder: tmpDir
  				});
      });
    });
  }
}

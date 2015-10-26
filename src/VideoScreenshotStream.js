'use strict';

import fs from 'fs';
import path from 'path';
import os from 'os';
import which from 'which';
import ScreenshotStream from './ScreenshotStream';
import ImageScreenshotStream from './ImageScreenshotStream';
import { spawn } from 'child_process';

function _findExecutableUsingWhich(file) {
  return new Promise((resolve, reject) => {
    which(file, (err, filepath) => {
      if (err) { return resolve(); }
      resolve(filepath);
    });
  });
}

export default class VideoScreenshotStream extends ImageScreenshotStream {
  constructor(options = {}) {
    super(options);
    this._cachedExecutable = null;
  }

  findExecutableUsingWhich() {
    return _findExecutableUsingWhich('ffmpeg');
  }

  findExecutableUsingOptions() {
    let filepath = this.options.ffmpeg;

    if (filepath) {
      return _findExecutableUsingWhich(filepath);
    } else {
      return Promise.resolve();
    }
  }

  findExecutableUsingEnvironment() {
    let filepath = process.env.FFMPEG_PATH;

    if (filepath) {
      return _findExecutableUsingWhich(filepath);
    } else {
      return Promise.resolve();
    }
  }

  findExecutable() {
    if (this._cachedExecutable) { return Promise.resolve(this._cachedExecutable); }

    return Promise.all([
      this.findExecutableUsingOptions(),
      this.findExecutableUsingEnvironment(),
      this.findExecutableUsingWhich()
    ]).then((values) => {
      this._cachedExecutable = values.find(item => { return item; });
      return Promise.resolve(this._cachedExecutable);
    });
  }

  screenshot(options = {}) {
    let errorPromise = this.validateOptionStreams(options);
    if (errorPromise) { return errorPromise; }

    let imageStreamOptions = Object.create(options);
    let initialCallback = options.callback;
    let initialOutput = options.output;
    let exitError = null;
    let exitHandled = false;
    let videoDone = false;
    let photoDone = false;

    return new Promise((resolve, reject) => {
      function handleExit(err) {
        if (exitHandled) { return; }
        if (err) { exitError = err; }

        if (videoDone && photoDone) {
          exitHandled = true;
          if (exitError) { reject(exitError); }
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

    let seek = Number(options.seek) || 5;

    options.input.pause();

    return this.findExecutable().then(ffmpegCmd => {
      return new Promise((resolve, reject) => {
        let stdoutClosed = false;
        let stdinClosed = false;
        let procClosed = false;
        let processExited = false;
        let exitError = null;
        let exitHandled = false;

        function handleExit(err) {
          if (exitHandled) { return; }
          if (err) { exitError = err; }

          if (processExited && stdoutClosed && stdinClosed && procClosed) {
            exitHandled = true;
            if (exitError) { reject(exitError); }
            else { resolve(); }
          }
        }

        let ffmpegArgs = ['-i', 'pipe:0', '-ss', seek, '-f', 'mjpeg', '-q:v', 1, '-vframes', 1, '-'];
        let proc = spawn(ffmpegCmd, ffmpegArgs);

        let dataWritten = false;

        proc.stdout.on('data', chunk => { dataWritten = true; });
        proc.stdout.on('close', () => {
          stdoutClosed = true;
          handleExit();
        });

        proc.stdin.on('error', () => {});
        proc.stdin.on('close', () => {
          stdinClosed = true;
          handleExit();
        });

        options.input.on('error', err => {
          processExited = true;
          proc.kill();
          handleExit(err);
        });

        if (options.output) {
          options.output.on('error', err => {
            processExited = true;
            proc.kill();
            handleExit(err);
          });
          options.output.on('close', () => {
            setTimeout(() => {
              handleExit();
              proc.kill();
            }, 20);
          });
        }

        proc.on('error', err => {
          processExited = true;
          handleExit(err);
        });

        proc.on('exit', function(code, signal) {
          let error = null;

          if (signal) { error = new Error('ffmpeg was killed with signal ' + signal); }
          else if (code) { error = new Error('ffmpeg exited with code ' + code); }
          else if (!dataWritten) { error = new Error('ffmpeg could not generate thumbnail, seek time may be out of bounds'); }

          processExited = true;
          procClosed = true;

          handleExit(error);
        });

        options.input.resume();
        options.input.pipe(proc.stdin);

        if (typeof options.callback === 'function') { options.callback(proc.stdout, proc.stderr); }
        else { proc.stdout.pipe(options.output); }
      });
    });
  }
}

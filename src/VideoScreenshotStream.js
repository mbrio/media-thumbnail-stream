"use strict";

import fs from 'fs';
import path from 'path';
import os from 'os';
import which from 'which';
import { spawn } from 'child_process';

function _findExecutableUsingWhich(file) {
  return new Promise((resolve, reject) => {
    which(file, (err, filepath) => {
      if (err) { return resolve(); }
      resolve(filepath);
    });
  });
}

export default class VideoScreenshotStream {
  constructor(options = {}) {
    this.options = options;
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

  isReadableStream(input) {
    return input && ('readable' in input) && input.readable;
  }

  isWritableStream(output) {
    console.log(output);
    return output && ('readable' in output) && output.readable;
  }

  screenshot(options = {}) {
    if (!this.isReadableStream(options.input)) {
      return Promise.reject(new Error('You must specify a valid input stream.'));
    }

    let quality = Number(options.quality) || 2;
    let seek = Number(options.seek) || 5;

    options.input.pause();

    return this.findExecutable().then(ffmpegCmd => {
      return new Promise((resolve, reject) => {
        let ffmpegArgs = ['-i', 'pipe:0', '-ss', seek, '-c:v', 'mjpeg', '-f', 'mjpeg', '-q:v', quality, '-vframes', 1, '-'];

        let proc = spawn(ffmpegCmd, ffmpegArgs);

        let failed = false;
        let dataWritten = false;

        proc.stdout.on('data', chunk => { dataWritten = true; });
        proc.stdin.on('error', () => {});

        options.input.on('error', err => {
          failed = true;
          proc.stdout.emit('error', err);
          proc.kill();
        });

        options.input.resume();
        options.input.pipe(proc.stdin);

        proc.on('error', err => {
          failed = true;
          proc.stdout.emit('error', err);
        });

        proc.on('close', function(code, signal) {
          if (failed) { return; }
          let error = null;

          if (signal) { error = new Error('ffmpeg was killed with signal ' + signal); }
          else if (code) { error = new Error('ffmpeg exited with code ' + code); }
          else if (!dataWritten) { error = new Error('ffmpeg could not generate thumbnail, seek time may be out of bounds'); }

          if (error) {
            failed = true;
            proc.stdout.emit('error', error);
          }
        });

        resolve(proc.stdout);
      });
    });
  }
}

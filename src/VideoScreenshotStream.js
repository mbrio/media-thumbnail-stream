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
    const tmpFilename = `${uuid}${path.extname(inputStream.path)}`;
    const tmpPath = path.join(tmpDir, tmpFilename);
    const tmpSsFilename = `${uuid}-ss.png`;
    const tmpSsPath = path.join(tmpDir, tmpSsFilename);

    options.input.pause();

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

      options.input.on('error', handleExit);
      if (typeof options.callback !== 'function') { options.output.on('error', handleExit); }
      tmpStream.on('error', handleExit);

      options.input.resume();
      options.input.pipe(tmpStream);

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
            else { ssStream.pipe(options.output); }
          })
  				.screenshots({
  					timestamps: [seek],
  					filename: tmpSsFilename,
  					folder: tmpDir
  				});
      });

      // let stdoutClosed = false;
      // let stdinClosed = false;
      // let procClosed = false;
      // let processExited = false;
      // let exitError = null;
      // let exitHandled = false;
      // let outputStream = options.output;
      //
      // function handleExit(err) {
      //   if (exitHandled) { return; }
      //   if (err) { exitError = err; }
      //
      //   if (processExited && stdoutClosed && stdinClosed && procClosed) {
      //     exitHandled = true;
      //     if (exitError) { reject(exitError); }
      //     else { resolve(); }
      //   }
      // }
      //
      // // let ffmpegArgs = ['-i', 'pipe:0', '-ss', seek, '-f', 'mjpeg', '-q:v', 1, '-vframes', 1, '-'];
      // // let proc = spawn(ffmpegCmd, ffmpegArgs);
      // if (typeof options.callback === 'function') { outputStream = proc.stdout; }
      //
      // let dataWritten = false;
      //
      // proc.stdout.on('data', chunk => { dataWritten = true; });
      // proc.stdout.on('close', () => {
      //   stdoutClosed = true;
      //   handleExit();
      // });
      //
      // proc.stdin.on('error', () => {});
      // proc.stdin.on('close', () => {
      //   stdinClosed = true;
      //   handleExit();
      // });
      //
      // options.input.on('error', err => {
      //   if (outputStream) { outputStream.emit('error', err); }
      //
      //   processExited = true;
      //   proc.kill();
      //   handleExit(err);
      // });
      //
      // if (options.output) {
      //   options.output.on('error', err => {
      //     processExited = true;
      //     proc.kill();
      //     handleExit(err);
      //   });
      //   options.output.on('close', () => {
      //     setTimeout(() => {
      //       handleExit();
      //       proc.kill();
      //     }, 20);
      //   });
      // }
      //
      // proc.on('error', err => {
      //   if (outputStream) { outputStream.emit('error', err); }
      //
      //   processExited = true;
      //   handleExit(err);
      // });
      //
      // proc.on('exit', function(code, signal) {
      //   let error = null;
      //
      //   if (signal) { error = new Error('ffmpeg was killed with signal ' + signal); }
      //   else if (code) { error = new Error('ffmpeg exited with code ' + code); }
      //   else if (!dataWritten) { error = new Error('Could not generate video thumbnail, seek time may be out of bounds or file may not be supported'); }
      //
      //   processExited = true;
      //   procClosed = true;
      //
      //   if (error && outputStream) { outputStream.emit('error', error); }
      //   handleExit(error);
      // });
      //
      // options.input.resume();
      // options.input.pipe(proc.stdin);
      //
      // if (typeof options.callback === 'function') { options.callback(proc.stdout, proc.stderr); }
      // else { proc.stdout.pipe(options.output); }
    });
  }
}

"use strict";
/* jshint expr:true */

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream';
import { VideoScreenshotStream } from '../../index';

function getVideoStream() {
  return fs.createReadStream(path.join(process.cwd(), 'specs/fixtures/sample.m4v'));
}

describe('VideoScreenshotStream', () => {
  describe('#findExecutable()', () => {
    it('should find the installed ffmpeg off of the PATH', done => {
      let vss = new VideoScreenshotStream();

      vss.findExecutableUsingWhich().then(filepath => {
        expect(filepath).to.exist;
        done();
      }).catch(done);
    });

    it('should find the installed ffmpeg using options', done => {
      let vss = new VideoScreenshotStream({ ffmpeg: '/usr/local/bin/ffmpeg' });

      vss.findExecutableUsingOptions().then(filepath => {
        expect(filepath).to.exist;
        done();
      }).catch(done);
    });

    it('should find the installed ffmpeg using environment', done => {
      let prevDecoder = process.env.FFMPEG_PATH;

      process.env.FFMPEG_PATH = '/usr/local/bin/ffmpeg';
      let vss = new VideoScreenshotStream();

      vss.findExecutableUsingEnvironment().then(filepath => {
        expect(filepath).to.exist;

        process.env.FFMPEG_PATH = prevDecoder;
        done();
      }).catch(err => {
        process.env.FFMPEG_PATH = prevDecoder;
        done(err);
      });
    });

    it('should find the installed ffmpeg by prioritizing options over all', done => {
      let prevDecoder = process.env.FFMPEG_PATH;

      process.env.FFMPEG_PATH = '/usr/local/bin/totallybogus';
      let vss = new VideoScreenshotStream({ ffmpeg: process.execPath });

      vss.findExecutable().then(filepath => {
        expect(filepath).to.equal(process.execPath);

        process.env.FFMPEG_PATH = prevDecoder;
        done();
      }).catch(err => {
        process.env.FFMPEG_PATH = prevDecoder;
        done(err);
      });
    });

    it('should find the installed ffmpeg by prioritizing the environment over which', done => {
      let prevDecoder = process.env.FFMPEG_PATH;

      process.env.FFMPEG_PATH = process.execPath;
      let vss = new VideoScreenshotStream();

      vss.findExecutable().then(filepath => {
        expect(filepath).to.equal(process.execPath);

        process.env.FFMPEG_PATH = prevDecoder;
        done();
      }).catch(err => {
        process.env.FFMPEG_PATH = prevDecoder;
        done(err);
      });
    });

    it('should find the installed ffmpeg with which', done => {
      let vss = new VideoScreenshotStream();

      vss.findExecutable().then(filepath => {
        expect(filepath).to.exist;
        done();
      }).catch(done);
    });
  });

  describe('#screenshot', () => {
    it('should throw an error if no input file is specified', done => {
      let vss = new VideoScreenshotStream();
      vss.screenshot().then(thumbstream => {
        done(new Error('This should not be called'));
      }).catch(err => {
        expect(err.message).to.match(/input stream/);
        done();
      });
    });

    it('should throw an error if seek time is out of bounds', done => {
      let options = {
        input: path.join(process.cwd(), 'specs/fixtures/sample.m4v'),
        seek: 100000000
      };

      let vss = new VideoScreenshotStream();
      vss.screenshot(options)
        .then(thumbstream => {
          thumbstream.on('error', err => {
            expect(err.message).to.match(/seek time/);
            done();
          });
        }).catch(done);
    });

    it('should generate a screenshot', done => {
      let options = {
        input: path.join(process.cwd(), 'specs/fixtures/sample.m4v')
      };

      let vss = new VideoScreenshotStream();
      vss.screenshot(options).then(thumbstream => {
        let data = [];
        let writeStream = new PassThrough();
        let failed = false;

        writeStream._transform = function _transform(chunk, encoding, cb) {
          data.push(chunk);
          cb();
        };

        writeStream.on('error', err => {
          if (failed) { return; }
          failed = true;
          done(err);
        });

        thumbstream.on('error', err => {
          if (failed) { return; }
          failed = true;
          done(err);
        });

        thumbstream.on('close', () => {
          if (failed) { return; }
          let b = Buffer.concat(data);

          expect(b).to.have.length.greaterThan(0);
          done();
        });

        thumbstream.pipe(writeStream);
      }).catch(done);
    });
  });
});

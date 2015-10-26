"use strict";
/* jshint expr:true */

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import BufferStream from '../BufferStream';
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
    it('should throw an error if no output file is specified', done => {
      let vss = new VideoScreenshotStream();
      vss.screenshot({
        input: fs.createReadStream(path.join(process.cwd(), 'specs/fixtures/sample.m4v'))
      }).then(thumbstream => {
        done(new Error('This should not be called'));
      }).catch(err => {
        expect(err.message).to.match(/output stream/);
        done();
      });
    });

    it('should throw an error if no input file is specified', done => {
      let vss = new VideoScreenshotStream();
      vss.screenshot({
        output: new BufferStream()
      }).then(thumbstream => {
        done(new Error('This should not be called'));
      }).catch(err => {
        expect(err.message).to.match(/input stream/);
        done();
      });
    });

    it('should throw an error if incorrect output specified', done => {
      let vss = new VideoScreenshotStream();
      vss.screenshot({
        input: fs.createReadStream(path.join(process.cwd(), 'specs/fixtures/sample.m4v')),
        output: 'test'
      }).then(thumbstream => {
        done(new Error('This should not be called'));
      }).catch(err => {
        expect(err.message).to.match(/output stream/);
        done();
      });
    });

    it('should throw an error with incorrect input specified', done => {
      let vss = new VideoScreenshotStream();
      vss.screenshot({
        input: 'test',
        output: new BufferStream()
      }).then(thumbstream => {
        done(new Error('This should not be called'));
      }).catch(err => {
        expect(err.message).to.match(/input stream/);
        done();
      });
    });

    it('should throw an error if seek time is out of bounds when using a stream', done => {
      let options = {
        input: fs.createReadStream(path.join(process.cwd(), 'specs/fixtures/sample.m4v')),
        output: new BufferStream(),
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

    it('should generate a screenshot from a stream', done => {
      let output = new BufferStream();

      let options = {
        input: fs.createReadStream(path.join(process.cwd(), 'specs/fixtures/sample.m4v')),
        output: output
      };

      let vss = new VideoScreenshotStream();

      vss.screenshot(options).then(thumbstream => {
        thumbstream.on('close', () => {
          let b = output.toBuffer();

          expect(b).to.have.length.greaterThan(0);
          done();
        });

        thumbstream.pipe(output);
      }).catch(done);
    });
  });
});

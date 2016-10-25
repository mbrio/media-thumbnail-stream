"use strict";
/* jshint expr:true */

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import sinon from 'sinon';
import BufferStream from '../BufferStream';
import { VideoScreenshotStream } from '../../lib';

describe('VideoScreenshotStream', () => {
  describe('#screenshot', () => {
    it('should throw an error if no output stream is specified', done => {
      let vss = new VideoScreenshotStream();
      vss.screenshot({
        input: fs.createReadStream(path.join(process.cwd(), 'specs/fixtures/sample.m4v'))
      }).then(() => {
        done(new Error('This should not be called'));
      }).catch(err => {
        expect(err.message).to.match(/output stream/);
        done();
      });
    });

    it('should throw an error if no input stream is specified', done => {
      let vss = new VideoScreenshotStream();
      vss.screenshot({
        output: new BufferStream()
      }).then(() => {
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
      }).then(() => {
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
      }).then(() => {
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
        .then(() => {
          done(new Error('This should not be called'));
        })
        .catch(err => {
          expect(err.message).to.match(/ENOENT/);
          done();
        });
    });

    it('should generate a screenshot from a stream', done => {
      let output = new BufferStream();

      let options = {
        input: fs.createReadStream(path.join(process.cwd(), 'specs/fixtures/sample.m4v')),
        output: output
      };

      let vss = new VideoScreenshotStream();

      vss.screenshot(options).then(() => {
        let b = output.toBuffer();

        expect(b).to.have.length.greaterThan(0);
        done();
      }).catch(done);
    });

    it('should generate a screenshot from a stream and pass it to a callback', done => {
      let output = new BufferStream();

      let options = {
        input: fs.createReadStream(path.join(process.cwd(), 'specs/fixtures/sample.m4v')),
        callback: (stdout, stderr) => {
          stdout.on('end', () => {
            let b = output.toBuffer();

            expect(b).to.have.length.greaterThan(0);
            done();
          });

          stdout.pipe(output);
        }
      };

      let vss = new VideoScreenshotStream();

      vss.screenshot(options).catch(done);
    });

    it('should allow for the configuration of image processor', done => {
      let output = new BufferStream();
      let configProcessor = (processor) => { return processor.resize(16); };
      let spy = sinon.spy(configProcessor);

      let options = {
        input: fs.createReadStream(path.join(process.cwd(), 'specs/fixtures/sample.m4v')),
        configureImageProcessor: spy,
        callback: (stdout, stderr) => {
          let errored = false;
          stdout.on('error', err => { errored = true; });

          stdout.on('end', () => {
            if (errored) { return; }
            let b = output.toBuffer();

            expect(spy.calledOnce).to.be.true;
            expect(b).to.have.length.greaterThan(0);
            done();
          });

          stdout.pipe(output);
        }
      };

      let vss = new VideoScreenshotStream();

      vss.screenshot(options).catch(done);
    });
  });
});

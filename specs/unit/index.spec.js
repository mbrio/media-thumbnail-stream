"use strict";
/* jshint expr:true */

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import sinon from 'sinon';
import BufferStream from '../BufferStream';
import mediaThumbnail from '../../index';
import { VideoScreenshotStream } from '../../index';

describe('index', () => {
  describe('#mediaThumbnail()', () => {
    it('should use the image processor to generate thumbnail', done => {
      let output = new BufferStream();

      let options = {
        input: fs.createReadStream(path.join(process.cwd(), 'specs/fixtures/sample.jpg')),
        output: output
      };

      mediaThumbnail(options).then(() => {
        let b = output.toBuffer();

        expect(b).to.have.length.greaterThan(0);
        done();
      }).catch(done);
    });

    it('should use the video processor to generate thumbnail', done => {
      let output = new BufferStream();

      let options = {
        input: fs.createReadStream(path.join(process.cwd(), 'specs/fixtures/sample.m4v')),
        output: output,
        mediaType: 'video'
      };

      mediaThumbnail(options).then(() => {
        let b = output.toBuffer();

        expect(b).to.have.length.greaterThan(0);
        done();
      }).catch(done);
    });
  });
});

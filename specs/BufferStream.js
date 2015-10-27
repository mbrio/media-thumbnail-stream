'use strict';

import { PassThrough } from 'stream';

export default class BufferStream extends PassThrough {
  constructor() {
    super();

    this._data = [];
  }

  _transform(chunk, encoding, callback) {
    this._data.push(chunk);
    super._transform(chunk, encoding, callback);
  }

  toBuffer() {
    return Buffer.concat(this._data);
  }
}

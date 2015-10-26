'use strict';

import { Transform } from 'stream';

export default class BufferStream extends Transform {
  constructor() {
    super();

    this._data = [];
  }

  _transform(chunk, encoding, callback) {
    this._data.push(chunk);
    callback();
  }

  toBuffer() {
    return Buffer.concat(this._data);
  }
}

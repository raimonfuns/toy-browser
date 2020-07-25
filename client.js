const net = require('net');
const {
  resolve
} = require('path');

class Request {
  constructor(options) {
    this.method = options.method || 'GET';
    this.host = options.host;
    this.port = options.port || 80;
    this.path = options.path || '/';
    this.body = options.body || {};
    this.headers = options.headers || {};

    let contentType = this.headers['Content-Type'];

    if (!contentType) {
      contentType = 'application/x-www-form-urlencoded';
      this.headers['Content-Type'] = contentType;
    }

    if (contentType === 'application/json') {
      this.bodyText = JSON.stringify(this.body);
    } else if (contentType === 'application/x-www-form-urlencoded') {
      this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&');
    }

    this.headers['Content-length'] = this.bodyText.length;
  }

  toString() {
    return `
${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}\r`).join('\n')}
\r
${this.bodyText}
`
  }

  send(connection) {
    return new Promise((resolve, reject) => {
      const parser = new ResponseParser();
      if (connection) {
        connection.write(this.toString())
      } else [
        connection = net.createConnection({
          host: this.host,
          port: this.port
        }, () => {
          connection.write(this.toString());
        })
      ]
      connection.on('data', (data) => {
        parser.receive(data.toString())
        if (parser.isFinished) {
          resolve(parser.response);
        }
        connection.end();
      });
      connection.on('error', (err) => {
        reject(err);
        connection.end();
      });
    })
  }
}

class ResponseParser {
  constructor() {
    this.WAITING_STATUS_LINE = 0;
    this.WAITING_HEADER_NAME = 1;
    this.WAITING_HEADER_VALUE = 2;
    this.WAITING_BODY = 3;

    this.charIsDone = false;
    this.current = this.WAITING_STATUS_LINE;
    this.statusLine = '';
    this.headers = {};
    this.headerName = '';
    this.headerValue = '';
    this.bodyParser = null;
  }

  get isFinished() {
    return this.bodyParser && this.bodyParser.isFinished;
  }

  get response() {
    const status = this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/);
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser.content.join(''),
    }
  }

  receive(string) {
    for (let char of string) {
      this.receiveChar(char);
    }
  }

  collectStatus(char) {
    if (this.charIsDone) {
      return;
    }
    if (this.current === this.WAITING_STATUS_LINE) {
      if (char === '\r') {
        this.charIsDone = true;
        return;
      }
      if (char === '\n') {
        this.current = this.WAITING_HEADER_NAME;
        this.charIsDone = true;
        return;
      }
      this.statusLine += char;
    }
  }

  collectHeader(char) {
    if (this.charIsDone) {
      return;
    }
    if (this.current === this.WAITING_HEADER_NAME) {
      if (!this.headerName && char === '\r') {
        this.charIsDone = true;
        return;
      }
      if (!this.headerName && char === '\n') {
        this.current = this.WAITING_BODY;
        this.charIsDone = true;
        return;
      }
      if (char === ':') {
        this.current = this.WAITING_HEADER_VALUE;
        this.charIsDone = true;
        return;
      }
      this.headerName += char;
    }

    if (this.current === this.WAITING_HEADER_VALUE) {
      if (!this.headerValue && char === ' ') {
        this.charIsDone = true;
        return;
      }
      if (char === '\r') {
        this.charIsDone = true;
        return;
      }
      if (char === '\n') {
        this.headers[this.headerName] = this.headerValue;
        this.headerName = '';
        this.headerValue = '';
        this.current = this.WAITING_HEADER_NAME;
        this.charIsDone = true;
        return;
      }
      this.headerValue += char;
    }
  }

  collectBody(char) {
    if (this.charIsDone) {
      return;
    }
    if (this.current === this.WAITING_BODY) {
      if (this.headers['Transfer-Encoding'] === 'chunked') {
        if (!this.bodyParser) {
          this.bodyParser = new TrunkedBodyParser();
        }
        this.bodyParser.receiveChar(char);
      }
    }
  }

  receiveChar(char) {
    this.charIsDone = false;
    this.collectStatus(char);
    this.collectHeader(char);
    this.collectBody(char);
  }
}

class TrunkedBodyParser {
  constructor() {
    this.WAITING_LENGTH = 0;
    this.READING_THUNK = 1;
    this.READING_THUNK_END = 2;
    this.current = this.WAITING_LENGTH;
    this.length = 0;
    this.content = [];
    this.charIsDone = false;
    this.isFinished = false;
  }

  collectLength(char) {
    if (this.charIsDone) {
      return;
    }
    if (this.current === this.WAITING_LENGTH) {
      if (char === '\r') {
        this.charIsDone = true;
        return;
      }
      if (char === '\n') {
        this.current = this.READING_THUNK;
        this.charIsDone = true;
        return;
      }
      this.length += Number(char);
    }
  }

  collectThunk(char) {
    if (this.charIsDone) {
      return;
    }

    if (this.current === this.READING_THUNK) {
      if (char === '\r') {
        this.charIsDone = true;
        return;
      }
      if (char === '\n') {
        this.charIsDone = true;
        return;
      }
      this.content.push(char);
      this.length--;
      if (this.length === 0) {
        this.current = this.READING_THUNK_END;
        this.charIsDone = true;
        this.isFinished = true;
        return;
      }
    }
  }

  receiveChar(char) {
    this.charIsDone = false;
    this.collectLength(char);
    this.collectThunk(char);
  }
}

(async () => {
  const request = new Request({
    host: '127.0.0.1',
    port: 8088,
    path: '/',
    headers: {
      'x-Foo': 'bar'
    },
    body: {
      name: 'winter'
    }
  });
  console.log(request.toString());

  const res = await request.send();
  console.log(res);
})();
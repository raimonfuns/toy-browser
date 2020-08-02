const http = require('http');

const server = http.createServer((req, res) => {
  // console.log('request received');
  // console.log(req.headers);
  // res.setHeader('Content-Type', 'text/html');
  res.setHeader('x-Foo', 'bar');
  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  res.end(`<html>
<a>1</a>
<a href="#">1</a>
<h1>标题</h1>
<img src="a.png" />
<a href=#></a>
<a href="#" class="a" title='a'>1</a>
</html>`);
});

server.listen(8088);
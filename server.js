var express = require('express');
var http = require('http');
var errorHandler = require('errorhandler');

var app = express();

app.set('views',__dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', {
  layout: false
});

app.use(require('stylus').middleware({
  src: __dirname + '/public'
}));

app.use(express.static(__dirname + '/public'));

var env = process.env.NODE_ENV || 'development';
if ('development' == env) {
  app.use(errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
}
else if ('production' == env) {
  app.use(errorHandler);
}

var server = http.createServer(app);
var io = require('socket.io').listen(server);

var serialPort = require('serialport');
var SerialPort = serialPort.SerialPort;
var sp = new SerialPort("/dev/ttyAMA0", {
   baudrate: 9600,
   parser: serialPort.parsers.readline("--")
});

var ts = new Date();
var lastTime =ts.getTime();
var message = "";
var lastMessage = message;
sp.on('data', function(data) {
  ts = new Date();
  message = data.toString();

  if (message == 'a' || message == 'AWAKE' || message == '') {
    return;
  }

  var currentTime = ts.getTime();
  var diff = Math.abs(currentTime - lastTime);
  if ((diff < 500) && (message == lastMessage)) {
    return;
  }

  lastTime = currentTime;
  lastMessage = message;
  console.log("Rx message %s", message);
  io.sockets.emit('rx', { timestamp: ts.toUTCString(), msg: message });
});

io.sockets.on('connection', function(socket) {
  console.log("connected");
//    io.sockets.emit('message', { msg: 'connected' });
  return socket.on('disconnect', function() {
    console.log("disconnected");
//      io.sockets.emit('message', { msg: 'disconnected' });
  });
});

app.get('/', function(req, res) {
  return res.render('index', {
    title: 'node.js XRF listener'
  });
});

if (!module.parent) {
  port = 10927;
  server.listen(port);
  console.log("Express server listening on port %d", port);
}

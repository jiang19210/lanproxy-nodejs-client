var net = require('net');
var severMessage = require('./sever_message');
var encodeDecoder = require('./encoder_decoder');

var host = severMessage.host, port = severMessage.port;

var proxySocket = net.createConnection(port, host, function () {
    var message = severMessage.getMessage(severMessage.C_TYPE_AUTH, 0, severMessage.clientkey, null);
    var buf = encodeDecoder.encoder(message);
    proxySocket.write(buf);
});
proxySocket.on('data', function (chunk) {
    if (Buffer.isBuffer(chunk)) {
        console.log('chunk==[%s]' , chunk.length);
    } else {
        console.error("not buf")
    }
});

proxySocket.on('end', function () {
    console.log('disconnected from sever, %s-%s', host, port);
});

proxySocket.on('connect', function () {
    console.log('connect event')
});
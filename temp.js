var net = require('net');
var severMessage = require('./client/sever_message');
var encodeDecoder = require('./client/encoder_decoder');
var clientt = require('./client/proxy_client_handler');

var host = severMessage.host, port = severMessage.port, heartbeatTime = 1000 * 5;

function init () {
    clientt.connection(port, host)
}
init ();
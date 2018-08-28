var severMessage = require('./sever_message');
var proxyClientHandler = require('./proxy_client_handler');
var socketManager = require('./socket_manager');
var encodeDecoder = require('./encoder_decoder');

var host = severMessage.host, port = severMessage.port, heartbeatTime = 1000 * 5;

//连接并认证
var proxySocket = proxyClientHandler.connectionAuth(port, host);

setInterval(function () {
    proxyClientHandler.heartbeat(proxySocket);
}, heartbeatTime);



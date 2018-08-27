var severMessage = require('./sever_message');
var proxyClientHandler = require('./proxy_client_handler');

var host = severMessage.host, port = severMessage.port, heartbeatTime = 1000 * 40;

var proxySocket = proxyClientHandler.connection(port, host);

setInterval(function () {
    proxyClientHandler.heartbeat(proxySocket);
}, heartbeatTime);



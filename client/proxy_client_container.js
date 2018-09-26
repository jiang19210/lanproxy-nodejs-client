var severMessage = require('./sever_message');
var proxyClientHandler = require('./proxy_client_handler');

var host = severMessage.host, port = severMessage.port;

//连接并认证
proxyClientHandler.connectionAuth(port, host);

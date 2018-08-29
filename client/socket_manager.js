var net = require('net');
var severMessage = require('./sever_message');
var proxyClientHandler = require('./proxy_client_handler');
var encodeDecoder = require('./encoder_decoder');
var util = require('./util');
var MAX_POOL_SIZE = 100;
var proxy_server_socket_pool = [];
var local_proxy_socket = {};

exports.borrowProxySocket = function (callback) {
    var socket = proxy_server_socket_pool.pop();
    if (socket != null) {
        callback(socket);
    } else {
        connection(severMessage.port, severMessage.host, callback, 'tpsocket');
    }
};
exports.addProxySocket = function (tpsocket) {
    if (proxy_server_socket_pool.length > MAX_POOL_SIZE) {
        tpsocket.end();
    } else {
        tpsocket.id = util.random();
        proxy_server_socket_pool.push(tpsocket);
        console.log('add tpsocket to the poole, socket is %s, pool size is %s', tpsocket.id);
    }
};
exports.removeProxySocket = function (tpsocket) {
    var index = indexOfSocket(tpsocket);
    if (index > -1) {
        proxy_server_socket_pool.splice(index, 1);
    }
};

function indexOfSocket(tpsocket) {
    for (var i = 0; i < proxy_server_socket_pool.length; i++) {
        if (proxy_server_socket_pool[i].id == tpsocket.id) {
            return i;
        }
    }
    return -1;
}

exports.addLocalProxySocket = function (userId, localSocket) {
    local_proxy_socket[userId + ''] = localSocket;
};
exports.clearLocalProxySocket = function () {
    for (var i = 0; i < local_proxy_socket.length; i++) {
        var tlsocketUserId = local_proxy_socket[i];
        console.log('tlsocketUserId')
        for (var userId in tlsocketUserId) {
            var tlsocket = tlsocketUserId[userId];
            console.log('userId=' + userId);
            if (!tlsocket.destroyed) {
                tlsocket.end();
            }
        }
    }
};
exports.removeLocalProxySocket = function (userId) {
    delete local_proxy_socket[userId];
};
exports.connection = connection;

function connection(port, host, callback, socketType) {
    var proxySocket = net.createConnection(port, host, function () {
        callback(proxySocket);
    });

    proxySocket.on('connect', function () {
        setInterval(function () {
            heartbeat(proxySocket);
        }, 1000 * 30);
        console.log('connect proxy server %s:%s success, type is %s', host, port, socketType);
    });

    proxySocket.on('error', function (err) {
        console.log('error from sever, %s:%s, err : %s', host, port, err);
        callback(null, err);
    });

    proxySocket.on('data', function (chunk) {
        if (Buffer.isBuffer(chunk)) {
            var msg = encodeDecoder.decoder(chunk);
            console.log('recieved proxy message, type is %s', msg.type);
            switch (msg.type) {
                case severMessage.TYPE_CONNECT :
                    proxyClientHandler.handlerConnectMessage(msg, proxySocket);
                    break;
                case severMessage.TYPE_DISCONNECT :
                    proxyClientHandler.handleDisconnectMessage(msg, proxySocket);
                    break;
                case severMessage.P_TYPE_TRANSFER:
                    proxyClientHandler.handleTransferMessage(msg, proxySocket);
                    break;
                default :
                    break;
            }
        } else {
            console.error("not buf")
        }
    });

    proxySocket.on('end', function () {
        console.log('disconnected from sever, %s:%s', host, port);
        callback(proxySocket, null, 'end');
    });
    return proxySocket;
}

function heartbeat (proxySocket) {
    var msg = severMessage.getMessage(severMessage.TYPE_HEARTBEAT, 0, null, null);
    var buf = encodeDecoder.encoder(msg);
    proxySocket.write(buf);
    console.log('heartbeat time');
}
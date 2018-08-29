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
        proxy_server_socket_pool.push(tpsocket);
        console.log('add tpsocket to the pool, socketId=%s, pool size=%s', tpsocket.id, proxy_server_socket_pool.length);
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
    console.log('addLocalProxySocket, userId=%s, local_proxy_socket.length=%s', userId, local_proxy_socket.length);
    local_proxy_socket[userId + ''] = localSocket;
};
exports.clearLocalProxySocket = function () {
    for (var i = 0; i < local_proxy_socket.length; i++) {
        var tlsocketUserId = local_proxy_socket[i];
        for (var userId in tlsocketUserId) {
            var tlsocket = tlsocketUserId[userId];
            if (!tlsocket.destroyed) {
                tlsocket.end();
            }
        }
    }
};
exports.removeLocalProxySocket = function (userId) {
    console.log('removeLocalProxySocket, userId=%s, local_proxy_socket.length=%s', userId, local_proxy_socket.length);
    delete local_proxy_socket[userId];
};
exports.connection = connection;

function connection(port, host, callback, socketType) {
    var proxySocket = net.createConnection(port, host, function () {
        callback(proxySocket);
    });

    proxySocket.on('connect', function () {
        proxySocket.id = util.random('proxy');
        setInterval(function () {
            heartbeat(proxySocket);
        }, 1000 * 30);
        console.log('connect proxy server %s:%s success, type is %s, socketId=%s', host, port, socketType, proxySocket.id);
    });

    proxySocket.on('error', function (err) {
        console.log('error from sever, %s:%s, socketId=%s, err : %s', host, port, proxySocket.id, err);
        callback(null, err);
    });

    proxySocket.on('data', function (chunk) {
        var msg = encodeDecoder.decoder(chunk);
        console.log('recieved proxy message, type is %s, socketId=%s.', msg.type, proxySocket.id);
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
    });

    proxySocket.on('end', function () {
        console.log('disconnected from sever, %s:%s, sockId=%s', host, port, proxySocket.id);
        callback(proxySocket, null, 'end');
    });
    return proxySocket;
}

function heartbeat(proxySocket) {
    var msg = severMessage.getMessage(severMessage.TYPE_HEARTBEAT, 0, null, null);
    var buf = encodeDecoder.encoder(msg);
    proxySocket.write(buf);
    console.log('heartbeat time, socketId=%s', proxySocket.id);
}
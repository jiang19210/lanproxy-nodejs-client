var net = require('net');
var severMessage = require('./sever_message');
var proxyClientHandler = require('./proxy_client_handler');
var encodeDecoder = require('./encoder_decoder');
var util = require('./util');
var MAX_POOL_SIZE = 10;
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
    console.log(proxy_server_socket_pool.length > MAX_POOL_SIZE)
    if (proxy_server_socket_pool.length > MAX_POOL_SIZE) {
        tpsocket.end();
    } else {
        proxy_server_socket_pool.push(tpsocket);
        console.log('[socketId=%s]add tpsocket to the pool, pool size=%s', tpsocket.id, proxy_server_socket_pool.length);
    }
};
exports.removeProxySocket = function (tpsocket) {
    var index = indexOfSocket(tpsocket);
    if (index > -1) {
        proxy_server_socket_pool.splice(index, 1);
    }
    console.log('[socketId=%s]remove tpsocket from the pool, pool size=%s', tpsocket.id, proxy_server_socket_pool.length);
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
    console.log('[socketId=%s]addLocalProxySocket, userId=%s', localSocket.id, userId);
    local_proxy_socket[userId + ''] = localSocket;
};
exports.clearLocalProxySocket = function () {
    console.log('clearLocalProxySocket');
    for (var userId in local_proxy_socket) {
        var tlsocket = local_proxy_socket[userId];
        if (!tlsocket.destroyed) {
            console.log('clearLocalProxySocket userId=%s', userId);
            tlsocket.end();
        }
    }
    local_proxy_socket = {};
};
exports.removeLocalProxySocket = function (userId, localSocket) {
    console.log('[socketId=%s]removeLocalProxySocket, userId=%s', localSocket.id, userId);
    delete local_proxy_socket[userId];
};
exports.connection = connection;

function connection(port, host, callback, socketType) {
    var proxySocket = net.createConnection(port, host, function () {
        proxySocket.id = util.random(socketType);
        callback(proxySocket);
    });

    proxySocket.on('connect', function () {
        var intervalId = setInterval(function () {
            heartbeat(proxySocket);
        }, 1000 * 30);
        proxySocket.intervalId = intervalId;
        console.log('[socketId=%s]new connect proxy server %s:%s success, type=%s', proxySocket.id, host, port, socketType);
    });

    proxySocket.on('error', function (err) {
        console.log('[socketId=%s]error from proxy sever, %s:%s, err=%s', proxySocket.id, host, port, err);
        clearInterval(proxySocket.intervalId);
        callback(null, err);
    });

    proxySocket.on('data', function (chunk) {
        var msg = encodeDecoder.decoder(chunk);
        console.log('[socketId=%s]recieved proxy server message, type=%s', proxySocket.id, msg.type);
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
        console.log('[sockId=%s]close from proxy sever, %s:%s', proxySocket.id, host, port);
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
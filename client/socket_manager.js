var net = require('net');
var severMessage = require('./sever_message');

var proxy_server_socket_pool = [];
var local_proxy_socket = [];

exports.borrowProxySocket = function (callback) {
    var socket = proxy_server_socket_pool.pop();
    if (socket != null) {
        callback(socket);
    } else {
        socket = net.createConnection(severMessage.port, severMessage.host, function () {
            callback(socket);
        });
        socket.on('error', function (err) {
            callback(null);
        });
    }
};

exports.addLocalProxySocket = function (userId, localSocket) {
    local_proxy_socket[userId] = localSocket;
};


function connection(port, host, callback) {
    var proxySocket = net.createConnection(port, host, function () {
        console.log('connect proxy server %s:%s success', host, port);
        callback(proxySocket);
    });

    proxySocket.on('connect', function () {
        console.log('connect event')
    });

    proxySocket.on('error', function (err) {
        console.log('error from sever, %s:%s, err : %s', host, port, err);
        callback(null);
    });

    proxySocket.on('data', function (chunk) {
        if (Buffer.isBuffer(chunk)) {
            callback(chunk);
        } else {
            console.error("not buf")
        }
    });

    proxySocket.on('end', function () {
        console.log('disconnected from sever, %s:%s', host, port);
        proxySocket = connection(port, host);
    });

    return proxySocket;
}
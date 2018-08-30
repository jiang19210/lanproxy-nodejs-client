var encodeDecoder = require('./encoder_decoder');
var severMessage = require('./sever_message');
var socketManager = require('./socket_manager');
var net = require('net');
var util = require('./util');

/***
 * 和中转站的相关操作
 *
 * */
exports.connectionAuth = connectionAuth;

//连接并认证
function connectionAuth(port, host) {
    var proxySocket = socketManager.connection(port, host, function (proxySocket, err) {
        if (proxySocket != null) {
            var message = severMessage.getMessage(severMessage.C_TYPE_AUTH, 0, severMessage.clientkey, null);
            var buf = encodeDecoder.encoder(message);
            proxySocket.write(buf);
        } else {
            console.log('[socketId=%s]connect proxy server %s:%s is close', proxySocket.id, host, port);
            socketManager.clearLocalProxySocket();
            setTimeout(function () {
                proxySocket = connectionAuth(port, host);
            }, 1000 * 10);
        }
    }, 'proxySocket');
    return proxySocket;
};

exports.handlerConnectMessage = function (msg, proxySocket) {
    var userId = msg.uri;
    var data = msg.data.toString();
    var serverInfo = data.split(':');
    var ip = serverInfo[0];
    var port = parseInt(serverInfo[1]);
    var localSocket = net.createConnection(port, ip, function () {
        localSocket.id = util.random('local');
        console.log('[socketId=%s]new connect localproxy succes, %s:%s', localSocket.id, ip, port);
        socketManager.borrowProxySocket(function (tpsocket, err, end) {
            console.log('into borrowProxySocket, socketId=%s', tpsocket.id);
            if (tpsocket) {
                tpsocket.next_socket = localSocket;
                localSocket.next_socket = tpsocket;
                //远程绑定
                var pmsg = severMessage.getMessage(severMessage.TYPE_CONNECT, 0, userId + '@' + severMessage.clientkey);
                var pbuf = encodeDecoder.encoder(pmsg);
                tpsocket.write(pbuf);
                localSocket.userId = userId;
                socketManager.addLocalProxySocket(userId, localSocket);
            } else if (err) {
                console.log('[socketId=%s][tpsocket]borrowProxySocket err=%s', tpsocket.id, err);
                var pmsg = severMessage.getMessage(severMessage.TYPE_DISCONNECT, 0, userId, null);
                var pbuf = encodeDecoder.encoder(pmsg);
                proxySocket.write(pbuf);
            } else {
                console.log('[socketId=%s][tpsocket] end', tpsocket.id);
                var tlsocket = tpsocket.next_socket;
                console.log('[tpsocket]temp end log tlsocket destroyed=%s.', tpsocket.destroyed);
                if (!tlsocket.destroyed) {
                    tlsocket.end();
                }
                socketManager.removeProxySocket(tpsocket);
            }
        })
    });
    localSocket.on('error', function (err) {
        console.log('[socketId=%s][localSocket] err=%s', localSocket.id, err);
        var pmsg = severMessage.getMessage(severMessage.TYPE_DISCONNECT, 0, userId, null);
        var pbuf = encodeDecoder.encoder(pmsg);
        proxySocket.write(pbuf);
    });
    localSocket.on('end', function () {
        var userId = localSocket.userId;
        socketManager.removeLocalProxySocket(userId, localSocket);
        var tpsocket = localSocket.next_socket;
        if (tpsocket != null) {
            var dismsg = severMessage.getMessage(severMessage.TYPE_DISCONNECT, 0, userId, null);
            var dismsgbuf = encodeDecoder.encoder(dismsg);
            tpsocket.write(dismsgbuf);
        }
        console.log('[socketId=%s][localSocket] end', localSocket.id);
    });
    localSocket.on('data', function (chunk) {
        var tpsocket = localSocket.next_socket;
        if (tpsocket == null) {
            localSocket.end();
        } else {
            var userId = localSocket.userId;
            var transfermsg = severMessage.getMessage(severMessage.P_TYPE_TRANSFER, 0, userId, chunk);
            var transfermsgbuf = encodeDecoder.encoder(transfermsg);
            tpsocket.write(transfermsgbuf);
        }
    });
};


exports.handleDisconnectMessage = function (msg, tpsocket) {
    var localSocket = tpsocket.next_socket;
    if (localSocket != null) {
        delete tpsocket.next_socket;
        socketManager.addProxySocket(tpsocket);
        localSocket.write(new Buffer(0));
        localSocket.end();
    }
};


exports.handleTransferMessage = function (msg, tpsocket) {
    var localSocket = tpsocket.next_socket;
    if (localSocket != null) {
        var buf = msg.data;
        localSocket.write(buf);
    }
};
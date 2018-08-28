var encodeDecoder = require('./encoder_decoder');
var severMessage = require('./sever_message');
var socketManager = require('./socket_manager');
var net = require('net');

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
            console.log('connect proxy server %s:%s success', host, port);
        } else {
            console.log('connect proxy server %s:%s is close', host, port);
            proxySocket = connectionAuth();
        }
    });
    return proxySocket;
};

exports.heartbeat = function (proxySocket) {
    var msg = severMessage.getMessage(severMessage.TYPE_HEARTBEAT, 0, null, null);
    var buf = encodeDecoder.encoder(msg);
    proxySocket.write(buf);
    console.log('heartbeat time');
};

exports.handlerConnectMessage = function (msg, proxySocket) {
    console.log('handlerConnectMessage');
    var userId = msg.uri;
    var data = msg.data.toString();
    var serverInfo = data.split(':');
    var ip = serverInfo[0];
    var port = parseInt(serverInfo[1]);
    var localSocket = net.createConnection(port, ip, function () {
        console.log('connect localproxy succes, %s:s%', ip, port);
        socketManager.borrowProxySocket(function (tpsocket) {
            if (tpsocket) {
                tpsocket.next_socket = localSocket;
                localSocket.next_socket = tpsocket;
                //远程绑定
                var pmsg = severMessage.getMessage(severMessage.TYPE_CONNECT, 0, userId + '@' + severMessage.clientkey);
                var pbuf = encodeDecoder.encoder(pmsg);
                tpsocket.write(pbuf);
                localSocket.userId = userId;
                socketManager.addLocalProxySocket(userId, localSocket);
            } else {
                var pmsg = severMessage.getMessage(severMessage.TYPE_DISCONNECT, 0, userId, null);
                var pbuf = encodeDecoder.encoder(pmsg);
                proxySocket.write(pbuf);
                var tlsocket = tpsocket.next_socket;
                if (!tlsocket.destroyed) {
                    tlsocket.end();
                }
            }
        })
    });
    localSocket.on('error', function (err) {
        var pmsg = severMessage.getMessage(severMessage.TYPE_DISCONNECT, 0, userId, null);
        var pbuf = encodeDecoder.encoder(pmsg);
        proxySocket.write(pbuf);
    })
    localSocket.on('data', function (chunk) {
        var tpsocket = localSocket.next_socket;
        if (tpsocket == null) {
            localSocket.end();
        } else {

        }
        if (Buffer.isBuffer(chunk)) {
        } else {
            console.error("not buf")
        }
    });
};


exports.handleDisconnectMessage = function (msg, tpsocket) {
    console.log('handleDisconnectMessage');
    var localSocket = tpsocket.next_socket;
    if (localSocket != null) {
        delete tpsocket.next_socket;
        localSocket.write(Buffer.alloc(0));
        localSocket.end();
    }
};


exports.handleTransferMessage = function (msg, tpsocket) {
    console.log('handleTransferMessage');
    var localSocket = tpsocket.next_socket;
    if (localSocket != null) {
        var buf = msg.data;
        console.log('write data to local proxy, {}', buf.length);
        localSocket.write(buf);
    }
};
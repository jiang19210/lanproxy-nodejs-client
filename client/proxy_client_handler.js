var encodeDecoder = require('./encoder_decoder');
var severMessage = require('./sever_message');
var socketManager = require('./socket_manager');
var net = require('net');

/***
 * 和中转站的相关操作
 *
 * */
//连接并认证
exports.connection = connection;
exports.heartbeat = function (proxySocket) {
    var msg = severMessage.getMessage(severMessage.TYPE_HEARTBEAT, 0, null, null);
    var buf = encodeDecoder.encoder(msg);
    proxySocket.write(buf);
    console.log('heartbeat time');
};

function connection(port, host) {
    var proxySocket = net.createConnection(port, host, function () {
        var message = severMessage.getMessage(severMessage.C_TYPE_AUTH, 0, severMessage.clientkey, null);
        var buf = encodeDecoder.encoder(message);
        proxySocket.write(buf);
        console.log('connect proxy server %s:%s success', host, port)
    });

    proxySocket.on('connect', function () {
        console.log('connect event')
    });

    proxySocket.on('error', function (err) {
        console.log('error from sever, %s:%s, err : %s', host, port, err);
    });

    proxySocket.on('data', function (chunk) {
        if (Buffer.isBuffer(chunk)) {
            var msg = encodeDecoder.decoder(chunk);
            console.log('recieved proxy message, type is %s', msg.type);
            switch (msg.type) {
                case severMessage.TYPE_CONNECT :
                    handlerConnectMessage(msg);
                    break;
                case severMessage.TYPE_DISCONNECT :
                    handleDisconnectMessage(msg);
                    break;
                case severMessage.P_TYPE_TRANSFER:
                    handleTransferMessage(msg);
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
        proxySocket = connection(port, host);
    });

    return proxySocket;
}

function handlerConnectMessage(msg, proxySocket) {
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
                socketManager.addLocalProxySocket(userId, localSocket);
            } else {
                var pmsg = severMessage.getMessage(severMessage.TYPE_DISCONNECT, 0, userId, null);
                var pbuf = encodeDecoder.encoder(pmsg);
                proxySocket.write(pbuf);
            }
        })
    });
    localSocket.on('error', function (err) {
        var pmsg = severMessage.getMessage(severMessage.TYPE_DISCONNECT, 0, userId, null);
        var pbuf = encodeDecoder.encoder(pmsg);
        proxySocket.write(pbuf);
    })
}


function handleDisconnectMessage(msg, proxySocket) {
    console.log('handleDisconnectMessage');


}


function handleTransferMessage(msg) {
    console.log('handleTransferMessage')


}
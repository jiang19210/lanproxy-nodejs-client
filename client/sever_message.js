exports.getMessage = function (type, serialNumber, uri, data) {
    return {
        'type': type,
        'serialNumber': serialNumber,
        'uri': uri,
        'data': data
    }
};
exports.TYPE_HEARTBEAT = 0x07; //心跳消息
exports.C_TYPE_AUTH = 0x01;    //认证消息，检测clientKey是否正确
exports.TYPE_CONNECT = 0x03;   //代理后端服务器建立连接消息
exports.TYPE_DISCONNECT = 0x04; //代理后端服务器断开连接消息
exports.P_TYPE_TRANSFER = 0x05; //代理数据传输
exports.host = '192.168.20.142'; //lanproxy server的地址
exports.port = 4900;             //lanproxy server中配置的端口
exports.clientkey = '025e71dc47854c3681f87147176b19aa'; //lanproxy server 配置的key

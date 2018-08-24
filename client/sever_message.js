exports.getMessage = function (type, serialNumber, uri, data) {
    return {
        'type': type,
        'serialNumber': serialNumber,
        'uri': uri,
        'data': data
    }
};
exports.TYPE_HEARTBEAT = 0x07;
exports.C_TYPE_AUTH = 0x01;
exports.TYPE_CONNECT = 0x03;
exports.TYPE_DISCONNECT = 0x04;
exports.P_TYPE_TRANSFER = 0x05;
exports.host = '192.168.20.142';
exports.port = 4900;
exports.clientkey = '025e71dc47854c3681f87147176b19aa';

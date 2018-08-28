var TYPE_SIZE = 1, SERIAL_NUMBER_SIZE = 8, URI_LENGTH_SIZE = 1, HEADER_SIZE = 4;
exports.encoder = function (msg) {
    var bodyLength = TYPE_SIZE + SERIAL_NUMBER_SIZE + URI_LENGTH_SIZE;
    var uriBytesLength = 0;
    if (msg.uri != null) {
        uriBytesLength = Buffer.byteLength(msg.uri);
        bodyLength += uriBytesLength;
    }

    if (msg.data != null) {
        bodyLength += Buffer.byteLength(msg.data);
    }

    var buf = Buffer.alloc(bodyLength + HEADER_SIZE);
    var offset = 0;
    buf.writeUInt32BE(bodyLength, offset);
    offset += 4;
    buf.writeUInt8(msg.type, offset);
    offset += 1;
    buf.writeUInt32BE(msg.serialNumber >> 8, offset); //write the high order bits (shifted over)
    offset += 4;
    buf.writeUInt32BE(msg.serialNumber & 0x00ff, offset);
    offset += 4;
    if (msg.uri != null) {
        buf.writeUInt8(uriBytesLength, offset);
        offset += 1;
        buf.write(msg.uri, offset);
        offset += uriBytesLength;
    } else {
        buf.writeUInt8(0x00);
        offset += 1;
    }
    if (msg.data != null) {
        buf.write(msg.data, offset);
    }
    return buf;
};

exports.decoder = function (buff) {
    var buf = buff;
    if (buf == null) {
        return null;
    }
    if (buf.length < HEADER_SIZE) {
        return null;
    }
    var offset = 0;
    var frameLength = buf.readUInt32BE(offset);
    if (buf.length < frameLength) {
        return null;
    }
    offset += 4;

    var type = buf.readUInt8(offset);
    offset += 1;
    var sn = (buf.readUInt32BE(offset) << 8) + buf.readUInt32BE(offset + 4);
    offset += 8;
    var uriLength = buf.readUInt8(offset);
    offset += 1;
    var uriBuf = Buffer.alloc(uriLength);
    buf.copy(uriBuf, 0, offset, offset + uriLength);
    offset += uriLength;
    var uri = uriBuf.toString();

    var dataBuf = Buffer.alloc(frameLength - TYPE_SIZE - SERIAL_NUMBER_SIZE - URI_LENGTH_SIZE - uriLength);
    buf.copy(dataBuf, 0, offset, offset + dataBuf.length);

    return {
        'type': type,
        'serialNumber': sn,
        'uri': uri,
        'data': dataBuf
    }
};

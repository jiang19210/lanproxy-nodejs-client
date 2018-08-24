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

    var bufLength = bodyLength - SERIAL_NUMBER_SIZE + HEADER_SIZE;
    var buf = Buffer.alloc(bufLength);
    var offset = 0;
    buf.writeUInt32BE(bodyLength, offset);
    offset += 4;
    buf.writeUInt8(msg.type, offset);
    offset += 1;
    var serialNumberBuf = this.buffer64(msg.serialNumber);
    buf = Buffer.concat([buf, serialNumberBuf]);
    offset += 8;
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

exports.decoder = function (message) {

};

exports.buffer64 = function (i) {
    var buf = Buffer.alloc(8);
    buf.writeUInt32BE(i >> 8, 0); //write the high order bits (shifted over)
    buf.writeUInt32BE(i & 0x00ff, 4);
    return buf;
};
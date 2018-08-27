const net = require('net');
const client = net.createConnection({ port: 8124 }, () => {
    //'connect' listener
    console.log('connected to server!');
    var buf = Buffer.allocUnsafe(2);
    buf.writeInt8(0x07,0);
    buf.writeInt8(0x08,1);
    client.write(buf);
});
client.on('data', (chunk) => {
    console.log(chunk.length)
    console.log(chunk.readInt8(0))
    console.log(chunk.readInt8(1))
    client.end();
});
client.on('end', () => {
    console.log('disconnected from server');
});
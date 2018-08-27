const net = require('net');
const server = net.createServer((c) => {
    // 'connection' listener
    console.log('client connected');
    c.on('end', () => {
        console.log('client disconnected');
    });
    c.pipe(c);
});
server.on('error', (err) => {
    throw err;
});
server.listen(8124, () => {
    console.log('server bound');
});
var http = require('http');
var net = require('net');
var url = require('url');

// 创建一个 HTTP 代理服务器
var proxy = http.createServer(function (req, res) {
    var _url = req.url;
    var urlObj = url.parse(_url);
    var port = urlObj.port;
    var hostname = urlObj.hostname;
    var options = {
        'host': hostname,
        'port': port,
        'method': req.method,
        'path': _url,
        'headers': req.headers,
        'agent': req.agent,
        'auth': req.auth
    };

    console.log('request options ==>' + JSON.stringify(options));
    var proxyReq = http.request(options, function (proxyRes) {
        res.writeHead(proxyRes.statusCode, safety(proxyRes.headers));
        proxyRes.on('data', function (chunk) {
            res.write(chunk);
        });
        proxyRes.on('end', function () {
            res.end();
        });
    });
    req.on('data', function (chunk) {
        proxyReq.write(chunk);
    });
    req.on('end', function () {
        proxyReq.end()
    });
    proxyReq.on('socket', function (socket) {
        socket.on('error', function (error) {
            console.log('socket : ' + error);
        });
    });
    proxyReq.on('error', function (error) {
        console.log('error : ' + error);
    });

});
console.log('start port 5488');
proxy.listen('5488');

proxy.on('connect', function (req, cltSocket, head) {
    // 连接到一个服务器
    var srvUrl = url.parse('http://' + req.url);
    console.log('connect url : ' + req.url);
    var srvSocket = net.connect(srvUrl.port, srvUrl.hostname, function () {
        cltSocket.write('HTTP/1.1 200 Connection Established\r\nProxy-agent: Node.js-Proxy\r\n\r\n');
        srvSocket.write(head);
        srvSocket.pipe(cltSocket);
        cltSocket.pipe(srvSocket);
    });
    srvSocket.on('error', function (error) {
        console.log('srvSocket : ' + error);
        cltSocket.end();
    });
    cltSocket.on('error', function (error) {
        console.log('cltSocket : ' + error);
        srvSocket.end();
    })
});

function safety(headers) {
    var result = {};
    for (var i in headers) {
        var item = headers[i];
        if (toString.call(item) === '[object Object]') {
            result[i] = safety(item);
        } else if (toString.call(item) === '[object Array]') {
            var a = [];
            for (var j = 0; j < item.length; j++) {
                a.push(tostring(item[j]));
            }
            result[i] = a;
        } else {
            result[i] = tostring(item);
        }
    }

    return result;
}

function tostring(str) {
    if (/[\u4e00-\u9fa5]/.test(str)) {
        return url_encode(str);
    }
    return str;
}

function url_encode(url) {
    url = encodeURIComponent(url);
    url = url.replace(/\%3A/g, ":");
    url = url.replace(/\%2F/g, "/");
    url = url.replace(/\%3F/g, "?");
    url = url.replace(/\%3D/g, "=");
    url = url.replace(/\%26/g, "&");
    return url;
}
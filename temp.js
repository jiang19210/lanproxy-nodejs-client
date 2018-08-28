
var crypto = require('crypto');
function token () {
    var buf = crypto.randomBytes(16);
    return buf.toString('hex');
}

console.log(token())
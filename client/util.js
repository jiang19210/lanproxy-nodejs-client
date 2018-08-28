var crypto = require('crypto');
exports.random = function () {
    var buf = crypto.randomBytes(16);
    return buf.toString('hex');
};
var crypto = require('crypto');
exports.randomUUID = function () {
    var buf = crypto.randomBytes(16);
    return buf.toString('hex');
};

exports.random = function (pre) {
    return pre + '-' + Math.round(Math.random() * 1000000);
}
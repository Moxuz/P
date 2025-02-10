const crypto = require('crypto');
const JWT_SECRET = crypto.randomBytes(32).toString('hex'); // 256-bit secret
//const JWT_SECRET = 'ffe4303c14c4bc845f917babe9cd9934f45f2954a64f898d98346f14c1b90e6c';
//console.log('Generated JWT Secret:', JWT_SECRET);

module.exports = {
    JWT_SECRET: JWT_SECRET
};

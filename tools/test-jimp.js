const J = require('jimp');
console.log('J type', typeof J);
console.log('keys', Object.keys(J));
console.log('has read?', !!J.read, 'has default?', !!J.default);
console.log('read type', typeof J.read, 'default type', typeof J.default);

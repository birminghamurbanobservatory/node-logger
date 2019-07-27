const { stringify } = require('q-i');
 
const obj = {foo: 'bar', quz: 43, fish: true};
 
// print(obj);
console.log(stringify(obj));
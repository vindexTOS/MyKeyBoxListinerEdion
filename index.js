console.log('movida');
const http = require('http')
console.log('movida2');

const httpProxy = require('http-proxy')

console.log('movida3');
const DoorLockerWrapper = require('./src/helpers/locker')
console.log('movida4');
const Controller = require('./src/controllers/base')
console.log('movida5');
const locker = new DoorLockerWrapper(require('./data/lockers'), '/dev/ttyUSB0', 19200)
console.log('movida6');
const controller = new Controller(locker, httpProxy)
console.log('movida7');
http.createServer((request, response) => {
    controller.handle(request, response)
}).listen(14141, '127.0.0.1')

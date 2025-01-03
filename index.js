const http = require('http')
const httpProxy = require('http-proxy')
const DoorLockerWrapper = require('./src/helpers/locker')
const Controller = require('./src/controllers/base')

console.log('---------------------------------------------------------')
console.log('---------------------------------------------------------')
console.log('---------------------------------------------------------')
console.log('Starting backend...')
console.log('---------------------')

const locker = new DoorLockerWrapper(require('./data/lockers'), '/dev/ttyUSB0', 19200)
// const locker = new DoorLockerWrapper(require('./data/lockers'), '/dev/ttyUSB1', 19200)

const controller = new Controller(locker, httpProxy)
http.createServer((request, response) => {
    controller.handle(request, response)
}).listen(14141, '127.0.0.1')

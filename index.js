const http = require('http'); // Loads the http module 
const DoorLockerWrapper = require('./src/helpers/locker')
const Controller = require('./src/controllers/base')

const locker = new DoorLockerWrapper(require('./data/lockers'), '/dev/ttyUSB0', 19200)

const controller = new Controller(locker)

http.createServer((request, response) => {
    controller.handle(request, response)
}).listen(1337);

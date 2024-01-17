const {SerialPort} = require("serialport");
const {ByteLengthParser} = require("@serialport/parser-byte-length");

module.exports = class DoorLockerWrapper {
    constructor(lockers, devicePath, baudRate) {
        this.lockers = lockers

        this.port = new SerialPort({path: devicePath, baudRate: baudRate})
        this.parser = this.port.pipe(new ByteLengthParser({length: 9}))

        console.log(this.port && this.port.port ? this.port.port.isOpen : 'daketilia jigo')

        this.last_response_time = 0;

        this.closedDoorsState = []
        this.getDoorsArray().forEach(() => {
            this.closedDoorsState.push(false)
        })

        this.listenDoors()

        setInterval(() => {
            this.prepareDoorStates()
        }, 500)
    }

    touchLastResponse() {
        this.last_response_time = this.getCurrentTime()
    }

    getCurrentTime() {
        return new Date().getTime()
    }

    isDeviceUp(timeout = 2500) {
        console.log(this.port && this.port.port ? this.port.port.isOpen : 'daketilia jigo2')
        return this.last_response_time + timeout > this.getCurrentTime()
    }

    getDoorsArray() {
        let result = []
        this.lockers.forEach((data) => {
            result = result.concat(data.doors)
        })
        return result
    }

    listenDoors() {
        this.parser.on('data', (segmentData) => {
            let hex = segmentData.toString('hex') // Hex data
            let pairs = hex.match(/.{1,2}/g) // 2 chars (hex bytes)

            let doorSegment = parseInt(pairs[1][0])

            let doors = this.hex2bin(pairs[3]) + this.hex2bin(pairs[4])

            let offset = 0

            if (doorSegment > 0) {
                for (let i = 0; i < this.lockers.length && i < doorSegment; i++) {
                    offset += this.lockers[i].doors.length
                }
            }

            this.binaryToDoorsArray(doors).forEach((value, index) => {
                this.closedDoorsState[index + offset] = value
            })

            this.touchLastResponse()
        })
    }

    binaryToDoorsArray(binary) {
        let predefinedSorting = [
            7,
            6,
            5,
            4,
            3,
            2,
            1,
            0,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
        ]

        let result = []

        predefinedSorting.forEach((index) => {
            result.push(binary[index] !== '0')
        })

        return result
    }

    prepareDoorStates() {
        this.lockers.forEach((data) => {
            this.write(data.segment)
        })
    }

    getClosedDoorsState() {
        return this.closedDoorsState
    }

    openDoor(doorNumber) {
        let doors = this.getDoorsArray()
        if (doorNumber >= 0 && doorNumber < doors.length) {
            this.write(doors[doorNumber])
            return true
        }
        return false
    }

    hex2bin(hex) {
        return (parseInt(hex, 16).toString(2)).padStart(8, '0');
    }

    getBuffer(str) {
        let hexString = str.split(' ').map((hex) => parseInt(hex, 16));
        return Buffer.from(hexString);
    }

    write(command) {
        this.port.write(this.getBuffer(command))
    }
}

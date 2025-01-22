const fs = require('fs')
const axios = require('axios')

module.exports = class Controller {
    API_KEY = 'z7#D4k9@A9'
    TEST_API_BASE = 'http://back.mykeybox.com:32769'
    API_BASE = 'http://back.mykeybox.com:32769'

    UNIQUE_CODE_LENGTH = 7
    UNIQUE_CODE_FILENAME = 'device.uniquecode.txt'

    unique_code = '65756'

    TEST_DEVICES_UNIQUE_CODES = [
        '65756',
        // '9647188', // This line has been commented out at Roma's request
    ]

    constructor(locker, httpProxy) {

        this.readOrCreateUniqueCode().then(() => {
            console.log(this.getApiBaseDependingOnUniqueCode(), "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<,")

            this.locker = locker

            this.httpProxy = httpProxy.createProxyServer({
                target: this.getApiBaseDependingOnUniqueCode(),
                changeOrigin: true,
                selfHandleResponse: true,
            })

            console.log('API is: ' + this.httpProxy.options.target)

            this.exchangeDeviceInfo()

            this.httpProxy.on('proxyRes', function (proxyRes, req, res) {
                proxyRes.headers['access-control-allow-origin'] = '*'
                res.writeHead(proxyRes.statusCode, proxyRes.headers)
                proxyRes.pipe(res)
            })

            this.httpProxy.on('error', (err, req, res) => {
                console.error('Proxy error', err)
                if (err.code === 'ETIMEDOUT') {
                    res.writeHead(504, { 'Content-Type': 'text/plain' })
                    res.end('Gateway Timeout')
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' })
                    res.end('Internal Server Error')
                }
            })

            this.httpProxy.timeout = 10000
        })
    }

    getApiBaseDependingOnUniqueCode() {

        return this.TEST_DEVICES_UNIQUE_CODES.includes(this.unique_code) ? this.TEST_API_BASE : this.API_BASE
    }

    async readOrCreateUniqueCode() {
        const getRandomNumber = (min, max) => {
            return Math.floor(Math.random() * (max - min + 1)) + min
        }

        const checkIfCodeExistsRemote = async (code) => {
            try {
                const url = this.API_BASE + '/' + 'dealership-module/BoxAndLocker/VerifyUniqueCode?uniqueCode=' + code
                console.log(url)
                const response = await axios.get(url, {
                    headers: {
                        'ApiKey': this.API_KEY,
                    }
                })

                console.log(response)
                return response.status === 200
            } catch (error) {
                return false
            }
        }

        const generateAndStoreCode = async () => {
            while (true) {
                const code = getRandomNumber(10 ** (this.UNIQUE_CODE_LENGTH - 1), 10 ** this.UNIQUE_CODE_LENGTH - 1).toString()
                if (!(await checkIfCodeExistsRemote(code))) {
                    fs.writeFileSync(this.UNIQUE_CODE_FILENAME, code)
                    this.unique_code = code
                    break
                }
            }
        }

        if (!fs.existsSync(this.UNIQUE_CODE_FILENAME)) {
            await generateAndStoreCode()
        } else {
            this.unique_code = fs.readFileSync(this.UNIQUE_CODE_FILENAME, 'utf8').trim()
            if (this.unique_code.length !== this.UNIQUE_CODE_LENGTH) {
                await generateAndStoreCode()
            }
        }
    }
    // every 60 seconds this gets fetched from server and gets boxes information
    exchangeDeviceInfo() {
        let url = this.getApiBaseDependingOnUniqueCode() + '/' + this.getAPIUrl(`GetBoxesByUniqueKey/${this.unique_code}`)
        console.log('exchangeDeviceInfo:GetBoxes:url: ' + url)
        axios.get(url, {
            headers: { 'ApiKey': this.API_KEY },
        }).then((r) => {
            if (r.data) {
                console.log('exchangeDeviceInfo:GetBoxes OK', r.data)
                let boxes = []
                r.data.boxes.forEach((box) => {
                    let boxData = { ...box }

                    boxes.push(boxData)
                })
                const exchangeInfo = () => {
                    let doors = this.locker.getClosedDoorsState().map(i => i ? 1 : 0)
                    for (let i = 0; i < boxes.length; i++) {
                        boxes[i]['boxStatus'] = doors[i] ? 'close' : 'open'
                    }

                    let exchangeDeviceInformationUrl = this.getApiBaseDependingOnUniqueCode() + '/' + this.getAPIUrl(`ExchangeDeviceInformation`)
                    console.log('exchangeDeviceInfo:exchangeInfo:url: ', exchangeDeviceInformationUrl)
                    console.log(exchangeDeviceInformationUrl)
                    axios.post(exchangeDeviceInformationUrl, {
                        deviceInfo: boxes,
                        uniqueCode: this.unique_code,
                    }, {
                        headers: { 'ApiKey': this.API_KEY },
                    }).then((r) => {
                        console.log('exchangeDeviceInfo:ExchangeDeviceInformation OK', r.data)
                        if (r.data) {
                            r.data.forEach(boxToOpen => {
                                boxes.forEach((box, index) => {
                                    if (box.boxId === boxToOpen.boxId) {
                                        this.locker.openDoor(index)
                                    }
                                })
                            })
                        }
                    }).catch((e) => {
                        console.log('exchangeDeviceInfo:ExchangeDeviceInformation FAIL: ' + e.message)
                    })
                }

                setInterval(exchangeInfo, 60 * 1000)
                exchangeInfo()
            } else {
                console.log('exchangeDeviceInfo:GetBoxes OK but empty | retry in 30 seconds')
                setTimeout(() => this.exchangeDeviceInfo(), 30 * 1000)
            }
        }).catch((e) => {
            console.log('exchangeDeviceInfo:GetBoxes FAIL: ' + e.message + ' | retry in 10 seconds')
            setTimeout(() => this.exchangeDeviceInfo(), 10 * 1000)
        });
    }

    check(request, response) {
        this.response(response, {
            'doors': this.locker.getClosedDoorsState().map(i => i ? 1 : 0),
        }, 200)
    }

    deviceCode(request, response) {
        this.response(response, {
            'code': this.unique_code,
        }, 200)
    }

    open(number, request, response) {
        if (this.locker.openDoor(number)) {
            this.response(response, {
                'code': 'door_opened',
                'message': `Door ${number} opened!`,
            })
        } else {
            this.response(response, {
                'code': 'invalid_door_number',
                'message': 'Invalid door provided',
            }, 400)
        }
    }

    proxyToThirdPartyApi(url, request, response) {
        try {

 

            request.headers['ApiKey'] = this.API_KEY
            // const separator = url.includes('?') ? '&' : '?'
            if (url.includes('GetOrderByDoorCode')) {
                request.url = this.API_BASE + "/order-module/Order/" + url + "/" + this.unique_code
                console.log(request.url, "SENDING ON THIS URL ETC GET ORDER ")

                this.httpProxy.web(request, response)

            } else if (url.includes('InitializeOrder')) {
                request.url =  this.API_BASE + "/" + this.getAPIUrl(url)
                this.httpProxy.web(request, response)

            } 
             else if(url.includes("SetOrderStatus")){
                request.url =  this.API_BASE + '/order-module/Order/' + 'SetOrderStatus'
                console.log(request.url, "SENDING ON THIS URL ETC ")
                console.log(request.url )
                console.log(request.url, "SENDING ON THIS URL ETC ")

                this.httpProxy.web(request, response)
             } else if(url.includes('GetBoxesByUniqueKey')){
                request.url =  this.API_BASE + "/" + this.getAPIUrl(url)

                this.httpProxy.web(request, response)

             }else if (url.includes("GetLanguage")){
                request.url =  this.API_BASE + "/" + this.getAPIUrl(url)
                this.httpProxy.web(request, response)

             }
            else {
                request.url = this.getAPIUrl(url + "/" + this.unique_code)
                this.httpProxy.web(request, response)

            }
            // console.log('2', request.url)

        } catch (err) {
            this.response(response, {
                'code': 'error',
                'message': err.message,
            }, 400)
        }
    }

    invalidRequest(request, response) {
        this.response(response, {
            'code': 'invalid_request',
            'message': 'Invalid request',
        }, 400)
    }




    handle(request, response) {




        if (request.url === '/device_code') {
            return this.deviceCode(request, response)
        }
        if (!this.unique_code || !this.locker.isDeviceUp()) {
            return this.response(response, {
                'code': 'device',
                'message': 'Device is not connected successfully!',
            }, 400)
        }
        if (request.url === '/check') {
            this.check(request, response)
        } else if (request.url.startsWith('/open')) {
            let split = request.url.split('/')
            this.open(parseInt(split[split.length - 1]), request, response)
        } else if (request.url.startsWith('/api')) {
            let split = request.url.split('/')

            this.proxyToThirdPartyApi(split.filter((i) => i !== '').slice(1).join('/'), request, response)

        } else {
            this.invalidRequest(request, response)
        }
    }

    response(response, content, responseStatus = 200) {
        response.setHeader('access-control-allow-origin', '*')

        let contentType = 'text/html'
        if (typeof content === 'object') {
            contentType = 'application/json'
            content = JSON.stringify(content)
        }
        response.writeHead(responseStatus, {
            'Content-Type': contentType,
        })
        response.write(content)
        response.end()
    }

    getAPIUrl(url) {
        return 'dealership-module/BoxAndLocker/' + url
    }
}

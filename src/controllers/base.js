module.exports = class Controller {
    constructor(locker) {
        this.locker = locker
    }

    check(request, response) {
        this.responseJSON(response, {
            'closed_doors': this.locker.getClosedDoorsState(),
        }, 200)
    }

    open(number, request, response) {
        if (this.locker.openDoor(number)) {
            this.responseJSON(response, {
                'code': 'door_opened',
                'message': `Door ${number} opened!`,
            })
        } else {
            this.responseJSON(response, {
                'code': 'invalid_door_number',
                'message': 'Invalid door provided',
            }, 400)
        }
    }

    proxyToThirdPartyApi(url, request, response) {
        this.responseJSON(response, {
            'message': url
        })
    }

    invalidRequest(request, response) {
        this.responseJSON(response, {
            'code': 'invalid_request',
            'message': 'Invalid request',
        }, 400)
    }

    handle(request, response) {
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

    responseJSON(response, data, responseStatus = 200) {
        response.writeHead(responseStatus, {
            'Content-Type': 'application/json',
        })
        response.write(JSON.stringify(data))
        response.end()
    }
}

module.exports = class Controller {
    constructor(locker, httpProxy) {
        this.locker = locker
        this.httpProxy = httpProxy.createProxyServer({
            target: 'https://mykeybox.com',
            changeOrigin: true,
            selfHandleResponse: true,
        })
        this.httpProxy.on('proxyRes', function(proxyRes, req, res) {
            proxyRes.headers['access-control-allow-origin'] = '*';
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        this.httpProxy.on('error', (err, req, res) => {
            console.error('Proxy error', err);
            if (err.code === 'ETIMEDOUT') {
                // Handle timeout error gracefully
                res.writeHead(504, { 'Content-Type': 'text/plain' });
                res.end('Gateway Timeout');
            } else {
                // Handle other errors
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        });

        this.httpProxy.timeout = 10000
    }

    check(request, response) {
        this.response(response, {
            'closed_doors': this.locker.getClosedDoorsState().map(i => i ? 1 : 0),
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
            request.headers['ApiKey'] = 'z7#D4k9@A9'
            request.url = 'Umbraco/Api/MyKeyBoxOrder/' + url
            this.httpProxy.web(request, response)
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
        if (!this.locker.isDeviceUp()) {
            this.response(response, {
                'code': 'device',
                'message': 'Device is not connected successfully!',
            }, 400)
            return
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
}

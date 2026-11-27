/* CEP 9-compatible transport. No persistent credentials, redirects or TLS bypass. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require);
    } else {
        root.StudioSetConnector = factory(root.cep_node && root.cep_node.require ? root.cep_node.require : (typeof require === 'function' ? require : null));
    }
}(this, function (load) {
    'use strict';
    var PREFIX = '/api/illustrator/v1/';
    var MAX_BYTES = 2 * 1024 * 1024;
    function Connector(origin) {
        if (!load) throw new Error('CEP Node runtime required');
        this.https = load('https');
        var url = load('url');
        var parsed = url.parse(origin);
        if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.auth ||
            parsed.search || parsed.hash || (parsed.pathname && parsed.pathname !== '/') ||
            /[\\\s]/.test(origin)) throw new Error('Enter an HTTPS server origin only');
        this.hostname = parsed.hostname;
        this.port = parsed.port || 443;
        this.origin = parsed.protocol + '//' + parsed.host;
        this.token = '';
    }
    Connector.prototype.setToken = function (token) {
        if (typeof token !== 'string' || !/^isc1_[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('Invalid connector token');
        this.token = token;
    };
    Connector.prototype.clearToken = function () { this.token = ''; };
    Connector.prototype.accountUrl = function () { return this.origin + '/account/illustrator-connector'; };
    Connector.prototype._request = function (method, path) {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (!self.token) return reject(new Error('Connector token required'));
            var request = self.https.request({
                hostname: self.hostname, port: self.port, method: method,
                path: PREFIX + path,
                rejectUnauthorized: true,
                headers: {Authorization: 'Bearer ' + self.token, Accept: 'application/json'}
            }, function (response) {
                var status = response.statusCode;
                if (status >= 300 && status < 400) {
                    response.resume();
                    return reject(new Error('Redirect refused'));
                }
                var length = 0, chunks = [];
                response.on('error', reject);
                response.on('aborted', function () { reject(new Error('Response interrupted')); });
                response.on('data', function (chunk) {
                    length += chunk.length;
                    if (length > MAX_BYTES) { request.destroy(); reject(new Error('Response too large')); return; }
                    chunks.push(chunk);
                });
                response.on('end', function () {
                    if (status === 401) self.clearToken();
                    if (status < 200 || status >= 300) return reject(new Error('Connector HTTP ' + status));
                    try {
                        var data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                        if (data.api_version !== 1) throw new Error('Unsupported connector API');
                        resolve(data);
                    } catch (err) { reject(err); }
                });
            });
            request.setTimeout(15000, function () { request.destroy(); reject(new Error('Connector timeout')); });
            request.on('error', reject);
            request.end();
        });
    };
    Connector.prototype.capabilities = function () { return this._request('GET', 'capabilities'); };
    Connector.prototype.families = function (offset, limit) {
        if (!Number.isInteger(offset) || offset < 0 || offset > 1000000 ||
            !Number.isInteger(limit) || limit < 1 || limit > 200) return Promise.reject(new Error('Invalid pagination'));
        return this._request('GET', 'families?offset=' + offset + '&limit=' + limit);
    };
    Connector.prototype.facets = function (field, query, offset, limit) {
        if (['content_tags','tags','collections','xmp_labels'].indexOf(field)<0 ||
            typeof query!=='string' || query.length>100 || !Number.isInteger(offset) ||
            offset<0 || offset>1000000 || !Number.isInteger(limit) || limit<1 || limit>200)
            return Promise.reject(new Error('Invalid facet query'));
        return this._request('GET','facets?field='+encodeURIComponent(field)+'&q='+encodeURIComponent(query)+'&offset='+offset+'&limit='+limit);
    };
    Connector.prototype.revoke = function () {
        var self = this;
        return self._request('POST', 'revoke').then(function (data) { self.clearToken(); return data; }, function (error) { self.clearToken(); throw error; });
    };
    return Connector;
}));

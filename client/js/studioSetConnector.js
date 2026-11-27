/* CEP 9-compatible transport. No persistent credentials, redirects or TLS bypass. */
(function (root, factory) {
    if (typeof window === 'undefined' && typeof module === 'object' && module.exports) {
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
    Connector.prototype._request = function (method, path, payload) {
        var self = this;
        return new Promise(function (resolve, reject) {
            if (!self.token) return reject(new Error('Connector token required'));
            var body = payload === undefined ? null : JSON.stringify(payload);
            if (body !== null && Buffer.byteLength(body,'utf8') > 24*1024*1024) return reject(new Error('Publication request too large'));
            var headers = {Authorization: 'Bearer ' + self.token, Accept: 'application/json'};
            if (body !== null) { headers['Content-Type']='application/json'; headers['Content-Length']=Buffer.byteLength(body,'utf8'); }
            var request = self.https.request({
                hostname: self.hostname, port: self.port, method: method,
                path: PREFIX + path,
                rejectUnauthorized: true,
                headers: headers
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
                    if (status < 200 || status >= 300) {
                        var error = new Error('Connector HTTP ' + status);
                        error.status = status;
                        try {
                            var details = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                            if (details.api_version === 1 && details.error && typeof details.error.code === 'string') error.code = details.error.code;
                        } catch (ignored) {}
                        return reject(error);
                    }
                    try {
                        var data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                        if (data.api_version !== 1) throw new Error('Unsupported connector API');
                        resolve(data);
                    } catch (err) { reject(err); }
                });
            });
            request.setTimeout(path === 'publish' ? 120000 : 15000, function () { request.destroy(); reject(new Error('Connector timeout')); });
            request.on('error', reject);
            if (body !== null) request.write(body,'utf8');
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
    // Availability is advisory, not a reservation. Repeat at upload commit.
    Connector.prototype.checkIdentity = function (family, name, role) {
        if (![family,name,role].every(function(v){return typeof v==='string' && v.length<=200;}))
            return Promise.reject(new Error('Invalid identity query'));
        return this._request('GET','identity?family='+encodeURIComponent(family)+'&name='+encodeURIComponent(name)+'&role='+encodeURIComponent(role));
    };
    Connector.prototype.reserveFamily = function (family, name) {
        if (typeof family !== 'string' || family.length>200 || typeof name !== 'string' || name.length>200)
            return Promise.reject(new Error('Invalid family reservation'));
        return this._request('POST','family-reservations',{family:family,name:name});
    };
    Connector.prototype.releaseFamily = function (reservationId) {
        if (typeof reservationId !== 'string' || !reservationId || reservationId.length>100)
            return Promise.reject(new Error('Invalid reservation ID'));
        return this._request('POST','family-reservations/release',{reservation_id:reservationId});
    };
    Connector.prototype.newPublicationId = function () {
        return load('crypto').randomBytes(16).toString('hex');
    };
    Connector.prototype.publish = function (payload) {
        if (!payload || typeof payload.request_id !== 'string' || !/^[a-f0-9]{32}$/.test(payload.request_id) ||
            ['new_family','existing_family','standalone'].indexOf(payload.mode)<0 ||
            !Array.isArray(payload.items) || !payload.items.length || payload.items.length>40)
            return Promise.reject(new Error('Invalid publication batch'));
        var bytes=0;
        for(var i=0;i<payload.items.length;i++){
            var item=payload.items[i];
            if (!item || typeof item.base64!=='string' || !/^[a-f0-9]{64}$/.test(item.file_hash || ''))
                return Promise.reject(new Error('Invalid artwork payload'));
            bytes+=Buffer.byteLength(item.base64,'base64');
        }
        if(bytes>16*1024*1024)return Promise.reject(new Error('Publication batch exceeds 16 MiB'));
        // Caller must keep exactly the same payload and request ID on uncertain network failure.
        return this._request('POST','publish',payload);
    };
    Connector.prototype.publicationStatus = function (id) {
        if(typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id))return Promise.reject(new Error('Invalid request ID'));
        return this._request('GET','publication-status?request_id='+id);
    };
    Connector.prototype.searchCatalog = function (filters,offset) {
        if(!Number.isInteger(offset)||offset<0||offset>1000000)return Promise.reject(new Error('Invalid offset'));
        var query=['offset='+offset];
        ['q','family','kind','age','popular'].forEach(function(key){
            if(filters&&typeof filters[key]==='string'&&filters[key].length<=200)query.push(key+'='+encodeURIComponent(filters[key]));
        });
        return this._request('GET','catalog?'+query.join('&'));
    };
    Connector.prototype.downloadSvg = function (id) {
        if(typeof id!=='string'||!/^studio-[a-f0-9]{32}$/.test(id))return Promise.reject(new Error('Unsupported asset'));
        return this._request('GET','download-svg?id='+id).then(function(data){
            if(data.id!==id||typeof data.base64!=='string'||data.base64.length>1400000)throw Error('Invalid artwork response');
            var bytes=new Buffer(data.base64,'base64');
            if(load('crypto').createHash('sha256').update(bytes).digest('hex')!==data.file_hash)throw Error('Artwork hash mismatch');
            return data;
        });
    };
    Connector.prototype.editMetadata = function (id,revision,patch) {
        if(!/^studio-[a-f0-9]{32}$/.test(id)||!/^[a-f0-9]{64}$/.test(revision)||!patch||typeof patch!=='object')
            return Promise.reject(new Error('Invalid metadata revision'));
        return this._request('POST','metadata',{id:id,revision:revision,patch:patch});
    };
    Connector.prototype.revoke = function () {
        var self = this;
        return self._request('POST', 'revoke').then(function (data) { self.clearToken(); return data; }, function (error) { self.clearToken(); throw error; });
    };
    return Connector;
}));

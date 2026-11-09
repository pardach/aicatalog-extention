/* Pardach Direct Upload / CEP Node.js transport.
 * HTTPS only, bearer tokens are memory-only. Never persist credentials.
 * Uses the existing Pardach catalog batch endpoint (not a new API).
 */
(function () {
    'use strict';
    var ui = function (id) { return document.getElementById(id); };
    var state = { server: '', access: '', username: '', busy: false, selection: null };
    var https, fs, crypto;
    try { https = require('https'); fs = require('fs'); crypto = require('crypto'); }
    catch (_) { /* Runtime check below gives a human-readable error. */ }
    function status(message, type) {
        ui('status').textContent = message;
        ui('status').className = type || '';
    }
    function busy(value) {
        state.busy = value;
        ['loginBtn', 'inspectBtn', 'uploadBtn'].forEach(function (id) { ui(id).disabled = value; });
    }
    function ensureServer(text) {
        var url = new URL(String(text || '').trim());
        if (url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
            url.search || url.hash || (url.pathname && url.pathname !== '/')) {
            throw new Error('آدرس سرور باید فقط به صورت https://domain باشد.');
        }
        return url.origin;
    }
    function request(path, method, payload, authHeader, isMultipart) {
        return new Promise(function (resolve, reject) {
            var dest = new URL(path, state.server + '/');
            var base = new URL(state.server);
            if (dest.origin !== base.origin || dest.protocol !== 'https:') {
                return reject(new Error('درخواست خارج از دامنه مجاز مسدود شد'));
            }
            var headers = { 'Accept': 'application/json' };
            if (authHeader) headers.Authorization = 'Bearer ' + authHeader;
            if (payload) {
                headers['Content-Type'] = isMultipart ? payload.type : 'application/json';
                headers['Content-Length'] = payload.data.length;
            }
            var sent = https.request({
                hostname: dest.hostname, port: dest.port || 443, path: dest.pathname + dest.search,
                method: method, headers: headers, timeout: 30000,
                rejectUnauthorized: true
            }, function (res) {
                var chunks = [], count = 0;
                res.on('data', function (chunk) {
                    count += chunk.length;
                    if (count > 1048576) { res.destroy(new Error('پاسخ سرور بیش از حد بزرگ است')); return; }
                    chunks.push(chunk);
                });
                res.on('end', function () {
                    var body = Buffer.concat(chunks).toString('utf8');
                    var parsed;
                    try { parsed = JSON.parse(body); }
                    catch (_) { return reject(new Error('پاسخ JSON معتبر نیست (HTTP ' + res.statusCode + ')')); }
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        var detail = parsed.detail || parsed.message || parsed.error || 'خطای سرور';
                        if (typeof detail !== 'string') detail = JSON.stringify(detail).slice(0, 180);
                        return reject(new Error('HTTP ' + res.statusCode + ': ' + detail));
                    }
                    resolve(parsed);
                });
            });
            sent.on('timeout', function () { sent.destroy(new Error('مهلت اتصال به سرور تمام شد')); });
            sent.on('error', reject);
            if (payload) sent.write(payload.data);
            sent.end();
        });
    }
    function jsonBody(data) {
        return { data: Buffer.from(JSON.stringify(data), 'utf8') };
    }
    function multipart(fields, buffer, name) {
        var boundary = 'Pardach' + crypto.randomBytes(16).toString('hex');
        var segments = [];
        Object.keys(fields).forEach(function (key) {
            segments.push(Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="' +
                key + '"\r\n\r\n' + String(fields[key]) + '\r\n', 'utf8'));
        });
        var filename = String(name).replace(/[^a-zA-Z0-9_.-]/g, '_');
        segments.push(Buffer.from('--' + boundary +
            '\r\nContent-Disposition: form-data; name="files"; filename="' + filename +
            '"\r\nContent-Type: image/svg+xml\r\n\r\n', 'utf8'));
        segments.push(buffer);
        segments.push(Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8'));
        return { data: Buffer.concat(segments), type: 'multipart/form-data; boundary=' + boundary };
    }
    function evalHost(expression) {
        return new Promise(function (resolve, reject) {
            if (!window.__adobe_cep__ || !window.__adobe_cep__.evalScript) {
                return reject(new Error('پنل باید از داخل Adobe Illustrator باز شود'));
            }
            window.__adobe_cep__.evalScript(expression, function (reply) {
                var result;
                try { result = JSON.parse(reply); }
                catch (_) { return reject(new Error('اسکریپت Illustrator پاسخ معتبر نداد: ' + String(reply).slice(0, 70))); }
                if (!result.ok) return reject(new Error(result.error || 'خطا در Illustrator'));
                resolve(result);
            });
        });
    }
    function clearSession() {
        state.access = '';
        state.username = '';
        state.selection = null;
        ui('password').value = '';
        ui('loginBox').hidden = false;
        ui('uploadBox').hidden = true;
    }
    function fieldsFromSelection(info) {
        if (!state.selection || info.name !== state.selection.name ||
            info.count !== state.selection.count ||
            info.width_mm !== state.selection.width_mm ||
            info.height_mm !== state.selection.height_mm) {
            throw new Error('انتخاب تغییر کرده است؛ ابتدا دوباره «خواندن انتخاب» را بزنید.');
        }
        var kind = ui('kind').value, family = ui('family').value.trim();
        var code = ui('code').value.trim(), title = ui('title').value.trim();
        if (!title || !code || !kind) throw new Error('نام، کد و نوع طرح باید مشخص باشند.');
        if (kind === 'flower' && !family) throw new Error('برای گل کد خانواده را وارد کنید.');
        if (family && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(family)) {
            throw new Error('کد خانواده فقط می‌تواند شامل حروف لاتین، عدد، _ و - باشد.');
        }
        var tags = ui('tags').value.split(/[,،]/).map(function (s) { return s.trim(); })
            .filter(Boolean).slice(0, 20);
        return {
            title: title, code: code, design_kind: kind,
            family_key: family, content_tags: tags,
            // Backend stores its public width/height as *rounded centimetres*.
            // Exact cm values survive in the JSON metadata and SVG itself.
            width: Math.round(info.width_mm * 1000) / 10000,
            height: Math.round(info.height_mm * 1000) / 10000,
            unit: 'cm'
        };
    }
    async function login() {
        if (!https || !fs || !crypto) throw new Error('CEP Node.js در این نسخه فعال نیست');
        state.server = ensureServer(ui('server').value);
        var username = ui('username').value.trim(), pass = ui('password').value;
        if (!username || !pass) throw new Error('نام کاربری و رمز عبور را وارد کنید');
        var result = await request('/api/auth/login/', 'POST',
            jsonBody({username: username, password: pass}), '', false);
        if (!result.access) throw new Error('توکن دسترسی از سرور دریافت نشد');
        state.access = result.access;
        state.username = username;
        ui('password').value = '';
        ui('connectedAs').textContent = 'متصل: ' + username;
        ui('loginBox').hidden = true;
        ui('uploadBox').hidden = false;
        status('ورود موفق. طرح را انتخاب کنید و «خواندن انتخاب» را بزنید.', 'ok');
    }
    async function inspect() {
        var info = await evalHost('PardachDirectUpload.inspect()');
        state.selection = info;
        ui('title').value = info.name.substring(0, 255);
        ui('code').value = info.name.substring(0, 160);
        ui('dimensions').textContent = info.count + ' آیتم انتخاب شده | ' +
            info.width_mm + ' × ' + info.height_mm + ' میلی‌متر';
        status('انتخاب خوانده شد؛ اطلاعات را بررسی کنید.', 'ok');
    }
    async function upload() {
        if (!state.selection) throw new Error('ابتدا «خواندن انتخاب» را بزنید.');
        /* Export is generated only at send time: never upload a stale file. */
        var result = await evalHost('PardachDirectUpload.exportSelection()');
        var path = result.path, bytes;
        try {
            bytes = fs.readFileSync(path);
        } finally {
            /* Temporary export is not a user-facing artifact. */
            try { if (path) fs.unlinkSync(path); } catch (_) {}
        }
        if (bytes.length < 50 || bytes.length > 20 * 1024 * 1024) {
            throw new Error('حجم SVG نامعتبر یا بیشتر از سقف ۲۰ مگابایت است');
        }
        var svg = bytes.toString('utf8');
        if (!/<svg\b/i.test(svg)) throw new Error('خروجی SVG معتبر نیست');
        if (/<(?:image|use)\b[^>]*(?:xlink:)?href\s*=\s*["'](?:https?:|file:|\.\.?\/)/i.test(svg)) {
            throw new Error('طرح دارای منابع لینک‌شده خارجی است؛ ابتدا آن‌ها را Embed کنید.');
        }
        var meta = fieldsFromSelection(result);
        var safeName = meta.code.replace(/[^a-zA-Z0-9_.-]/g, '_') || 'design';
        var filename = safeName.replace(/\.svg$/i, '') + '.svg';
        var sha = crypto.createHash('sha256').update(bytes).digest('hex');
        status('در حال بررسی تکراری نبودن طرح…');
        // Existing duplicate endpoint consumes a real file, not a SHA string.
        var preflight = await request('/api/designs/designs/check-duplicate/', 'POST',
            multipart({}, bytes, filename), state.access, true);
        if (preflight.is_duplicate) {
            throw new Error('این فایل قبلاً ثبت شده است (شناسه ' +
                (preflight.existing_design && preflight.existing_design.id || 'نامشخص') +
                '). برای جلوگیری از تغییر رکورد موجود، ارسال نشد.');
        }
        if (preflight.file_hash && preflight.file_hash !== sha) {
            throw new Error('هش فایل در سرور با فایل محلی یکسان نیست');
        }
        status('در حال ارسال امن SVG به سرور…');
        var fields = {
            default_status: 'pending',
            design_kind: meta.design_kind,
            metadata: JSON.stringify(Object.assign({file_name: filename}, meta))
        };
        if (meta.family_key) fields.family_key = meta.family_key;
        var saved = await request('/api/designs/designs/batch-upload/', 'POST',
            multipart(fields, bytes, filename), state.access, true);
        if (!saved.created_ids || saved.created_ids.length !== 1 || Object.keys(saved.errors || {}).length) {
            throw new Error('سرور بارگذاری را تأیید نکرد: ' + JSON.stringify(saved.errors || saved).slice(0, 220));
        }
        status('✅ طرح با شناسه ' + saved.created_ids[0] + ' در کاتالوگ ثبت شد و در انتظار تأیید است.', 'ok');
    }
    async function run(fn) {
        if (state.busy) return;
        busy(true);
        try { await fn(); }
        catch (error) {
            var msg = String(error && error.message || error);
            status(msg, 'error');
            if (/HTTP 401/.test(msg)) clearSession();
        }
        finally { busy(false); }
    }
    ui('loginBtn').addEventListener('click', function () { run(login); });
    ui('inspectBtn').addEventListener('click', function () { run(inspect); });
    ui('uploadBtn').addEventListener('click', function () { run(upload); });
    ui('logoutBtn').addEventListener('click', function () {
        // Clear in memory even if the server is unreachable.
        clearSession();
        status('از حساب خارج شدید.');
    });
    if (!https || !fs || !crypto) status('Node.js CEP فعال نیست؛ نصب یا manifest را بررسی کنید.', 'error');
}());

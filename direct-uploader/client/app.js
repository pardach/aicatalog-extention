/* Pardach Direct Uploader - multilingual batch catalog import (CEP Node).
 * One selected Illustrator family may contain individually classified child
 * groups. No manual export, persistent secrets or remote dependencies.
 */
(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var https, fs, os, path, crypto;
try {
    https = require('https'); fs = require('fs'); os = require('os');
    path = require('path'); crypto = require('crypto');
} catch (_) {}
var state = {server:'',access:'',username:'',items:[],mode:'smart',
    docName:'',busy:false,cancelable:false,stop:false,page:0,sequence:0,dirty:false,batchCode:''};
var PAGE_SIZE = 25, EXPORT_SIZE = 8, MAX_BATCH_BYTES = 12 * 1024 * 1024;
var KIND_LABELS = [
    ['', 'نوع را انتخاب کنید'], ['flower','گل'], ['half_flower','کپ گل'],
    ['rakab','رکب'], ['benook','بنوک'], ['darzi','درزی'],
    ['tek','تک'], ['tool','ابزار']
];
function message(s, level) { $('status').textContent=String(s); $('status').className=level||''; }
function setBusy(value) {
    state.busy = value;
    ['loginBtn','inspectBtn','applyBulkBtn','uploadBtn','checkAllBtn',
     'checkNoneBtn','retryBtn','splitMode'].forEach(function(id){$(id).disabled=value;});
}
function normalizeServer(urlString) {
    var u = new URL(String(urlString||'').trim());
    if (u.protocol !== 'https:' || !u.hostname || u.username || u.password ||
       u.search || u.hash || (u.pathname && u.pathname !== '/'))
        throw Error('آدرس باید فقط دامنه HTTPS بدون مسیر یا اطلاعات ورود باشد');
    return u.origin;
}
function http(pathPart, method, payload, access) {
    return new Promise(function(resolve,reject){
        var u=new URL(pathPart,state.server+'/'), origin=new URL(state.server);
        if(u.protocol!=='https:'||u.origin!==origin.origin) return reject(Error('آدرس خارج از دامنه'));
        var headers={Accept:'application/json'};
        if(access) headers.Authorization='Bearer '+access;
        if(payload) {
            headers['Content-Type']=payload.type || 'application/json';
            headers['Content-Length']=payload.data.length;
        }
        var req=https.request({hostname:u.hostname,port:u.port||443,
            method:method,path:u.pathname+u.search,headers:headers,
            rejectUnauthorized:true,timeout:75000},function(res){
            var chunks=[],size=0;
            res.on('data',function(b){
                size+=b.length;
                if(size>2097152) {res.destroy(Error('پاسخ سرور بیش از حد بزرگ است'));return;}
                chunks.push(b);
            });
            res.on('end',function(){
                var data; try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
                catch(_){return reject(Error('HTTP '+res.statusCode+': پاسخ غیر JSON از سرور'));}
                if(res.statusCode<200||res.statusCode>=300){
                    var detail=data.detail||data.message||data.error||'خطا';
                    return reject(Error('HTTP '+res.statusCode+': '+String(
                        typeof detail==='string'?detail:JSON.stringify(detail)).slice(0,260)));
                }
                resolve(data);
            });
        });
        req.on('error',reject);
        req.on('timeout',function(){req.destroy(Error('پاسخ سرور دیر رسید'));});
        if(payload)req.write(payload.data);
        req.end();
    });
}
function jsonPayload(data){return {data:Buffer.from(JSON.stringify(data),'utf8'),type:'application/json'};}
function multipart(files) {
    var boundary='Pardach_'+crypto.randomBytes(16).toString('hex'),chunks=[];
    function field(key,value){
        chunks.push(Buffer.from('--'+boundary+'\r\nContent-Disposition: form-data; name="'+key+
            '"\r\n\r\n'+String(value)+'\r\n','utf8'));
    }
    field('default_status','pending');
    field('insert_only','1');
    field('metadata',JSON.stringify(files.map(function(f){return f.meta;})));
    files.forEach(function(f){
        chunks.push(Buffer.from('--'+boundary+'\r\nContent-Disposition: form-data; name="files"; filename="'+
           f.filename+'"\r\nContent-Type: image/svg+xml\r\n\r\n','utf8'));
        chunks.push(f.bytes);
        chunks.push(Buffer.from('\r\n','utf8'));
    });
    chunks.push(Buffer.from('--'+boundary+'--\r\n'));
    return {data:Buffer.concat(chunks),type:'multipart/form-data; boundary='+boundary};
}
function callHost(expression) {
    return new Promise(function(resolve,reject) {
        if(!window.__adobe_cep__ || !window.__adobe_cep__.evalScript)
            return reject(Error('پنل فقط در Adobe Illustrator کار می‌کند'));
        window.__adobe_cep__.evalScript(expression,function(reply){
            var data;
            try {data=JSON.parse(reply);}
            catch(_){return reject(Error('دریافت پاسخ معتبر از Illustrator ممکن نیست: '+String(reply).slice(0,90)));}
            if(!data.ok)return reject(Error(data.error||'خطا در Illustrator'));
            resolve(data);
        });
    });
}
function forget(){
    state.access='';state.username='';state.items=[];state.stop=true;state.dirty=false;
    $('password').value='';$('loginBox').hidden=false;$('uploadBox').hidden=true;
    ['bulkBox','listBox','sendBox'].forEach(function(id){$(id).hidden=true;});
}
async function login(){
    if(!https || !fs || !crypto || !os || !path)throw Error('CEP Node در Illustrator فعال نیست');
    state.server=normalizeServer($('server').value);
    var username=$('username').value.trim(),password=$('password').value;
    if(!username||!password)throw Error('نام کاربری و رمز عبور لازم است');
    var data=await http('/api/auth/login/','POST',
        jsonPayload({username:username,password:password}),'');
    if(!data.access)throw Error('سرور توکن دسترسی برنگرداند');
    state.access=data.access;
    try{
        var cap=await http('/api/designs/designs/upload-capabilities/','GET',null,state.access);
        if(cap.insert_only!==true||cap.batch_sha256_preflight!==true)
            throw Error('server capabilities');
    }catch(_){
        state.access='';
        throw Error('سرور هنوز نسخه امن بارگذاری گروهی را ندارد یا شما مجوز بارگذاری ندارید.');
    }
    $('password').value='';
    state.username=username;$('connectedAs').textContent='متصل: '+username;
    $('loginBox').hidden=true;$('uploadBox').hidden=false;
    message('متصل شد. طرح‌ها را در Illustrator انتخاب و بررسی کنید.','ok');
}
function normalizeDigits(value) {
    return String(value||'').replace(/[۰-۹٠-٩]/g,function(ch){
        var n=ch.charCodeAt(0);
        return String(n>=0x6F0 && n<=0x6F9?n-0x6F0:n-0x660);
    });
}
function suggestion(info) {
    var original=String(info.name||'').trim(),name=original.replace(/\\.(ai|svg)$/i,'').trim();
    var parent=String(info.parent_name||'').trim(),family='',kind='';
    var parentMatch=normalizeDigits(parent).match(/^(?:(?:family|fam|خانواده)[\\s:_-]*)?([a-z0-9][a-z0-9_-]{0,119})$/i);
    if(parentMatch && (/^\\d+$/.test(parentMatch[1]) || /^f\\d+$/i.test(parentMatch[1]) ||
        /^(?:family|fam|خانواده)/i.test(parent)))family=parentMatch[1];
    var compact=normalizeDigits(name).match(/^(\\d{1,10})(r\\d*|k|g|b|t|d)$/i);
    if(compact) {
        family=compact[1];
        kind=({r:'rakab',k:'half_flower',g:'flower',b:'benook',t:'tek',d:'darzi'})[
            compact[2].charAt(0).toLowerCase()]||'';
    }
    var unnamed=!name||/^<.*group.*>$/i.test(name)||/^طرح [0-9۰-۹٠-٩]+$/i.test(name);
    var generatedCode=state.batchCode+'-'+String(info.id||'x').replace(/[^a-z0-9]/ig,'_');
    var fallbackCode=unnamed?(info.symbol_name||generatedCode):name;
    var fallbackTitle=unnamed?(info.symbol_name||'طرح '+info.id):name;
    var adapter=window.PardachLegacyAdapter;
    if(!adapter) throw Error('ماژول سازگاری کاتالوگ قدیمی بارگذاری نشده است');
    var legacy=adapter.fromSelection(info,{title:fallbackTitle,code:fallbackCode,
        kind:kind,family:family,tags:[]});
    return {
        id:info.id,name:original,
        title:(legacy.title||fallbackTitle).slice(0,255),
        code:(legacy.code||fallbackCode).slice(0,160),
        kind:legacy.kind||kind,
        family:legacy.family||family,
        family_codes:legacy.family_codes||[],
        tags:(legacy.tags||[]).join('، '),
        content_tags:legacy.content_tags||[],
        description:legacy.description||'',
        collection:legacy.collection||'',
        era:legacy.era||'',legacy_created_at:legacy.legacy_created_at||'',
        rating:legacy.rating,label:legacy.label||'',
        legacy_source:legacy.source||'selection',legacy_warnings:legacy.warnings||[],
        width_mm:info.width_mm,height_mm:info.height_mm,signature:info.signature,
        parent_name:parent,checked:true,status:'pending',error:''
    };
}
async function inspect(){
    if(state.items.length&&state.dirty&&
       !window.confirm('اطلاعات و انتخاب‌های ویرایش‌شده با بررسی دوباره از نو ساخته می‌شوند. ادامه می‌دهید؟'))return;
    var mode=$('splitMode').value;
    var result=await callHost('PardachDirectUpload.inspectBatch('+JSON.stringify(mode)+')');
    state.mode=mode;state.docName=result.doc_name;
    state.batchCode='AI-'+Date.now().toString(36).toUpperCase();
    state.items=result.items.map(suggestion);state.page=0;state.dirty=false;
    $('bulkBox').hidden=$('listBox').hidden=$('sendBox').hidden=false;
    $('progress').value=0;$('progress').max=1;$('progressText').textContent='آماده ارسال';
    render();
    message('ساختار بررسی شد: '+result.items.length+' طرح. نوع، خانواده و اطلاعات را تأیید کنید.','ok');
}
function validate(item) {
    if(!item.title.trim()||!item.code.trim()||!item.kind)return 'نام، کد و نوع طرح لازم است';
    if(item.kind==='flower'&&!item.family.trim())return 'برای گل، کد خانواده لازم است';
    if(item.family && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(item.family))return 'کد خانواده نامعتبر است';
    if(item.kind==='tool' && (item.family||item.family_codes.length))
        return 'ابزار مستقل است؛ هیچ کد خانواده نباید داشته باشد';
    if(item.family_codes.length>50)return 'بیش از ۵۰ خانواده برای یک طرح پشتیبانی نمی‌شود';
    if(item.family_codes.some(function(k){return !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(k);}))
        return 'یک یا چند کد خانواده معتبر نیست';
    if(item.title.length>255||item.code.length>160)return 'نام یا کد بیش از حد طولانی است';
    return '';
}
function countSummary(){
    var total=state.items.length,
        checked=state.items.filter(function(it){return it.checked;}).length,
        valid=state.items.filter(function(it){return it.checked&&!validate(it)&&it.status!=='done';}).length,
        done=state.items.filter(function(it){return it.status==='done';}).length,
        duplicate=state.items.filter(function(it){return it.status==='duplicate';}).length,
        error=state.items.filter(function(it){return it.status==='error';}).length;
    $('checkedCount').textContent=checked+' انتخاب';
    $('summary').textContent='شناسایی: '+total+' | منتخب: '+checked+
        ' | آماده: '+valid+' | ثبت‌شده: '+done+' | تکراری: '+duplicate+' | خطادار: '+error;
}
function element(type,klass,txt){
    var e=document.createElement(type);if(klass)e.className=klass;
    if(txt!==undefined)e.textContent=String(txt);return e;
}
function inputField(parent,label,value,update,max) {
    var div=element('div'),lab=element('label',null,label),inp=element('input');
    inp.value=value||'';if(max)inp.maxLength=max;inp.disabled=state.busy;
    inp.addEventListener('change',function(){update(inp.value);state.dirty=true;countSummary();});
    div.appendChild(lab);div.appendChild(inp);parent.appendChild(div);return inp;
}
function selectField(parent,label,value,update) {
    var div=element('div'),lab=element('label',null,label),select=element('select');
    KIND_LABELS.forEach(function(pair){var o=element('option',null,pair[1]);o.value=pair[0];select.appendChild(o);});
    select.value=value||'';select.disabled=state.busy;
    select.addEventListener('change',function(){update(select.value);state.dirty=true;countSummary();});
    div.appendChild(lab);div.appendChild(select);parent.appendChild(div);
}
function row(item) {
    var card=element('div','design'+(item.status==='error'?' error':item.status==='done'?' done':''));
    var top=element('div','top'),checkbox=element('input');
    checkbox.type='checkbox';checkbox.checked=!!item.checked;
    checkbox.disabled=item.status==='done'||state.busy;
    checkbox.setAttribute('aria-label','انتخاب '+item.title);
    checkbox.addEventListener('change',function(){item.checked=checkbox.checked;state.dirty=true;countSummary();});
    top.appendChild(checkbox);
    var title=element('div','name',item.title);top.appendChild(title);
    var focusBtn=element('button','secondary tiny auto','نمایش');
    focusBtn.disabled=state.busy;
    focusBtn.addEventListener('click',function(){
        run(async function(){
            await callHost('PardachDirectUpload.focus('+
                JSON.stringify(state.mode)+','+JSON.stringify(item.id)+')');
            message('طرح «'+item.title+'» در Illustrator نمایش داده شد.','ok');
        });
    });
    top.appendChild(focusBtn);
    var expand=element('button','secondary tiny auto','جزئیات');top.appendChild(expand);
    card.appendChild(top);
    card.appendChild(element('div','mini',item.width_mm+' × '+item.height_mm+
        ' mm | '+(item.parent_name?'خانواده/گروه: '+item.parent_name+' | ':'')+item.id));
    var fields=element('div','linefields');
    selectField(fields,'نوع',item.kind,function(v){item.kind=v;if(v==='tool')item.family='';render();});
    inputField(fields,'خانواده اصلی',item.family,function(v){
        item.family=normalizeDigits(v.trim());
        if(item.kind==='tool'){item.family='';item.family_codes=[];}
        else if(item.family){item.family_codes=[item.family].concat(
            (item.family_codes||[]).filter(function(code){return code!==item.family;}));}
    },120);
    card.appendChild(fields);
    var details=element('div','details');details.hidden=true;
    inputField(details,'سایر خانواده‌ها (با ویرگول)',(item.family_codes||[])
        .filter(function(v){return v!==item.family;}).join('، '),function(v){
        var additional=v.split(/[,،;]/).map(function(x){
            return window.PardachLegacyAdapter.normalizedFamily(x);
        }).filter(Boolean);
        item.family_codes=Array.from(new Set([item.family].concat(additional).filter(Boolean)));
    },500);
    inputField(details,'نام کامل',item.title,function(v){item.title=v;title.textContent=v;},255);
    inputField(details,'کد/شناسه طرح',item.code,function(v){item.code=v;},160);
    inputField(details,'برچسب‌ها (ویرگول)',item.tags,function(v){item.tags=v;},400);
    inputField(details,'کالکشن',item.collection,function(v){item.collection=v;},120);
    inputField(details,'دوره / قدمت',item.era,function(v){item.era=v;},80);
    inputField(details,'شرح طرح',item.description,function(v){item.description=v;},2000);
    if(item.legacy_source==='legacy_symbol_note'||item.legacy_source==='symbol_note')
        details.appendChild(element('div','mini','اطلاعات از Symbol Note کاتالوگ قدیمی خوانده شده است.'));
    if(item.legacy_warnings.length)
        details.appendChild(element('div','mini','هشدار Note: '+item.legacy_warnings.join(', ')));
    card.appendChild(details);
    expand.disabled=state.busy;
    expand.addEventListener('click',function(){
        details.hidden=!details.hidden;expand.textContent=details.hidden?'اطلاعات بیشتر':'بستن جزئیات';
    });
    var note=validate(item);
    if(item.status==='done')note='✅ در کاتالوگ ثبت شد';
    if(item.status==='duplicate')note='تکراری: '+item.error;
    if(item.status==='error')note='خطا: '+item.error;
    if(note)card.appendChild(element('div','mini',note));
    return card;
}
function render(){
    countSummary();
    var pages=Math.max(1,Math.ceil(state.items.length/PAGE_SIZE));
    state.page=Math.max(0,Math.min(state.page,pages-1));
    $('queue').textContent='';
    state.items.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE).forEach(function(item){
        $('queue').appendChild(row(item));
    });
    $('pageInfo').textContent='صفحه '+(state.page+1)+' از '+pages;
    $('prevBtn').disabled=state.busy||state.page===0;
    $('nextBtn').disabled=state.busy||state.page>=pages-1;
}
function bulkApply(){
    var kind=$('bulkKind').value,family=normalizeDigits($('bulkFamily').value.trim()),
        tags=$('bulkTags').value.trim(),collection=$('bulkCollection').value.trim();
    if(family && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(family))throw Error('کد خانواده نامعتبر است');
    var changed=0;
    state.items.forEach(function(item){
        if(!item.checked||item.status==='done')return;
        if(kind){item.kind=kind;if(kind==='tool'){item.family='';item.family_codes=[];}}
        if(family&&item.kind!=='tool'){
            item.family=family;
            item.family_codes=[family].concat((item.family_codes||[])
                .filter(function(code){return code!==family;}));
        }
        if(tags)item.tags=Array.from(new Set((item.tags+','+tags).split(/[,،]/)
            .map(function(s){return s.trim();}).filter(Boolean))).join('، ');
        if(collection)item.collection=collection;changed++;
    });
    state.dirty=true;
    render();message('اطلاعات روی '+changed+' طرح منتخب اعمال شد.','ok');
}
function setChecks(filter) {
    state.dirty=true;
    state.items.forEach(function(item){item.checked=item.status!=='done'&&filter(item);});
    render();
}
function safeTempPath(tempPath) {
    var p=path.resolve(String(tempPath||'')),temp=fs.realpathSync(os.tmpdir());
    if(path.dirname(p)!==temp||!/^pardach_batch_[0-9]+_[0-9]+\.svg$/i.test(path.basename(p)))
        throw Error('مسیر فایل موقت معتبر نیست');
    return p;
}
function cleanupTemp(tempPath) {
    try {
        var p=safeTempPath(tempPath);
        if(fs.existsSync(p)&&!fs.lstatSync(p).isSymbolicLink())fs.unlinkSync(p);
    } catch (_) {}
}
function safeTempRead(tempPath) {
    var p=safeTempPath(tempPath);
    try {
    var stat=fs.lstatSync(p);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>20*1024*1024||stat.size<50)
        throw Error('فایل SVG موقت نامعتبر یا بیش از ۲۰ مگابایت است');
        var bytes=fs.readFileSync(p),svg=bytes.toString('utf8');
        if(!/<svg\b/i.test(svg))throw Error('فایل خروجی SVG نیست');
        if(/<(?:image|use)\b[^>]*(?:xlink:)?href\s*=\s*["'](?:https?:|file:|\.\.?\/)/i.test(svg))
            throw Error('لینک خارجی در SVG وجود دارد؛ ابتدا Embed کنید');
        return bytes;
    } finally {cleanupTemp(tempPath);}
}
function meta(item,filename){
    return {file_name:filename,title:item.title.trim(),code:item.code.trim(),
        design_kind:item.kind,family_key:item.family.trim(),
        family_codes:item.kind==='tool'?[]:Array.from(new Set(
            [item.family].concat(item.family_codes||[]).filter(Boolean))),
        width:Math.round(item.width_mm*100)/1000,
        height:Math.round(item.height_mm*100)/1000,unit:'cm',
        keywords:[],content_tags:item.tags.split(/[,،]/).map(function(s){return s.trim();}).filter(Boolean).slice(0,20),
        collection:item.collection.trim(),description:item.description.trim(),
        era:item.era||'',legacy_created_at:item.legacy_created_at||'',
        rating:item.rating,label:item.label,
        legacy_source:item.legacy_source||'selection',
        source:'illustrator-direct-uploader'};
}
function buildPrepared(item,result){
    if(result.signature!==item.signature)throw Error('ساختار یا ابعاد انتخاب تغییر کرده؛ دوباره بررسی کنید');
    var bytes=safeTempRead(result.path),hash=crypto.createHash('sha256').update(bytes).digest('hex');
    // File name stays ASCII for multipart safety and unique for every Illustrator row.
    var filename='design_'+item.id.replace(/[^a-z0-9]/ig,'_')+'_'+hash.slice(0,10)+'.svg';
    return {item:item,bytes:bytes,hash:hash,filename:filename,meta:meta(item,filename)};
}
async function submitChunk(chunk) {
    var ids=chunk.map(function(i){return i.id;});
    // Host exports up to eight designs in one bridge call.
    var host=await callHost('PardachDirectUpload.exportBatch('+
        JSON.stringify(state.mode)+','+JSON.stringify(ids.join('|'))+')');
    var byId={};chunk.forEach(function(item){byId[item.id]=item;});
    var prepared=[],known={};
    host.results.forEach(function(output){
        var item=byId[output.id];if(!item)return;
        if(!output.ok) {
            item.status='error';item.error=output.error||'خروجی‌گیری ناموفق';
            return;
        }
        try {
            var ready=buildPrepared(item,output);
            if(known[ready.hash]){
                item.status='duplicate';item.error='طرح یکسان در همین دسته انتخاب شده است';
            }else{prepared.push(ready);known[ready.hash]=true;}
        }catch(e){
            cleanupTemp(output.path);
            item.status='error';item.error=e.message;
        }
    });
    if(!prepared.length)return;
    // One short JSON request checks all hashes; original SVGs transfer once.
    var preflight=await http('/api/designs/designs/check-duplicates/','POST',
        jsonPayload({hashes:prepared.map(function(p){return p.hash;})}),state.access);
    var files=[];
    prepared.forEach(function(p){
        if(preflight.duplicates && preflight.duplicates[p.hash]){
            p.item.status='duplicate';p.item.error='این فایل قبلاً در کاتالوگ ثبت شده است';
        }else files.push(p);
    });
    if(!files.length)return;
    // Cap each upload request, even when Illustrator exports very large images.
    var packets=[],current=[],bytes=0;
    files.forEach(function(f){
        if(current.length && bytes+f.bytes.length>MAX_BATCH_BYTES) {
            packets.push(current);current=[];bytes=0;
        }
        current.push(f);bytes+=f.bytes.length;
    });
    if(current.length)packets.push(current);
    for(var k=0;k<packets.length;k++){
        var pack=packets[k];
        try{
            var saved=await http('/api/designs/designs/batch-upload/','POST',
                multipart(pack),state.access);
            var errors=saved.errors||{},accepted=saved.created_ids||[],pos=0;
            pack.forEach(function(p){
                var e=errors[p.filename];
                if(e) {p.item.status=e.error==='duplicate'?'duplicate':'error';
                    p.item.error=String(e.error||'خطای ثبت');}
                else if(pos<accepted.length) {
                    p.item.status='done';p.item.error='شناسه '+accepted[pos++];
                } else {
                    p.item.status='error';p.item.error='سرور شناسه ثبت‌شده را اعلام نکرد';
                }
            });
        }catch(e){
            pack.forEach(function(p){p.item.status='error';p.item.error=e.message;});
            if(/HTTP 401/.test(e.message)){state.stop=true;throw e;}
        }
    }
}
async function upload(){
    if(!state.items.length)throw Error('ابتدا طرح‌ها را بررسی کنید');
    var pending=state.items.filter(function(i){return i.checked&&i.status!=='done'&&i.status!=='duplicate';});
    if(!pending.length)throw Error('طرح آماده یا خطادارِ انتخاب‌شده‌ای وجود ندارد');
    var valid=pending.filter(function(i){
        var err=validate(i);if(err){i.status='error';i.error=err;return false;}
        return true;
    });
    if(!valid.length){render();throw Error('اطلاعات طرح‌های انتخابی کامل نیست');}
    // Families with new flowers are created first, even across request boundaries.
    valid.sort(function(a,b){return Number(b.kind==='flower')-Number(a.kind==='flower');});
    state.stop=false;state.cancelable=true;$('cancelBtn').disabled=false;
    $('progress').max=valid.length;$('progress').value=0;
    var completed=0;
    try {
        for(var i=0;i<valid.length;i+=EXPORT_SIZE){
            if(state.stop)break;
            var batch=valid.slice(i,i+EXPORT_SIZE);
            batch.forEach(function(item){item.status='sending';item.error='';});
            message('در حال خروجی گرفتن و ارسال دسته '+(Math.floor(i/EXPORT_SIZE)+1)+' ...');
            try{await submitChunk(batch);}
            catch(e){
                batch.forEach(function(item){
                    if(item.status==='sending'){item.status='error';item.error=e.message;}
                });
                if(/HTTP 401/.test(e.message)){throw e;}
            }
            completed+=batch.length;
            $('progress').value=completed;
            $('progressText').textContent='پردازش: '+completed+' از '+valid.length;
            render();
        }
    } finally {
        state.cancelable=false;$('cancelBtn').disabled=true;
    }
    var done=valid.filter(function(i){return i.status==='done';}).length,
        duplicate=valid.filter(function(i){return i.status==='duplicate';}).length,
        errors=valid.filter(function(i){return i.status==='error';}).length;
    message('نتیجه: '+done+' ثبت شد، '+duplicate+' تکراری، '+errors+' خطادار'+
        (state.stop?' | عملیات متوقف شد':'')+'.',errors?'error':'ok');
}
async function run(action){
    if(state.busy)return;
    setBusy(true);
    try{await action();}
    catch(e){var text=String(e&&e.message||e);message(text,'error');if(/HTTP 401/.test(text))forget();}
    finally{setBusy(false);render();}
}
$('loginBtn').addEventListener('click',function(){run(login);});
$('inspectBtn').addEventListener('click',function(){run(inspect);});
$('uploadBtn').addEventListener('click',function(){run(upload);});
$('applyBulkBtn').addEventListener('click',function(){run(function(){bulkApply();});});
$('cancelBtn').addEventListener('click',function(){state.stop=true;message('بعد از پایان این دسته، ارسال متوقف می‌شود.');});
$('logoutBtn').addEventListener('click',function(){forget();message('خارج شدید');});
$('checkAllBtn').addEventListener('click',function(){setChecks(function(){return true;});});
$('checkNoneBtn').addEventListener('click',function(){setChecks(function(){return false;});});
$('retryBtn').addEventListener('click',function(){
    setChecks(function(i){return i.status==='error'||i.status==='pending';});
});
$('prevBtn').addEventListener('click',function(){if(state.page>0){state.page--;render();}});
$('nextBtn').addEventListener('click',function(){state.page++;render();});
if(!https||!fs||!crypto||!os||!path)message('Node.js در پنل CEP در دسترس نیست.','error');
})();

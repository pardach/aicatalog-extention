/* Real CEP panel; DOM text only for user/server values. */
(function(){
'use strict';
var $=function(id){return document.getElementById(id);};
var connector=null,cap=null,rows=[],claim=null,pending=null,busy=false,facetOffset=0,facetQuery='',account=null;
var Model=window.StudioSetBatchMetadata, Exporter=window.StudioSetSvgExport, Connector=window.StudioSetConnector;
var cs=null,queue=null,queueError=null,accountId=null,catalogOffset=0,catalogFilters={};
var messages={family_number_taken:'شماره خانواده قبلاً استفاده شده است',family_name_taken:'نام خانواده تکراری است',family_role_taken:'نقش عضو قبلاً ثبت شده است',asset_name_taken:'نام فایل تکراری است',duplicate_svg:'فایل تکراری است',invalid_or_expired_reservation:'رزرو معتبر نیست یا منقضی شده است',family_not_studio_owned:'این خانواده در کاتالوگ قابل ویرایش استودیو نیست',invalid_publication:'فایل یا اطلاعات با قرارداد ثبت سازگار نیست',permission_denied:'مجوز ثبت ندارید',publication_disabled:'ثبت در سرور فعال نیست'};
function status(s,error){$('ssStatus').textContent=s;$('ssStatus').className=error?'ss-error':'';}
function errorText(e){return messages[e.code]||String(e.message||e);}
function node(tag,text){var x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;}
function btn(text,fn){var b=node('button',text);b.type='button';b.onclick=fn;return b;}
function field(parent,label,control){var l=node('label',label);l.appendChild(control);parent.appendChild(l);return control;}
function select(parent,label,options,value,fn){var s=node('select');options.forEach(function(o){var opt=node('option',o[1]);opt.value=o[0];s.appendChild(opt);});s.value=value;s.onchange=function(){fn(s.value);};return field(parent,label,s);}
function input(parent,label,value,fn){var x=node('input');x.value=value||'';x.onchange=function(){fn(x.value);};return field(parent,label,x);}
function checkbox(parent,label,value,fn){var l=node('label'),x=node('input');x.type='checkbox';x.checked=!!value;x.onchange=function(){fn(x.checked);};l.appendChild(x);l.appendChild(document.createTextNode(' '+label));parent.appendChild(l);}
function kinds(){return cap&&cap.design_kinds||[];}
function selected(){return rows.filter(function(r){return r.selected;});}
function setBusy(v){busy=v;sync();}
function sync(){
    $('ssReviewFields').disabled=busy||!cap||!!pending;
    $('ssPending').hidden=!pending;
    var same=!!(cap&&connector&&pending&&connector.origin===pending.origin&&accountId===pending.accountId);
    $('ssRetry').disabled=busy||!same;
    $('ssCheckStatus').disabled=busy||!same||!cap.operations.publication_status;
    $('ssPendingInfo').textContent=pending?'شناسه: '+pending.payload.request_id+' | '+pending.payload.items.length+' طرح | '+pending.account:'';
    $('ssCatalog').hidden=!cap||!cap.operations.read_catalog;
    $('ssCatalogSearch').disabled=busy;
    $('ssCatalogMore').disabled=busy||catalogOffset===null;
    $('ssConnect').disabled=busy;
    $('ssClose').disabled=busy;
    $('ssDisconnect').disabled=busy;
    $('ssAccount').disabled=busy;
    $('ssOrigin').disabled=busy||!!claim||!!pending;
    $('ssPublish').disabled=!!queueError||!queue||!cap||!cap.operations||!cap.operations.upload||!selected().length;
    var mode=$('ssMode').value;
    $('ssFamilyFields').hidden=mode==='standalone';
    $('ssFamilyNameLabel').hidden=mode!=='new_family';
    $('ssReserve').disabled=mode!=='new_family'||!!claim||!cap||!cap.operations.reserve_family;
    $('ssRelease').disabled=!claim;
    $('ssFamily').disabled=!!claim;
    $('ssFamilyName').disabled=!!claim;
    $('ssMode').disabled=!!claim;
    $('ssClaim').textContent=claim?'رزرو '+claim.family_key+' تا '+new Date(claim.expires_at*1000).toLocaleTimeString():'';
    $('ssFacetMore').disabled=facetOffset===null;
    $('ssCount').textContent=selected().length+' انتخاب شده از '+rows.length+' طرح';
}
function task(fn){if(busy)return;setBusy(true);Promise.resolve().then(fn).catch(function(e){status(errorText(e),true);}).then(function(){setBusy(false);});}
function familyNumber(value){
    return String(value||'').replace(/[۰-۹٠-٩]/g,function(c){return String(c.charCodeAt(0)-(c.charCodeAt(0)>=1776?1776:1632));}).trim().replace(/^0+(?=\d)/,'');
}
function applyDestination(){
    var mode=$('ssMode').value,key=mode==='standalone'?'':familyNumber($('ssFamily').value);
    rows=rows.map(function(r){
        if(r.design_kind==='tool')return Model.edit(r,{family_key:''},kinds());
        return Model.edit(r,{family_key:key},kinds());
    });
}
function roles(kind){
    var o=kinds().filter(function(x){return x.key===kind;})[0],a=[];
    if(!o||!o.default_family_role)return [['','بدون نقش']];
    a.push([o.default_family_role,o.label+' اصلی']);
    if(kind==='rakab'){a.push(['secondary_rakab','رکب دوم']);for(var i=3;i<=10;i++)a.push(['rakab_'+i,'رکب '+i]);}
    if(['darzi','tek','vol'].indexOf(kind)>=0)for(var j=1;j<=10;j++)a.push([kind+'_'+j,o.label+' '+j]);
    return a;
}
function change(id,patch,redraw){rows=rows.map(function(r){return r.id===id?Model.edit(r,patch,kinds()):r;});if(redraw)renderRows();else sync();}
function renderRows(){
    var list=$('ssRows');list.textContent='';
    rows.forEach(function(r){
        var card=node('article');card.className='ss-item';
        var head=node('div');head.className='ss-row';
        if(r.source.preview_base64&&/^[A-Za-z0-9+/=]+$/.test(r.source.preview_base64)){
            var img=node('img');img.className='ss-thumb';img.alt='پیش‌نمایش';img.src='data:image/png;base64,'+r.source.preview_base64;head.appendChild(img);
        }
        var summary=node('div',r.title||'طرح '+r.id);summary.className='ss-summary';head.appendChild(summary);card.appendChild(head);
        if(!r.source.success){var er=node('p',r.source.error||'استخراج ناموفق');er.className='ss-error';card.appendChild(er);list.appendChild(card);return;}
        card.appendChild(node('p',Number(r.source.width_cm).toFixed(3)+' × '+Number(r.source.height_cm).toFixed(3)+' cm'));
        (r.source.warnings||[]).forEach(function(w){var x=node('p',w);x.className='ss-error';card.appendChild(x);});
        checkbox(card,'انتخاب برای ثبت',r.selected,function(v){change(r.id,{selected:v});});
        input(card,'عنوان',r.title,function(v){change(r.id,{title:v});});
        select(card,'نوع طرح',[['unknown','انتخاب نوع']].concat(kinds().filter(function(k){return k.key!=='unknown';}).map(function(k){return [k.key,k.label];})),r.design_kind,function(v){change(r.id,{design_kind:v,confirmed:v!=='unknown',family_key:$('ssMode').value==='standalone'?'':familyNumber($('ssFamily').value)},true);});
        if(r.family_key&&r.design_kind!=='tool')select(card,'نقش در خانواده',roles(r.design_kind),r.family_role,function(v){change(r.id,{family_role:v});});
        checkbox(card,'نوع و نقش را تأیید می‌کنم',r.confirmed,function(v){change(r.id,{confirmed:v});});
        input(card,'محتوا',r.content_tags.join('، '),function(v){change(r.id,{content_tags:Model.tags(v)});});
        input(card,'تگ',r.tags.join('، '),function(v){change(r.id,{tags:Model.tags(v)});});
        select(card,'قدمت',[['unknown','نامشخص'],['new','جدید'],['old','قدیمی']],r.design_age,function(v){change(r.id,{design_age:v});});
        checkbox(card,'پرطرفدار',r.is_curated_popular,function(v){change(r.id,{is_curated_popular:v});});
        checkbox(card,'ویژه',r.is_featured,function(v){change(r.id,{is_featured:v});});
        input(card,'کالکشن',r.collection_key,function(v){change(r.id,{collection_key:v});});
        select(card,'امتیاز',[['','بدون امتیاز'],['0','۰'],['1','۱'],['2','۲'],['3','۳'],['4','۴'],['5','۵']],r.xmp_rating===null?'':String(r.xmp_rating),function(v){change(r.id,{xmp_rating:v===''?null:Number(v)});});
        select(card,'برچسب رنگی',[['','بدون رنگ'],['red','قرمز'],['yellow','زرد'],['green','سبز'],['blue','آبی'],['purple','بنفش']],r.xmp_label,function(v){change(r.id,{xmp_label:v});});
        list.appendChild(card);
    });sync();
}
function getFacets(reset){
    if(reset){facetQuery=$('ssFacetSearch').value;facetOffset=0;$('ssFacets').textContent='';}
    if(facetOffset===null)return Promise.resolve();
    return connector.facets('content_tags',facetQuery,facetOffset,50).then(function(data){
        data.values.forEach(function(v){$('ssFacets').appendChild(btn(v,function(){$('ssBulkContent').value=Model.tags([$('ssBulkContent').value,v]).join('، ');}));});
        facetOffset=data.next_offset;
    });
}
function showMatches(data){
    var box=$('ssMatches');box.textContent='';
    box.appendChild(node('p',data.family_exists?'شماره موجود است': 'شماره در نمای کاتالوگ پیدا نشد'));
    if(data.name_exists)box.appendChild(node('p','نام مشابه موجود است'));
    data.matches.forEach(function(m){var el=node('div',(m.family_key||'')+' | '+(m.title||m.name||'')+' | '+(m.family_role||''));el.className='ss-match';box.appendChild(el);});
    if(data.total_matches>data.matches.length)box.appendChild(node('p','نتایج محدود شده‌اند.'));
    if(!claim&&$('ssMode').value==='new_family')box.appendChild(btn('پیشنهاد '+data.suggested_family,function(){$('ssFamily').value=data.suggested_family;applyDestination();renderRows();}));
}
function finishPending(result){
    if(!Array.isArray(result.assets)||result.assets.length!==pending.payload.items.length){pending.uncertain=true;throw Error('پاسخ ثبت نامعتبر؛ وضعیت نامشخص است');}
    queue.clear(pending.payload.request_id);
    pending=null;claim=null;rows=[];renderRows();
    status('ثبت موفق: '+result.assets.map(function(a){return a.name;}).join('، '));
}
function sendPending(){
    var attempt=pending;
    if(!attempt||!connector||attempt.origin!==connector.origin||attempt.accountId!==accountId)throw Error('به همان حساب و سرور متصل شوید');
    return connector.publish(attempt.payload).then(function(result){
        finishPending(result);
    },function(e){
        // A structured definitive rejection is safe only before any ambiguous attempt.
        if(!attempt.uncertain&&[400,409,413,415].indexOf(e.status)>=0&&e.code){
            queue.clear(attempt.payload.request_id);pending=null;throw e;
        }
        attempt.uncertain=true;
        status('نتیجه ثبت نامشخص است. '+errorText(e)+'؛ همان درخواست را دوباره ارسال کنید.',true);
    });
}
$('studioOpen').onclick=function(){$('studioPanel').hidden=false;sync();};
$('ssClose').onclick=function(){if(!busy)$('studioPanel').hidden=true;};
$('ssAccount').onclick=function(){try{var c=new Connector($('ssOrigin').value.trim());if(!cs)cs=new CSInterface();cs.openURLInDefaultBrowser(c.accountUrl());}catch(e){status(errorText(e),true);}};
$('ssConnect').onclick=function(){task(function(){
    var c=new Connector($('ssOrigin').value.trim()),token=$('ssToken').value.trim();$('ssToken').value='';
    c.setToken(token);
    return c.capabilities().then(function(data){
        if(!Number.isInteger(data.account_id)||data.account_id<=0){c.clearToken();throw Error('نسخه سرور برای صف پایدار مناسب نیست');}
        if((pending&&data.account_id!==pending.accountId)||(claim&&accountId&&data.account_id!==accountId)){c.clearToken();throw Error('برای ادامه به همان حساب قبلی متصل شوید');}
        if(connector)connector.clearToken();connector=c;cap=data;account=data.username;accountId=data.account_id;
        catalogOffset=0;$('ssCatalogResults').textContent='';
        $('ssAccountState').textContent='متصل: '+account+(data.operations.upload?' — مجاز به ثبت':' — فقط مشاهده');
        status('اتصال برقرار شد');return getFacets(true);
    },function(e){c.clearToken();throw e;});
});};
$('ssDisconnect').onclick=function(){task(function(){var c=connector;cap=null;connector=null;$('ssToken').value='';$('ssAccountState').textContent='متصل نیست';return c?c.revoke().catch(function(){status('توکن محلی پاک شد؛ لغو روی سرور تأیید نشد.',true);}):null;});};
$('ssExtract').onclick=function(){task(function(){
    if(rows.length&&!window.confirm('بازبینی فعلی جایگزین شود؟'))return;
    if(!cs)cs=new CSInterface();var mode=$('ssExtractMode').value;
    return Exporter.exportBatch(cs,mode==='family'?'family':'selection').then(function(result){
        if(mode==='single'&&result.items.length!==1)throw Error('برای طرح تکی دقیقاً یک آیتم انتخاب کنید');
        rows=Model.create(result.items,mode==='family'?'family':'selection',kinds());
        if(mode==='family'&&!claim)$('ssMode').value='new_family';
        applyDestination();renderRows();status('استخراج انجام شد؛ نوع اعضا را بررسی کنید.');
    });
});};
$('ssMode').onchange=function(){applyDestination();renderRows();};
$('ssFamily').onchange=function(){$('ssFamily').value=familyNumber($('ssFamily').value);applyDestination();renderRows();};
$('ssLookup').onclick=function(){task(function(){return connector.checkIdentity(familyNumber($('ssFamily').value),$('ssFamilyName').value,'').then(showMatches);});};
$('ssReserve').onclick=function(){task(function(){return connector.reserveFamily(familyNumber($('ssFamily').value),$('ssFamilyName').value.trim()).then(function(data){claim=data;$('ssFamily').value=data.family_key;applyDestination();renderRows();status('شماره رزرو شد.');});});};
$('ssRelease').onclick=function(){task(function(){return connector.releaseFamily(claim.reservation_id).then(function(){claim=null;status('رزرو آزاد شد.');});});};
$('ssFacetFetch').onclick=function(){task(function(){return getFacets(true);});};
$('ssFacetMore').onclick=function(){task(function(){return getFacets(false);});};
$('ssAll').onclick=function(){rows=rows.map(function(r){r.selected=!!r.source.success;return r;});renderRows();};
$('ssNone').onclick=function(){rows=rows.map(function(r){r.selected=false;return r;});renderRows();};
$('ssApply').onclick=function(){var patch={},content=$('ssBulkContent').value,tags=$('ssBulkTags').value;
    if(content.trim())patch.content_tags=Model.tags(content);
    if(tags.trim())patch.tags=Model.tags(tags);
    if($('ssBulkAge').value)patch.design_age=$('ssBulkAge').value;
    if($('ssBulkPopular').value)patch.is_curated_popular=$('ssBulkPopular').value==='yes';
    if($('ssBulkFeatured').value)patch.is_featured=$('ssBulkFeatured').value==='yes';
    rows=Model.bulk(rows,selected().map(function(r){return r.id;}),patch,kinds());renderRows();
};
$('ssPublish').onclick=function(){task(function(){
    if(pending)throw Error('ابتدا نتیجه ثبت قبلی را مشخص کنید');
    if(!cap||!cap.operations||!cap.operations.upload)throw Error('مجوز ثبت در سرور فعال نیست');
    var mode=$('ssMode').value,key=mode==='standalone'?'':familyNumber($('ssFamily').value);
    if(mode!=='standalone'&&!/^[1-9]\d{0,8}$/.test(key))throw Error('شماره خانواده معتبر وارد کنید');
    if(mode==='new_family'&&(!claim||claim.family_key!==key||claim.expires_at*1000<=Date.now()))throw Error('ابتدا شماره خانواده را رزرو کنید؛ رزرو منقضی را آزاد کنید.');
    applyDestination();
    var errors=Model.validate(rows,kinds(),[]), chosen=selected();
    if(errors.length)throw Error('بازبینی طرح‌ها: '+errors.map(function(e){return 'طرح '+e.id+' '+e.code;}).join('، '));
    if(!chosen.length||chosen.length>40)throw Error('یک تا ۴۰ طرح انتخاب کنید');
    if(mode!=='standalone'&&chosen.some(function(r){return r.family_key!==key;}))throw Error('ابزار و طرح مستقل را جداگانه ثبت کنید');
    var payload={request_id:connector.newPublicationId(),mode:mode,items:chosen.map(Model.payload)};
    if(key)payload.family_key=key;
    if(mode==='new_family'){payload.family_name=$('ssFamilyName').value.trim();payload.reservation_id=claim.reservation_id;}
    if(!window.confirm('ثبت '+chosen.length+' طرح در کاتالوگ مشترک استودیو ست؟'))return;
    if(!queue||queueError)throw Error('صف محلی در دسترس نیست؛ ارسال انجام نشد');
    var attempt={payload:payload,origin:connector.origin,account:account,accountId:accountId,uncertain:false};
    queue.save(attempt);pending=attempt;return sendPending();
});};
$('ssRetry').onclick=function(){task(sendPending);};
$('ssCheckStatus').onclick=function(){task(function(){
    return connector.publicationStatus(pending.payload.request_id).then(function(result){
        if(result.state==='committed')finishPending(result);
        else status('ثبت قطعی پیدا نشد؛ برای رفع ابهام همان درخواست را مجدداً ارسال کنید.',true);
    });
});};
function saveSvg(item){
    return connector.downloadSvg(item.id).then(function(data){
        // Save only with the CEP native file chooser and explicit user selection.
        if(!window.cep||!window.cep.fs||!window.cep.fs.showSaveDialogEx)throw Error('امکان ذخیره فایل در این محیط موجود نیست');
        var result=window.cep.fs.showSaveDialogEx('ذخیره طرح SVG','',['svg'],data.name);
        if(result.err||!result.data)return;
        var written=window.cep.fs.writeFile(result.data,data.base64,'Base64');
        if(written.err)throw Error('ذخیره فایل ناموفق');
        status('فایل SVG ذخیره شد.');
    });
}
function search(reset){
    if(reset){catalogOffset=0;catalogFilters={q:$('ssCatalogQuery').value,age:$('ssCatalogAge').value,popular:$('ssCatalogPopular').value};$('ssCatalogResults').textContent='';}
    if(catalogOffset===null)return Promise.resolve();
    return connector.searchCatalog(catalogFilters,catalogOffset).then(function(data){
        var box=$('ssCatalogResults');
        if(reset)box.appendChild(node('p',data.total+' طرح'));
        data.assets.forEach(function(item){
            var el=node('article');el.className='ss-item';
            el.appendChild(node('strong',item.title||item.name||'طرح'));
            el.appendChild(node('p',(item.name||'')+' | '+(item.family_key||'مستقل')+' | '+(item.family_role||item.design_kind||'')));
            el.appendChild(node('p',(item.content_tags||[]).join('، ')));
            el.appendChild(node('p',(item.design_age==='new'?'جدید':item.design_age==='old'?'قدیمی':'')+(item.is_curated_popular?' | پرطرفدار':'')));
            if(item.download_supported&&cap.operations.download_svg)el.appendChild(btn('ذخیره SVG',function(){task(function(){return saveSvg(item);});}));
            box.appendChild(el);
        });
        catalogOffset=data.next_offset;
    });
}
$('ssCatalogSearch').onclick=function(){task(function(){return search(true);});};
$('ssCatalogMore').onclick=function(){task(function(){return search(false);});};
try{
    cs=new CSInterface();
    var load=window.cep_node&&window.cep_node.require?window.cep_node.require:require;
    var path=load('path'),fs=load('fs'),base=cs.getSystemPath('userData');
    if(!base||!fs.existsSync(base))throw Error('مسیر داده کاربر در دسترس نیست');
    queue=new window.StudioPublicationQueue(path.join(base,'PardachStudioPublication'));
    pending=queue.read();
    if(pending){$('ssOrigin').value=pending.origin;account=pending.account;accountId=pending.accountId;status('درخواست قبلی بازیابی شد؛ به همان حساب متصل شوید.');}
}catch(e){queueError=e;status('صف محلی قابل استفاده نیست؛ ثبت جدید متوقف شد. '+errorText(e),true);}
sync();
}());

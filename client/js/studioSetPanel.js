(function(){
    'use strict';
    var get=function(id){return document.getElementById('ss-'+id);};
    var rows=[],kinds=[],families=[],client=null,cap=null,busy=false,queueOwner='',facetOffset=0,facetQuery='';
    // In mixed CEP context, require modules by absolute path if UMD chose CommonJS.
    var cs=new CSInterface(), load=window.cep_node && window.cep_node.require ? window.cep_node.require : (typeof require==='function'?require:null);
    function moduleOf(name,globalName){
        if(window[globalName])return window[globalName];
        if(!load)throw Error('CEP Node runtime required');
        return load(load('path').join(cs.getSystemPath('extension'),'client','js',name+'.js'));
    }
    var Connector, exporter, model;
    function status(s){get('status').textContent=s;}
    function error(e){return String(e&&e.code||e&&e.message||e);}
    function owner(){return client&&cap?client.origin+'|'+cap.username:'';}
    function pending(){return rows.filter(function(r){return r.selected&&!r.saved&&!r.failedExport;});}
    function sync(){
        get('review').disabled=busy||!rows.length;
        ['connect','disconnect','token-page','origin','token','mode'].forEach(function(k){get(k).disabled=busy;});
        get('extract').disabled=busy||!cap;
        get('upload').disabled=busy||!cap||!cap.operations.upload||owner()!==queueOwner||!pending().length;
        get('more').disabled=busy||facetOffset===null||!client;
    }
    function task(fn){
        if(busy)return;
        busy=true;sync();
        Promise.resolve().then(fn).catch(function(e){status(error(e));}).then(function(){busy=false;sync();});
    }
    function button(label,fn){var b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
    function element(tag,text){var el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;}
    function labeled(root,label,input){var l=element('label',label);l.appendChild(input);root.appendChild(l);}
    function input(value,onchange,type){var el=element('input');el.type=type||'text';el.value=value==null?'':value;el.onchange=function(){onchange(el.value);};return el;}
    function select(options,value,change){var el=element('select');options.forEach(function(o){var opt=element('option',o.label);opt.value=o.key;el.appendChild(opt);});el.value=value;el.onchange=function(){change(el.value);};return el;}
    function patch(id,changes,rerender){
        rows=rows.map(function(r){return r.id===id&&!r.saved?model.edit(r,changes,kinds):r;});
        if(rerender)render();else sync();
    }
    function render(){
        var target=get('items');target.textContent='';
        rows.forEach(function(row){
            var card=element('div');card.className='ss-item';
            var head=element('div');head.className='ss-row';var ck=element('input');ck.type='checkbox';ck.checked=row.selected;ck.disabled=!!row.saved||!!row.failedExport;
            ck.onchange=function(){patch(row.id,{selected:ck.checked},false);};head.appendChild(ck);
            if(row.source.preview_base64){var im=element('img');im.src='data:image/png;base64,'+row.source.preview_base64;im.alt='پیش‌نمایش';head.appendChild(im);}
            head.appendChild(element('strong',row.title||('طرح '+row.id)));card.appendChild(head);
            var info=element('p',row.source.success?(Number(row.source.width_cm).toFixed(3)+' × '+Number(row.source.height_cm).toFixed(3)+' cm'):(row.source.error||'استخراج ناموفق'));
            card.appendChild(info);
            if(row.source.warnings&&row.source.warnings.length)card.appendChild(element('p',row.source.warnings.join('؛ ')));
            if(!row.saved&&!row.failedExport){
                labeled(card,'عنوان',input(row.title,function(v){patch(row.id,{title:v});}));
                labeled(card,'نوع',select(kinds,row.design_kind,function(v){patch(row.id,{design_kind:v,confirmed:true},true);}));
                labeled(card,'خانواده',input(row.family_key,function(v){patch(row.id,{family_key:v},true);}));
                var roles=[{key:'',label:'بدون نقش'}], kind=kinds.filter(function(k){return k.key===row.design_kind;})[0];
                if(kind&&kind.default_family_role)roles.push({key:kind.default_family_role,label:kind.default_family_role});
                if(row.design_kind==='rakab'){roles.push({key:'secondary_rakab',label:'رکب دوم'});for(var i=3;i<=10;i++)roles.push({key:'rakab_'+i,label:'رکب '+i});}
                if(['darzi','tek','vol'].indexOf(row.design_kind)>=0){for(var j=1;j<=10;j++)roles.push({key:row.design_kind+'_'+j,label:row.design_kind+' '+j});}
                if(row.family_role&&!roles.some(function(o){return o.key===row.family_role;}))roles.push({key:row.family_role,label:row.family_role});
                labeled(card,'نقش خانواده',select(roles,row.family_role,function(v){patch(row.id,{family_role:v});}));
                labeled(card,'محتوا',input(row.content_tags.join('، '),function(v){patch(row.id,{content_tags:v});}));
                labeled(card,'تگ',input(row.tags.join('، '),function(v){patch(row.id,{tags:v});}));
                labeled(card,'کالکشن',input(row.collection_key,function(v){patch(row.id,{collection_key:v});}));
                labeled(card,'امتیاز (۰ تا ۵)',input(row.xmp_rating,function(v){patch(row.id,{xmp_rating:v===''?null:Number(v)});},'number'));
                labeled(card,'برچسب رنگی',select([{key:'',label:'بدون برچسب'},{key:'red',label:'قرمز'},{key:'yellow',label:'زرد'},{key:'green',label:'سبز'},{key:'blue',label:'آبی'},{key:'purple',label:'بنفش'}],row.xmp_label,function(v){patch(row.id,{xmp_label:v});}));
                var confirm=element('input');confirm.type='checkbox';confirm.checked=row.confirmed;confirm.onchange=function(){patch(row.id,{confirmed:confirm.checked});};labeled(card,'نوع و اطلاعات این طرح تأیید شد',confirm);
            }
            var result=element('p',row.message||'');result.className='ss-result';card.appendChild(result);target.appendChild(card);
        });sync();
    }
    function bulk(changes){
        rows=model.bulk(rows,pending().map(function(r){return r.id;}),changes,kinds,'add','add');render();
    }
    function facets(reset){
        var q=get('content-search').value.trim();if(reset||q!==facetQuery){facetOffset=0;facetQuery=q;get('facets').textContent='';}
        if(facetOffset===null)return Promise.resolve();
        return client.facets('content_tags',q,facetOffset,40).then(function(data){
            facetOffset=data.next_offset;
            data.values.forEach(function(v){get('facets').appendChild(button(v,function(){bulk({content_tags:[v]});}));});
        });
    }
    try {Connector=moduleOf('studioSetConnector','StudioSetConnector');exporter=moduleOf('studioSetSvgExport','StudioSetSvgExport');model=moduleOf('studioSetBatchMetadata','StudioSetBatchMetadata');}
    catch(e){status(error(e));return;}
    get('token-page').onclick=function(){try{var c=new Connector(get('origin').value.trim());cs.openURLInDefaultBrowser(c.accountUrl());}catch(e){status(error(e));}};
    get('connect').onclick=function(){task(function(){
        var candidate=new Connector(get('origin').value.trim());candidate.setToken(get('token').value.trim());get('token').value='';
        return candidate.capabilities().then(function(data){
            if(rows.length&&queueOwner!==candidate.origin+'|'+data.username){candidate.clearToken();throw Error('ابتدا صف حساب قبلی را پاک کنید.');}
            if(client)client.clearToken();client=candidate;cap=data;kinds=data.design_kinds;
            status('متصل: '+data.username+(data.operations.upload?' | ثبت شخصی فعال':' | فقط خواندن'));
            return client.families(0,100).then(function(d){
                families=d.families;var list=get('family-options');list.textContent='';
                families.forEach(function(f){var o=element('option');o.value=f.family_key;list.appendChild(o);});
            });
        });
    });};
    get('disconnect').onclick=function(){task(function(){var c=client;client=null;cap=null;if(c)return c.revoke().then(function(){status('اتصال قطع شد؛ صف در حافظه باقی مانده است.');},function(){status('توکن محلی پاک شد؛ لغو در سرور تأیید نشد.');});});};
    get('extract').onclick=function(){task(function(){
        if(rows.length&&!window.confirm('صف فعلی جایگزین شود؟'))return;
        return exporter.exportBatch(cs,get('mode').value).then(function(d){
            rows=model.create(d.items,get('mode').value,kinds);
            rows.forEach(function(r){r.failedExport=!r.source.success;});
            queueOwner=owner();render();status(rows.length+' طرح استخراج شد؛ اطلاعات را بازبینی کنید.');
            return facets(true);
        });
    });};
    get('apply-family').onclick=function(){bulk({family_key:get('family').value});};
    get('apply-tags').onclick=function(){bulk({tags:get('tags').value,content_tags:get('content').value});};
    get('search').onclick=function(){task(function(){return facets(true);});};
    get('more').onclick=function(){task(function(){return facets(false);});};
    get('select-all').onclick=function(){rows.forEach(function(r){if(!r.saved&&!r.failedExport)r.selected=true;});render();};
    get('clear').onclick=function(){if(window.confirm('صف و اطلاعات ثبت‌نشده پاک شود؟')){rows=[];queueOwner='';render();status('صف پاک شد.');}};
    get('upload').onclick=function(){task(function(){
        if(owner()!==queueOwner||!cap.operations.upload)throw Error('اتصال و مجوز ثبت شخصی لازم است.');
        var selected=pending(),issues=model.validate(selected,kinds,[]);
        if(issues.length){status(issues.map(function(x){return 'طرح '+x.id+': '+x.code;}).join('\n'));return;}
        var count=0,failed=0,stop=false;
        return selected.reduce(function(chain,row){return chain.then(function(){
            if(stop)return;
            status('در حال ثبت طرح '+row.id);
            return client.upload(model.payload(row)).then(function(result){
                row.saved=true;row.selected=false;row.message=(result.created?'ثبت شد: ':'قبلاً ثبت شده: ')+result.asset_id;count++;
                // Retain only metadata and preview for completed rows.
                delete row.source.svg_base64;
            },function(e){row.message=error(e);failed++;if(e.status===401||e.status===403)stop=true;}).then(render);
        });},Promise.resolve()).then(function(){status('ثبت موفق: '+count+' | ناموفق: '+failed+(stop?' | اتصال یا مجوز را بررسی کنید.':'')+'؛ موارد ناموفق در صف باقی مانده‌اند.');});
    });};
    sync();
}());

/* Legacy Vector Catalog -> Pardach/Setoffline catalog metadata adapter.
 * Reads ONLY declared JSON fields; never evals Symbol.note or imports
 * the old SQLite / sql-wasm runtime into the uploader.
 * No network, filesystem or host dependency; usable in Node tests.
 */
(function (root) {
    'use strict';
    var KINDS = {
        'گل':'flower', 'gol':'flower','flower':'flower','g':'flower',
        'کپ گل':'half_flower','کپ‌گل':'half_flower','کپگل':'half_flower',
        'half_flower':'half_flower','half-flower':'half_flower','k':'half_flower','cg':'half_flower',
        'رکب':'rakab','rakab':'rakab','r':'rakab',
        'بنک':'benook','بنوک':'benook','banook':'benook','benook':'benook','b':'benook',
        'درزی':'darzi','درري':'darzi','darzi':'darzi','d':'darzi',
        'تک':'tek','tek':'tek','t':'tek',
        'ابزار':'tool','tool':'tool','a':'tool'
    };
    var MAX_NOTE=24*1024;
    function digits(value) {
        return String(value == null ? '' : value).replace(/[۰-۹٠-٩]/g,function(ch){
            var n=ch.charCodeAt(0);
            return String(n>=0x6F0&&n<=0x6F9?n-0x6F0:n-0x660);
        });
    }
    function clean(value,max) {
        if (value === undefined || value === null) return '';
        if (typeof value !== 'string' && typeof value !== 'number') return '';
        return String(value).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max||255);
    }
    function normalizedFamily(value) {
        var key=digits(clean(value,150)).toLowerCase().replace(/^family\s*:/,'').trim();
        key=key.replace(/[^a-z0-9_-]/g,'-').replace(/-+/g,'-').replace(/^[-_]+|[-_]+$/g,'');
        return key.slice(0,120);
    }
    function kindOf(value) {
        var key=clean(value,80).replace(/\s+/g,' ').toLowerCase();
        return Object.prototype.hasOwnProperty.call(KINDS,key)?KINDS[key]:'';
    }
    function stringList(value,maxItems) {
        var raw=Array.isArray(value)?value:(typeof value==='string'?value.split(/[,،;]/):[]);
        var result=[],seen=Object.create(null);
        for(var i=0;i<raw.length&&result.length<(maxItems||50);i++) {
            var text=clean(raw[i],100);
            if(!text||seen[text.toLowerCase()])continue;
            seen[text.toLowerCase()]=true;result.push(text);
        }
        return result;
    }
    function parseNote(raw) {
        var note=typeof raw==='string'?raw.trim():'';
        if(!note)return {data:{},warnings:[]};
        if(note.length>MAX_NOTE)return {data:{},warnings:['note_too_large']};
        if(note.charAt(0)!=='{')return {data:{description:clean(note,2000)},warnings:[]};
        try {
            var parsed=JSON.parse(note);
            if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))
                return {data:{},warnings:['invalid_note_shape']};
            return {data:parsed,warnings:[]};
        } catch(_) {
            return {data:{},warnings:['invalid_json_note']};
        }
    }
    function normalize(raw, base) {
        raw=raw||{}; base=base||{};
        var primary=normalizedFamily(raw.family_key || base.family || '');
        var codes=stringList(raw.family_codes || raw.family_keys || [],50).map(normalizedFamily).filter(Boolean);
        var families=[],seen=Object.create(null);
        function add(s){if(s&&!seen[s]){seen[s]=true;families.push(s);}}
        add(primary);codes.forEach(add);
        var type=kindOf(raw.design_kind || raw.type || raw.design_type || base.kind);
        var code=clean(raw.code || base.code,160);
        var title=clean(raw.title || raw.name || base.title || code,255);
        // In the legacy catalog, a flower is usually the root of a family
        // whose family code equals its symbol code.
        if(type==='flower'&&!families.length)add(normalizedFamily(code));
        if(type==='tool')families=[];
        var tags=stringList(raw.tags || base.tags,50);
        var contentTags=stringList(raw.content_tags || raw.keywords || [],50);
        var description=clean(raw.description || raw.desc || base.description,2000);
        var collection=clean(raw.collection_key || raw.collection || base.collection,120);
        var era=clean(raw.era,80);
        var legacyCreated=clean(raw.created_at || raw.created,100);
        var rating=raw.rating===undefined?raw.xmp_rating:raw.rating;
        rating=(rating===undefined||rating===null||rating==='')?null:Number(rating);
        if(rating!==null && (!isFinite(rating)||rating<0||rating>5))rating=null;
        var label=clean(raw.xmp_label || raw.label,80);
        return {
            title:title,code:code,kind:type,family:families[0]||'',
            family_codes:families,tags:tags,content_tags:contentTags,
            description:description,collection:collection,era:era,
            legacy_created_at:legacyCreated,rating:rating,
            label:label,source:clean(raw.created_at?'legacy_symbol_note':(raw.code?'symbol_note':'selection'),50)
        };
    }
    function fromSelection(info,base) {
        var parsed=parseNote(info && info.source_note);
        var mapped=normalize(parsed.data,base);
        mapped.warnings=parsed.warnings;
        mapped.symbol_name=clean(info&&info.symbol_name,160);
        return mapped;
    }
    var api={parseNote:parseNote,normalize:normalize,fromSelection:fromSelection,
        normalizedFamily:normalizedFamily,kindOf:kindOf,digits:digits};
    if(typeof module!=='undefined'&&module.exports)module.exports=api;
    if(root)root.PardachLegacyAdapter=api;
})(typeof window!=='undefined'?window:null);

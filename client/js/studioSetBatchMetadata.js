/* Pure CEP 9-compatible review model. Metadata remains local until a future authorized upload. */
(function(root,factory){
    if(typeof module==='object'&&module.exports) module.exports=factory();
    else root.StudioSetBatchMetadata=factory();
}(this,function(){
    'use strict';
    var aliases={'گل':'flower','کپ گل':'half_flower','رکب':'rakab','بنوک':'benook','بنک':'benook','تک':'tek','تِک':'tek','ول':'vol','وُل':'vol','درزی':'darzi','ابزار':'tool'};
    var prefixes={g:'flower',cg:'half_flower',r:'rakab',b:'benook',t:'tek',v:'vol',d:'darzi',a:'tool'};
    var suffixes={k:'half_flower',r:'rakab',b:'benook',t:'tek',v:'vol',d:'darzi'};
    var fileSuffix={flower:'',half_flower:'k',rakab:'r',benook:'b',tek:'t',vol:'v',darzi:'d'};
    function clean(value){return String(value==null?'':value).replace(/\s+/g,' ').trim();}
    function familyKey(value){return clean(value).toLowerCase().replace(/^family\s*[:=]\s*/,'').replace(/^f(?=\d+$)/,'').replace(/[^a-z0-9_-]+/g,'-').replace(/^[-_]+|[-_]+$/g,'');}
    function tags(value){
        var input=Array.isArray(value)?value:[value],out=[],seen={};
        input.forEach(function(v){clean(v).split(/[,،;\n]+/).forEach(function(t){
            t=clean(t);var k='$'+t.toLowerCase();if(t&&!seen[k]){seen[k]=true;out.push(t);}
        });});return out;
    }
    function mergeTags(current,incoming,mode){
        var a=tags(current),b=tags(incoming);
        if(mode==='clear')return [];
        if(mode==='replace')return b;
        if(mode==='remove')return a.filter(function(v){return !b.some(function(x){return x.toLowerCase()===v.toLowerCase();});});
        return tags(a.concat(b));
    }
    function infer(name){
        var stem=clean(name).replace(/\.svg$/i,''),m,kind='',family='',index=null;
        if(Object.prototype.hasOwnProperty.call(aliases,stem))kind=aliases[stem];
        else if((m=stem.match(/^(cg|g|r|b|t|v|d|a)(\d+)$/i))){kind=prefixes[m[1].toLowerCase()];family=m[2];}
        else if((m=stem.match(/^(\d+)(k|r|b|t|v|d)(\d+)?$/i))){kind=suffixes[m[2].toLowerCase()];family=m[1];index=m[3]?Number(m[3]):null;}
        else if((m=stem.match(/\d+/)))family=m[0];
        if(kind==='tool')family='';
        return {kind:kind||'unknown',family:family,member_index:index,needs_confirmation:true};
    }
    function defaultRole(kind,index,kinds){
        var option=(kinds||[]).filter(function(k){return k.key===kind;})[0];
        if(!option||kind==='tool'||kind==='unknown')return '';
        if(kind==='rakab'&&index===2)return 'secondary_rakab';
        if(kind==='rakab'&&index>2)return 'rakab_'+index;
        if(['darzi','tek','vol'].indexOf(kind)>=0&&index>0)return kind+'_'+index;
        return option.default_family_role||'';
    }
    function create(items,mode,kinds){
        return items.map(function(item,i){
            var guess=infer(item.name);
            return {id:i+1,source:item,selected:!!item.success,title:clean(item.name),design_kind:guess.kind,
                family_key:mode==='family'?'':guess.family, family_role:defaultRole(guess.kind,guess.member_index,kinds),
                confirmed:false,tags:[],content_tags:[],xmp_rating:null,xmp_label:'',collection_key:'',is_featured:false};
        });
    }
    function edit(row,patch,kinds){
        var next={},k;for(k in row)if(Object.prototype.hasOwnProperty.call(row,k))next[k]=row[k];
        for(k in patch)if(Object.prototype.hasOwnProperty.call(patch,k))next[k]=patch[k];
        next.family_key=familyKey(next.family_key);
        next.tags=tags(next.tags);next.content_tags=tags(next.content_tags);
        if(patch.design_kind!==undefined&&patch.design_kind!==row.design_kind&&patch.family_role===undefined)next.family_role=defaultRole(next.design_kind,null,kinds);
        if(next.design_kind==='tool'){next.family_key='';next.family_role='';}
        if(!next.family_key)next.family_role='';
        else if(!next.family_role)next.family_role=defaultRole(next.design_kind,null,kinds);
        if(patch.design_kind!==undefined&&patch.confirmed===undefined)next.confirmed=false;
        return next;
    }
    function bulk(rows,ids,patch,kinds,tagMode,contentMode){
        return rows.map(function(row){
            if(ids.indexOf(row.id)<0)return row;
            var changes={},k;for(k in patch)if(Object.prototype.hasOwnProperty.call(patch,k))changes[k]=patch[k];
            if(patch.tags!==undefined)changes.tags=mergeTags(row.tags,patch.tags,tagMode);
            if(patch.content_tags!==undefined)changes.content_tags=mergeTags(row.content_tags,patch.content_tags,contentMode);
            return edit(row,changes,kinds);
        });
    }
    function validate(rows,kinds,existingFamilies){
        var errors=[],flowers={},roles={},existing={};
        (existingFamilies||[]).forEach(function(f){existing['$'+familyKey(f.family_key)]=f;});
        rows.filter(function(r){return r.selected;}).forEach(function(r){
            function error(code){errors.push({id:r.id,code:code});}
            if(!r.source||!r.source.success)error('export_failed');
            if(!r.confirmed||r.design_kind==='unknown'||!kinds.some(function(k){return k.key===r.design_kind;}))error('kind_confirmation_required');
            if(r.design_kind==='tool'&&(r.family_key||r.family_role))error('tool_cannot_join_family');
            if(r.design_kind==='flower'&&!r.family_key)error('flower_family_required');
            if(r.family_key&&r.design_kind!=='tool'&&!r.family_role)error('family_role_required');
            if(r.family_key&&r.family_role){
                var key='$'+r.family_key+'/'+r.family_role;
                if(roles[key])error('duplicate_batch_role');roles[key]=true;
            }
            if(r.design_kind==='flower'&&r.family_key){
                var key2='$'+r.family_key;
                if(flowers[key2]||(existing[key2]&&existing[key2].has_flower))error('duplicate_flower');
                flowers[key2]=true;
            }
            if(r.xmp_rating!==null&&(!Number.isInteger(r.xmp_rating)||r.xmp_rating<0||r.xmp_rating>5))error('invalid_rating');
        });
        return errors;
    }
    function payload(row){
        if(!row.source||!row.source.success||!row.confirmed)throw Error('Review required');
        var source=row.source, suffix=fileSuffix[row.design_kind],name;
        if(row.family_key&&suffix!==undefined){
            if(row.family_role==='secondary_rakab')suffix='r2';
            else if(/^rakab_\d+$/.test(row.family_role))suffix='r'+row.family_role.split('_')[1];
            else if(/^(darzi|tek|vol)_\d+$/.test(row.family_role))suffix+=row.family_role.split('_')[1];
            name=row.family_key+suffix+'.svg';
        }else name='design-'+row.id+'.svg';
        return {name:name,title:row.title,design_kind:row.design_kind,family_key:row.family_key,
            family_role:row.family_role,tags:tags(row.tags),content_tags:tags(row.content_tags),
            xmp_keywords:tags(row.tags.concat(row.content_tags)),xmp_rating:row.xmp_rating,xmp_label:row.xmp_label,
            collection_key:row.collection_key,is_featured:!!row.is_featured,width_cm:source.width_cm,height_cm:source.height_cm,
            mime_type:'image/svg+xml',base64:source.svg_base64,file_hash:source.file_hash};
    }
    return {infer:infer,create:create,edit:edit,bulk:bulk,validate:validate,payload:payload,tags:tags};
}));

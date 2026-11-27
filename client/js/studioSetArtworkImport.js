/* Verified local SVG staging, never evaluates remote artwork as code. */
(function(root,factory){
    if(typeof window==='undefined'&&typeof module==='object'&&module.exports)module.exports=factory(require);
    else root.StudioSetArtworkImport=factory(root.cep_node&&root.cep_node.require?root.cep_node.require:typeof require==='function'?require:null);
}(this,function(load){
    'use strict';
    function importBatch(cs,artworks){
        if(!load||!cs||!Array.isArray(artworks)||!artworks.length||artworks.length>40)return Promise.reject(Error('Invalid import batch'));
        var fs=load('fs'),path=load('path'),os=load('os'),crypto=load('crypto'),dir,files=[],size=0;
        function cleanup(){if(!dir)return;try{fs.readdirSync(dir).forEach(function(n){fs.unlinkSync(path.join(dir,n));});fs.rmdirSync(dir);}catch(ignored){}}
        function literal(v){return JSON.stringify(v).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
        try{
            dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-import-'));
            artworks.forEach(function(a,i){
                if(!a||typeof a.base64!=='string'||a.base64.length>1400000||
                   typeof a.width_cm!=='number'||!isFinite(a.width_cm)||a.width_cm<=0||
                   typeof a.height_cm!=='number'||!isFinite(a.height_cm)||a.height_cm<=0)
                    throw Error('Invalid artwork metadata');
                var bytes=new Buffer(a.base64,'base64');
                size+=bytes.length;
                if(size>16*1024*1024||crypto.createHash('sha256').update(bytes).digest('hex')!==a.file_hash)throw Error('Invalid artwork hash or batch size');
                var file=path.join(dir,'member-'+(i+1)+'.svg');
                fs.writeFileSync(file,bytes,{flag:'wx',mode:384});
                files.push({path:file,name:String(a.name||'design').slice(0,140),width_pt:a.width_cm*72/2.54,height_pt:a.height_cm*72/2.54});
            });
            var script='$.evalFile('+literal(path.join(cs.getSystemPath('extension'),'host','studioSetArtworkImport.jsx'))+'); StudioSetArtworkImportHost.run('+literal(files)+')';
        }catch(e){cleanup();return Promise.reject(e);}
        return new Promise(function(resolve,reject){
            try{cs.evalScript(script,function(raw){
                try{var result=JSON.parse(raw);if(!result.success)throw Error(result.error||'Import failed');resolve(result);}
                catch(e){reject(e);}finally{cleanup();}
            });}catch(e){cleanup();reject(e);}
        });
    }
    return {importBatch:importBatch};
}));

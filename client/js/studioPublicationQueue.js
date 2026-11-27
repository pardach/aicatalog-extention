/* One durable, explicit pending publication. No tokens or passwords are saved. */
(function(root,factory){
    if(typeof window==='undefined'&&typeof module==='object'&&module.exports)module.exports=factory(require);
    else root.StudioPublicationQueue=factory(root.cep_node&&root.cep_node.require?root.cep_node.require:typeof require==='function'?require:null);
}(this,function(load){
    'use strict';
    var MAX=25*1024*1024;
    function Queue(directory){
        if(!load)throw Error('CEP Node runtime required');
        this.fs=load('fs');this.path=load('path');this.crypto=load('crypto');
        this.dir=directory;
        if(!this.fs.existsSync(directory))this.fs.mkdirSync(directory,448);
        if(!this.fs.lstatSync(directory).isDirectory())throw Error('Invalid queue directory');
        this.file=this.path.join(directory,'pending-v1.json');
    }
    function validate(row){
        if(!row||row.version!==1||typeof row.origin!=='string'||!/^https:\/\/[^/?#\s]+$/.test(row.origin)||
           typeof row.account!=='string'||!Number.isInteger(row.accountId)||row.accountId<=0||
           !row.payload||!(/^[a-f0-9]{32}$/).test(row.payload.request_id||'')||
           !Array.isArray(row.payload.items)||!row.payload.items.length||row.payload.items.length>40)
            throw Error('Invalid saved publication');
        if(row.payload.items.some(function(x){return !x||typeof x.base64!=='string'||!/^[a-f0-9]{64}$/.test(x.file_hash||'');}))
            throw Error('Invalid saved artwork');
        return row;
    }
    Queue.prototype.read=function(){
        if(!this.fs.existsSync(this.file))return null;
        var st=this.fs.lstatSync(this.file);
        if(!st.isFile()||st.size>MAX||st.size<=0)throw Error('Invalid queue file');
        return validate(JSON.parse(this.fs.readFileSync(this.file,'utf8')));
    };
    Queue.prototype.save=function(attempt){
        // Only explicitly allowlisted envelope fields; no bearer token.
        var row=validate({version:1,origin:attempt.origin,account:attempt.account,accountId:attempt.accountId,
            payload:attempt.payload,createdAt:Date.now(),uncertain:true});
        var existing=this.read();
        if(existing)throw Error('A pending publication already exists');
        var body=JSON.stringify(row);
        if(Buffer.byteLength(body,'utf8')>MAX)throw Error('Queue exceeds size limit');
        var tmp=this.file+'.'+this.crypto.randomBytes(8).toString('hex')+'.tmp';
        var fd=null;
        try{
            fd=this.fs.openSync(tmp,'wx',384);
            this.fs.writeFileSync(fd,body,'utf8');this.fs.fsyncSync(fd);this.fs.closeSync(fd);fd=null;
            // Atomic no-overwrite publication of the queue file on supported local filesystems.
            this.fs.linkSync(tmp,this.file);
        }finally{
            if(fd!==null)this.fs.closeSync(fd);
            try{this.fs.unlinkSync(tmp);}catch(ignored){}
        }
        return row;
    };
    Queue.prototype.clear=function(id){
        var row=this.read();
        if(!row)return;
        if(row.payload.request_id!==id)throw Error('Queue identity mismatch');
        this.fs.unlinkSync(this.file);
    };
    return Queue;
}));

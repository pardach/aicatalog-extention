const assert=require('assert');
const Connector=require('../client/js/studioSetConnector');
const c=new Connector('https://example.com');
const calls=[];
c._request=function(method,path,payload){calls.push({method,path,payload});return Promise.resolve({api_version:1,replayed:false,assets:[]});};
const id=c.newPublicationId();
assert(/^[a-f0-9]{32}$/.test(id));
const payload={request_id:id,mode:'standalone',items:[{base64:'YQ==',file_hash:'a'.repeat(64)}]};
c.publish(payload).then(function(){
    assert.strictEqual(calls[0].path,'publish');
    assert.strictEqual(calls[0].payload,payload);
    return c.publish(payload);
}).then(function(){
    assert.strictEqual(calls[1].payload.request_id,id);
    return c.publish({request_id:id,mode:'standalone',items:[]}).then(function(){throw Error('expected rejection');},function(){});
}).then(function(){console.log('Publication contract passed');},function(e){console.error(e);process.exitCode=1;});

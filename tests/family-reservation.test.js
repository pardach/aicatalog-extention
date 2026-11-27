const assert=require('assert');
const Connector=require('../client/js/studioSetConnector');
const c=new Connector('https://example.com');
const calls=[];
c._request=function(method,path,payload){calls.push({method,path,payload});return Promise.resolve({api_version:1});};
Promise.all([c.reserveFamily('','سبزو'),c.releaseFamily('reservation-token')]).then(function(){
    assert.deepStrictEqual(calls[0],{method:'POST',path:'family-reservations',payload:{family:'',name:'سبزو'}});
    assert.deepStrictEqual(calls[1],{method:'POST',path:'family-reservations/release',payload:{reservation_id:'reservation-token'}});
    return c.reserveFamily(null,'').then(function(){throw Error('expected rejection');},function(){});
}).then(function(){console.log('Reservation client contract checks passed');},function(e){console.error(e);process.exitCode=1;});

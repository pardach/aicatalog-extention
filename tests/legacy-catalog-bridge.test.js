const assert=require('assert'),Connector=require('../client/js/studioSetConnector');
const c=new Connector('https://example.com');
const calls=[];c._request=function(method,route,payload){calls.push({method,route,payload});return Promise.resolve({});};
c.familyPlan('334').then(function(){
    assert.strictEqual(calls[0].route,'family-plan?family=334');
    return c.familyPlan('../334').then(function(){throw Error('expected invalid number');},function(){});
}).then(function(){console.log('Legacy family preflight checks passed');},function(e){console.error(e);process.exitCode=1;});

const fs=require('fs'),path=require('path'),cp=require('child_process');
const dir=__dirname;
const tests=fs.readdirSync(dir).filter(f=>/\.test\.js$/.test(f)).sort();
if(!tests.length)throw Error('No tests found');
let failed=0;
for(const file of tests){
    const result=cp.spawnSync(process.execPath,[path.join(dir,file)],{stdio:'inherit'});
    if(result.error||result.status!==0){failed++;console.error('FAIL: '+file);}
}
console.log((tests.length-failed)+'/'+tests.length+' test files passed');
process.exitCode=failed?1:0;

/* Test the importer without Adobe Illustrator or network.
 * Run: node direct-uploader/tests/legacy-adapter.cjs
 */
const assert=require('node:assert/strict');
const adapter=require('../client/legacy-adapter.js');
const note=JSON.stringify({
    code:'G001',type:'گل',family_codes:['G001','F140'],
    tags:['بلوچی','گل','بلوچی'],desc:'نقش اصلی خانواده',
    era:'قدیمی',created_at:'2025-01-01',collection:'سرباز'
});
const flower=adapter.fromSelection({source_note:note,symbol_name:'G001'},
    {title:'نام جایگزین',code:'بدون کد',kind:'',family:''});
assert.equal(flower.code,'G001');
assert.equal(flower.kind,'flower');
assert.deepEqual(flower.family_codes,['g001','f140']);
assert.deepEqual(flower.tags,['بلوچی','گل']);
assert.equal(flower.description,'نقش اصلی خانواده');
assert.equal(flower.era,'قدیمی');
assert.equal(flower.legacy_created_at,'2025-01-01');
assert.equal(flower.collection,'سرباز');
assert.equal(flower.source,'legacy_symbol_note');

const benook=adapter.normalize({
    code:'B013',type:'بنک',family_codes:['۳۳۴','۳۳۵'],tags:['بنوک']
},{});
assert.equal(benook.kind,'benook');
assert.deepEqual(benook.family_codes,['334','335']);
assert.equal(benook.family,'334');

const rakab=adapter.normalize({code:'334r2',type:'رکب',family_codes:['۳۳۴']},{});
assert.equal(rakab.kind,'rakab');
assert.equal(rakab.family,'334');

const tool=adapter.normalize({code:'A21',type:'ابزار',family_codes:['123','456']},{});
assert.deepEqual(tool.family_codes,[]);
assert.equal(tool.family,'');

const bad=adapter.fromSelection({source_note:'{evil malformed JSON'}, {title:'fallback',code:'x'});
assert.equal(bad.title,'fallback');
assert.deepEqual(bad.warnings,['invalid_json_note']);

const injected=adapter.fromSelection({
    source_note:'{"code":"P001","type":"گل","tags":["a"],"__proto__":{"admin":true}}'
},{title:'test',code:'0'});
assert.equal(injected.code,'P001');
assert.equal({}.admin,undefined);
assert.equal(adapter.kindOf('کپ گل'),'half_flower');
assert.equal(adapter.kindOf('درزی'),'darzi');
assert.equal(adapter.kindOf('whatever'),'');
console.log('PASS: legacy Symbol Note / multi-family Setoffline metadata adaptation');

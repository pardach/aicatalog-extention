/* Runs without Illustrator: node direct-uploader/tests/selection-hierarchy.cjs
 * Simulates Adobe GroupItem/PageItem parent relationships and bounds.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function group(name,bounds=[0,100,100,0]) {
    return {typename:'GroupItem', name, visibleBounds:bounds, pageItems:[], note:'', parent:null};
}
function pathItem(name,bounds=[0,20,20,0]) {
    return {typename:'PathItem', name, visibleBounds:bounds, note:'', parent:null};
}
function add(parent,item) {item.parent=parent;parent.pageItems.push(item);}
function load(selection) {
    const ctx={app:{documents:[{}],activeDocument:{name:'test.ai',selection}}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../host/export.jsx'),'utf8'),ctx);
    return {api:ctx.PardachDirectUpload,doc:ctx.app.activeDocument};
}
function inspect(ctx,mode) {
    return JSON.parse(ctx.api.inspectBatch(mode));
}
const family=group('خانواده۳۳۴'),flower=group('۳۳۴g'),rack=group('۳۳۴r2');
add(family,flower);add(family,rack);add(flower,pathItem('flower-detail'));
const solo=group('motif'),decorationA=group('shadow'),decorationB=group('texture');
add(solo,decorationA);add(solo,decorationB);
const a=load([family]);
assert.equal(inspect(a,'smart').items.length,2,'Persian-digit family auto-splits');
assert.equal(inspect(a,'children').items[0].name,'۳۳۴g');
assert.equal(inspect(a,'one').items.length,1);
assert.equal(inspect(a,'each').items.length,1);
const b=load([solo]);
assert.equal(inspect(b,'smart').items.length,1,'decorative groups must not split');
const other=group('family_335'),otherFlower=group('335g'),otherRack=group('335r');
add(other,otherFlower);add(other,otherRack);
const mixed=load([family,other,solo]);
const smart=inspect(mixed,'smart');
assert.equal(smart.items.length,5,'multiple families split independently');
assert.equal(smart.items.filter(x=>x.parent_name).length,4);
const c=load(Array.from({length:80},(_,i)=>group('design-'+i)));
assert.equal(inspect(c,'smart').items.length,80,'80 independent design groups');
add(family,pathItem('ungrouped'));
const fail=inspect(a,'children');
assert.equal(fail.ok,false,'ungrouped artwork cannot disappear silently');
console.log('PASS: Illustrator hierarchy selection scenarios');

/* Run with Node: node direct-uploader/tests/legacy-symbol-bridge.cjs
 * Simulates Illustrator SymbolItem + GroupItem and verifies metadata is
 * transferred read-only into the uploader's inspection protocol.
 */
const fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path'),assert=require('node:assert/strict');
const host=fs.readFileSync(path.join(__dirname,'../host/export.jsx'),'utf8');
const symbol={name:'G001',note:JSON.stringify({
    type:'گل',code:'G001',family_codes:['G001','334'],tags:['بلوچی'],desc:'شرح'
})};
const instance={typename:'SymbolItem',name:'',symbol,visibleBounds:[0,72,72,0],parent:null};
const document={name:'legacy.ai',selection:[instance]};
const ctx={app:{documents:[document],activeDocument:document}};
vm.runInNewContext(host,ctx);
const direct=JSON.parse(ctx.PardachDirectUpload.inspectBatch('smart'));
assert.equal(direct.ok,true);
assert.equal(direct.items.length,1);
assert.equal(direct.items[0].symbol_name,'G001');
assert.equal(direct.items[0].source_note,symbol.note);
assert.equal(direct.items[0].width_mm,25.4);

const parent={typename:'GroupItem',name:'wrapper',pageItems:[instance],
    visibleBounds:[0,72,72,0],parent:null};
instance.parent=parent;document.selection=[parent];
const nested=JSON.parse(ctx.PardachDirectUpload.inspectBatch('smart'));
assert.equal(nested.ok,true);
assert.equal(nested.items[0].source_note,symbol.note);
assert.equal(nested.items[0].symbol_name,'G001');
assert.equal(symbol.note,JSON.stringify({
    type:'گل',code:'G001',family_codes:['G001','334'],tags:['بلوچی'],desc:'شرح'
}));
console.log('PASS: legacy Symbol note extracted without mutating Illustrator source');

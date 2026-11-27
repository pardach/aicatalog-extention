const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const manifest = read('CSXS/manifest.xml');
assert(manifest.includes('Version="7.0"'));
assert(manifest.includes('Name="CSXS" Version="9.0"'));
assert(manifest.includes('Name="ILST" Version="[23.0,99.9]"'));
assert(manifest.includes('ExtensionBundleId="com.yourcompany.newextension"'));
assert(!/remote-debugging-port|enable-dev-tools/.test(manifest));
for (const match of manifest.matchAll(/<(?:MainPath|ScriptPath|Icon(?:\s+[^>]*)?)>([^<]+)</g)) {
    assert(fs.existsSync(path.resolve(root,match[1].trim())),match[1]);
}
for (const p of ['client/js/app.js','client/js/sqliteBridge-fixed.js','client/js/settings-manager.js','client/js/test-connection.js']) {
    assert(!/\?\.|\?\?/.test(read(p)),p+' contains unsupported syntax');
}
for (const p of ['client/sql-wasm.js','client/sql-wasm.wasm','install.ps1','uninstall.ps1']) assert(fs.existsSync(path.join(root,p)),p);
const pkg = JSON.parse(read('package.json'));
assert.strictEqual(pkg.cep.requiredRuntime.version,'9.0');
assert.strictEqual(pkg.main,'client/index.html');
assert(read('install.ps1').includes('9,10,11,12'));
assert(!/reg delete|Remove-ItemProperty/i.test(read('uninstall.ps1')));
console.log('Static CEP foundation checks passed. Real Illustrator testing is still required.');

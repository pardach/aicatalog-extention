const assert = require('assert');
const Connector = require('../client/js/studioSetConnector');
for (const invalid of ['http://example.com','https://user:pass@example.com','https://example.com/path','https://example.com?token=x','https://example.com/#x']) {
    assert.throws(() => new Connector(invalid));
}
const connector = new Connector('https://example.com');
assert.strictEqual(connector.accountUrl(),'https://example.com/account/illustrator-connector');
assert.throws(() => connector.setToken('bad'));
connector.setToken('isc1_' + 'a'.repeat(43));
connector.clearToken();
assert.strictEqual(connector.token,'');
Promise.all([
    connector.capabilities().then(() => {throw Error('expected rejection');}, () => {}),
    connector.families(-1,100).then(() => {throw Error('expected rejection');}, () => {})
]).then(() => console.log('Connector static/offline checks passed'), err => { console.error(err); process.exitCode = 1; });

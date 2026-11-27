# Studio Set connector — phase 2

Server counterpart: pardach/setoffline, branch feat/illustrator-connector-v1.

A CEP-compatible transport module is provided at client/js/studioSetConnector.js. It is not yet wired into the panel. The token lives only in the Connector instance; no disk/localStorage storage and no password collection. HTTPS with certificate checks, fixed origin, no redirects, response cap and timeout. A user must sign in on the ordinary Studio site and open /account/illustrator-connector to issue a short-lived token. Only enable server feature flag in an isolated test environment.

API v1: capabilities, paginated families, revoke. Upload/edit/delete are intentionally unavailable. The next UI phase will use accountUrl(), setToken(), capabilities(), families() and revoke(), with error handling and explicit token entry.

Run node tests/connector.test.js. Actual CEP 9 runtime and HTTPS proxy integration still need testing. No production URL is hard-coded.

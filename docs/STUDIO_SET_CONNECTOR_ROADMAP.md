# Studio Set Connector — release roadmap

Phase 1: CEP 9+ manifest, safe Windows source installer, legacy JavaScript compatibility, static checks. Keep the existing bundle ID and install directory to avoid unnecessary migration. Source installer is unsigned and requires explicit developer-mode consent. Backups are outside CEP scan paths. No host compatibility is certified yet.

Phase 2: versioned Setoffline API contract, scoped authentication, permissions and explicit global/personal catalog target.

Phase 3: isolated SVG export, exact pt-to-cm conversion, preview, no mutation of original art.

Phase 4: server-driven design_kind, family_key, family_role and metadata; conflict and duplicate policy.

Phase 5: review panel, bounded batch upload, durable queue and retry.

Phase 6: catalog sync, edits/deletes with permission checks, import to Illustrator.

Phase 7: Windows install/upgrade/uninstall matrix, Illustrator round-trip tests, signed ZXP and release installer. No production credentials or deployment during tests.

Phase 8: separate host adapter from connector core for eventual UXP migration.

## Manual release gate

- Illustrator 23.x/24.x (CEP 9), 25.0 (CEP 10), 25.3+ (CEP 11), 29.5.1+ (CEP 12), newer CEP-enabled hosts: open panel, register symbol, render SQLite/WASM, reopen, upgrade and uninstall/reinstall. No claim of support before passing.
- Test non-admin Windows account, failed installation, old profile backup and restoration. Backups can contain sensitive data and should remain private.
- Verify local settings, symbol notes and profile survive upgrade; current SQLite persistence still requires separate verification.
- Verify vendor SQL WASM and all loaded scripts in real CEP 9; static checks are not full browser compatibility proof.
- Signed production distribution and removal of debug development tools are a later release gate.

Adobe reference: https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_12.x/Documentation/CEP%2012%20HTML%20Extension%20Cookbook.md

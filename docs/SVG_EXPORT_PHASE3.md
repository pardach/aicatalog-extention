# Phase 3 — Illustrator SVG extraction foundation

Depends on phase 2 extension PR #4. The adapter is standalone and not yet wired into the panel or upload API.

- exportBatch(csInterface, 'selection') exports one top-level selected PageItem per file. Group/CompoundPath remain together. Symbol mode accepts exact names and uses the first placed instance at its current size; for unplaced definitions, explicitly reports an error. Select a specific instance to preserve its size/transform.
- The host duplicates artwork into a fresh temporary document in the source color space, checks copied visible bounds, crops the artboard, exports SVG with native Illustrator SVG exporter, attempts transparent PNG preview and closes without saving. No intended source mutation. Actual cross-document duplication and source selection/undo preservation must be verified in Illustrator.
- SVG physical dimensions are rewritten in cm while retaining viewBox and children; mismatched aspect or missing viewBox fails closed. Text is outlined in temporary output. Embedded raster content is flagged, not converted to vectors. Complex appearances, masks, CMYK conversion, clipping and exact SVG vector fidelity require visual comparison.
- CEP bridge uses fresh temporary output folders, validates file names, limits each SVG to 20 MiB, preview to 2 MiB, max 100 items, computes SHA-256 over normalized bytes; removes temp files after host callback. Full batch memory usage needs profiling; use small batches until durable queue is added. Host timeout/cancellation and abandoned temp cleanup are not implemented.
- No server writes, no upload, no user UI yet. Security sanitization of SVG is a separate server upload gate, not supplied by the root size normalizer.

## Test gate
Run node tests/svg-export.test.js. In Illustrator 2019, 2021 and a recent CEP host test: exact 72x36 pt rectangle → 2.54x1.27 cm; 60 cm artwork; multiple selected motifs; transformed symbol; unused symbol explicit error; nested group/compound path; strokes, clip masks, gradient, text, embedded image, CMYK; no artwork from neighboring items; source saved flag, selection and active document unchanged. Verify resulting SVG in Setoffline and re-open in Illustrator; inspect physical dimensions and vector editability. Validate failure cleanup. Reference: https://ai-scripting.docsforadobe.dev/jsobjref/ExportOptionsSVG/

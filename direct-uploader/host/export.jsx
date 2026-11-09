/* Pardach direct uploader - Illustrator ExtendScript (ES3-compatible).
 * Never saves or modifies the source document. One selected group or several
 * selected pageItems become ONE SVG catalog asset.
 */
var PardachDirectUpload = (function () {
    function escapeText(value) {
        return String(value == null ? "" : value)
            .replace(/\\/g, "\\\\").replace(/"/g, '\\"')
            .replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
    }
    function respond(data) {
        var keys = [], key, value;
        for (key in data) {
            if (!data.hasOwnProperty(key)) continue;
            value = data[key];
            keys.push('"' + escapeText(key) + '":' +
                (typeof value === "number" || typeof value === "boolean" ? String(value) : '"' + escapeText(value) + '"'));
        }
        return "{" + keys.join(",") + "}";
    }
    function rounded(mm) { return Math.round(mm * 1000) / 1000; }
    function selectionData() {
        if (app.documents.length < 1) throw Error("ابتدا یک سند Illustrator باز کنید");
        var doc = app.activeDocument, selected = doc.selection;
        if (!selected || selected.length < 1) throw Error("ابتدا طرح یا گروه مورد نظر را انتخاب کنید");
        var left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
        for (var i = 0; i < selected.length; i++) {
            var b = selected[i].visibleBounds;
            if (!b || b.length !== 4) throw Error("نوع انتخاب برای خروجی SVG پشتیبانی نمی‌شود");
            left = Math.min(left, b[0]); top = Math.max(top, b[1]);
            right = Math.max(right, b[2]); bottom = Math.min(bottom, b[3]);
        }
        if (!(right > left && top > bottom)) throw Error("ابعاد انتخاب نامعتبر است");
        var name = selected.length === 1 && selected[0].name ? String(selected[0].name) :
                   String(doc.name).replace(/\.[^\.]+$/, "");
        return { doc: doc, selected: selected, bounds: [left, top, right, bottom],
            count: selected.length, name: name, width: rounded((right - left) * 25.4 / 72),
            height: rounded((top - bottom) * 25.4 / 72) };
    }
    function inspect() {
        try {
            var data = selectionData();
            return respond({ok:true, name:data.name, count:data.count,
                width_mm:data.width, height_mm:data.height});
        } catch (e) {
            return respond({ok:false, error:String(e.message || e)});
        }
    }
    function exportSelection() {
        var tempDoc = null, source = null, output = null;
        try {
            var data = selectionData();
            source = data.doc;
            tempDoc = app.documents.add(DocumentColorSpace.RGB);
            var target = tempDoc.layers[0];
            for (var i = 0; i < data.selected.length; i++) {
                data.selected[i].duplicate(target, ElementPlacement.PLACEATEND);
            }
            /* Cross-document duplication can shift origins. Fit to the actual
               duplicated artwork rather than the source artboard. */
            var bLeft = Infinity, bRight = -Infinity, bTop = -Infinity, bBottom = Infinity;
            for (var j = 0; j < target.pageItems.length; j++) {
                var b = target.pageItems[j].visibleBounds;
                bLeft = Math.min(bLeft, b[0]); bTop = Math.max(bTop, b[1]);
                bRight = Math.max(bRight, b[2]); bBottom = Math.min(bBottom, b[3]);
            }
            if (!(bRight > bLeft && bTop > bBottom)) throw Error("ناحیه خروجی معتبر نیست");
            tempDoc.artboards[0].artboardRect = [bLeft, bTop, bRight, bBottom];
            var stamp = new Date().getTime() + "_" + Math.floor(Math.random() * 1000000);
            output = File(Folder.temp.fsName + "/pardach_selected_" + stamp + ".svg");
            var options = new ExportOptionsSVG();
            options.embedRasterImages = true;
            options.coordinatePrecision = 6;
            tempDoc.exportFile(output, ExportType.SVG, options);
            if (!output.exists) throw Error("خروجی SVG موقت ساخته نشد");
            return respond({ok:true, path:output.fsName, name:data.name,
                count:data.count, width_mm:data.width, height_mm:data.height});
        } catch (e) {
            if (output && output.exists) { try { output.remove(); } catch (_) {} }
            return respond({ok:false, error:String(e.message || e)});
        } finally {
            if (tempDoc) { try { tempDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (_) {} }
            if (source) { try { source.activate(); } catch (_) {} }
        }
    }
    return {inspect: inspect, exportSelection: exportSelection};
}());

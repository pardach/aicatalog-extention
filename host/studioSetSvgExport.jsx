// ES3 host adapter. Never saves, edits or creates artwork in the source document.
var StudioSetSvgHost = (function () {
    function json(value) {
        if (value === null || typeof value === "undefined") return "null";
        if (typeof value === "string") return '"' + value.replace(/[\\"\x00-\x1f\u2028\u2029]/g, function (c) {
            if (c === '"' || c === "\\") return "\\" + c;
            return "\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4);
        }) + '"';
        if (typeof value === "number") return isFinite(value) ? String(value) : "null";
        if (typeof value === "boolean") return String(value);
        var out = [], i, k;
        if (value instanceof Array) {
            for (i = 0; i < value.length; i++) out.push(json(value[i]));
            return "[" + out.join(",") + "]";
        }
        for (k in value) if (value.hasOwnProperty(k)) out.push(json(k) + ":" + json(value[k]));
        return "{" + out.join(",") + "}";
    }
    function dimensions(item) {
        var b = item.visibleBounds, w = b[2] - b[0], h = b[1] - b[3];
        if (!(w > 0 && h > 0 && isFinite(w) && isFinite(h))) throw Error("Artwork has invalid visible bounds");
        return {bounds:b, width_pt:w, height_pt:h, width_cm:w*2.54/72, height_cm:h*2.54/72};
    }
    function nameOf(item, index) {
        try { return String(item.name || item.typename || ("design-" + index)); }
        catch (e) { return "design-" + index; }
    }
    function supported(item) {
        return /^(GroupItem|CompoundPathItem|PathItem|SymbolItem|TextFrame|RasterItem|PlacedItem|MeshItem|PluginItem)$/.test(item.typename);
    }
    function fileAt(folder, base, ext) { return new File(folder.fsName + "/" + base + ext); }
    function one(source, item, folder, index, symbolName) {
        var temp = null, prefix = "design-" + index, result = {index:index, name:symbolName || nameOf(item,index), success:false, warnings:[]};
        var svg = fileAt(folder,prefix,".svg"), png = fileAt(folder,prefix,".png");
        try {
            if (!supported(item)) throw Error("Unsupported selection: " + item.typename);
            var original = dimensions(item);
            temp = app.documents.add(source.documentColorSpace);
            var copy = item.duplicate(temp.layers[0], ElementPlacement.PLACEATBEGINNING);
            temp.activate();
            var measured = dimensions(copy);
            if (Math.abs(measured.width_pt-original.width_pt)>0.02 || Math.abs(measured.height_pt-original.height_pt)>0.02)
                throw Error("Artwork bounds changed during copy");
            temp.artboards[0].artboardRect = measured.bounds;
            var options = new ExportOptionsSVG();
            options.coordinatePrecision = 7;
            options.embedRasterImages = true;
            options.preserveEditability = false;
            options.includeFileInfo = false;
            options.includeUnusedStyles = false;
            options.includeVariablesAndDatasets = false;
            options.compressed = false;
            options.cssProperties = SVGCSSPropertyLocation.STYLEATTRIBUTES;
            options.fontType = SVGFontType.OUTLINEFONT;
            options.documentEncoding = SVGDocumentEncoding.UTF8;
            temp.exportFile(fileAt(folder,prefix,""), ExportType.SVG, options);
            if (!svg.exists || svg.length <= 0) throw Error("SVG export did not produce a file");
            result.width_pt = original.width_pt;
            result.height_pt = original.height_pt;
            result.width_cm = original.width_cm;
            result.height_cm = original.height_cm;
            result.svg = prefix + ".svg";
            try {
                var preview = new ExportOptionsPNG24();
                preview.transparency = true;
                preview.artBoardClipping = true;
                preview.antiAliasing = true;
                var scale = Math.min(100, 100*320/Math.max(original.width_pt,original.height_pt));
                preview.horizontalScale = scale;
                preview.verticalScale = scale;
                temp.exportFile(fileAt(folder,prefix,""), ExportType.PNG24, preview);
                if (!png.exists || png.length <= 0) throw Error("Preview missing");
                result.preview = prefix + ".png";
            } catch (previewError) { result.warnings.push("PNG preview unavailable: " + previewError.message); }
            result.success = true;
        } catch (e) {
            result.error = String(e.message || e);
            if (svg.exists) svg.remove();
            if (png.exists) png.remove();
        } finally {
            if (temp) {
                try { temp.close(SaveOptions.DONOTSAVECHANGES); }
                catch (closeError) { result.success = false; result.error = "Could not close temporary document"; }
            }
            try { source.activate(); }
            catch (activateError) { result.success = false; result.error = "Could not restore original active document"; }
        }
        return result;
    }
    function run(folderPath, mode, names) {
        if (!app.documents.length) return json({success:false,error:"No active Illustrator document"});
        var source = app.activeDocument, folder = new Folder(folderPath), items = [], results = [], i, j, item;
        if (!folder.exists || folder.getFiles().length !== 0) return json({success:false,error:"Expected a new empty output directory"});
        if (mode === "selection") {
            var selection = source.selection;
            if (!selection || typeof selection.length !== "number" || !selection.length) return json({success:false,error:"Select artwork first"});
            for (i=0;i<selection.length;i++) items.push({item:selection[i]});
        } else if (mode === "symbols") {
            if (!(names instanceof Array) || !names.length) return json({success:false,error:"Select symbol names"});
            // Only existing instances can be duplicated safely without mutating
            // the source. Unused symbol definitions are reported, not placed.
            for (i=0;i<names.length;i++) {
                item = null;
                for (j=0;j<source.symbolItems.length;j++) {
                    if (source.symbolItems[j].symbol.name === names[i]) { item=source.symbolItems[j]; break; }
                }
                items.push({item:item,symbolName:names[i]});
            }
        } else return json({success:false,error:"Unknown extraction mode"});
        if (items.length>100) return json({success:false,error:"Maximum 100 designs per batch"});
        for (i=0;i<items.length;i++) {
            if (!items[i].item) results.push({index:i+1,name:items[i].symbolName,success:false,error:"No placed symbol instance; place at intended size and select it"});
            else results.push(one(source,items[i].item,folder,i+1,items[i].symbolName));
        }
        return json({success:true,items:results});
    }
    return {run:run};
}());

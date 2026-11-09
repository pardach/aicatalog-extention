/* Pardach multi-design Illustrator exporter - ES3-compatible ExtendScript.
 * A family container may contain multiple grouped designs; nested objects
 * within each design group remain together. Source artwork is never modified.
 */
var PardachDirectUpload = (function () {
    function quoted(s) {
        return '"' + String(s == null ? '' : s).replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"').replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n').replace(/\t/g, '\\t') + '"';
    }
    function json(value) {
        var i, items = [], k;
        if (value === null || typeof value === 'undefined') return 'null';
        if (typeof value === 'string') return quoted(value);
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'number') return isFinite(value) ? String(value) : 'null';
        if (value instanceof Array) {
            for (i = 0; i < value.length; i++) items.push(json(value[i]));
            return '[' + items.join(',') + ']';
        }
        for (k in value) if (value.hasOwnProperty(k)) items.push(quoted(k) + ':' + json(value[k]));
        return '{' + items.join(',') + '}';
    }
    function wrap(fn) {
        try { return json(fn()); }
        catch (error) { return json({ok:false, error:String(error.message || error)}); }
    }
    function selectedRoots() {
        if (!app.documents.length) throw Error('سند Illustrator باز نیست');
        var doc = app.activeDocument, selected = doc.selection;
        if (!selected || selected.length < 1) throw Error('ابتدا گروه یا طرح را انتخاب کنید');
        var roots = [], i, item, ancestor, skip, safety;
        for (i = 0; i < selected.length; i++) {
            item = selected[i]; ancestor = item.parent; skip = false; safety = 0;
            while (ancestor && safety++ < 60) {
                for (var j = 0; j < selected.length; j++)
                    if (ancestor === selected[j]) { skip = true; break; }
                if (skip || ancestor.typename !== 'GroupItem') break;
                ancestor = ancestor.parent;
            }
            if (!skip) roots.push(item);
        }
        if (!roots.length) throw Error('آیتم قابل ارسال انتخاب نشده است');
        return {doc:doc, roots:roots};
    }
    function directGroupChildren(group) {
        var items = [], ungrouped = 0, children = group.pageItems;
        for (var j = 0; j < children.length; j++) {
            if (children[j].parent !== group) continue;
            if (children[j].typename === 'GroupItem') items.push(children[j]);
            else ungrouped++;
        }
        return {groups:items, ungrouped:ungrouped};
    }
    function boundsFor(items) {
        var left = Infinity, top = -Infinity, right = -Infinity, bottom = Infinity;
        for (var i = 0; i < items.length; i++) {
            var b = items[i].visibleBounds;
            if (!b || b.length !== 4) throw Error('نوع آیتم برای محاسبه اندازه پشتیبانی نشد');
            if (b[0] < left) left = b[0];
            if (b[1] > top) top = b[1];
            if (b[2] > right) right = b[2];
            if (b[3] < bottom) bottom = b[3];
        }
        if (!(right > left && top > bottom)) throw Error('ابعاد طرح صفر یا نامعتبر است');
        return [left,top,right,bottom];
    }
    function mm(v) { return Math.round(v * 25.4 / 72 * 1000) / 1000; }
    function describe(id, name, items, parentName, depth) {
        var b = boundsFor(items), selected = items[0], note = '';
        try { if (items.length === 1 && selected.note) note = String(selected.note); } catch (_) {}
        return {id:id, name:String(name || id), source_note:note,
            parent_name:String(parentName || ''), depth:depth, item_count:items.length,
            width_mm:mm(b[2] - b[0]), height_mm:mm(b[1] - b[3]),
            signature:[mm(b[2] - b[0]),mm(b[1] - b[3]),String(name || id)].join(':'),
            _items:items};
    }
    function collect(mode) {
        var source = selectedRoots(), roots = source.roots, items = [], parents = [];
        mode = String(mode || 'smart');
        if (['smart','each','children','one'].indexOf(mode) < 0) throw Error('حالت انتخاب نامعتبر است');
        if (mode === 'one') {
            items.push(describe('all', source.doc.name, roots, '', 0));
            return {source:source, mode:mode, items:items};
        }
        var autoSplit = mode === 'smart' && roots.length === 1 &&
            roots[0].typename === 'GroupItem';
        if (autoSplit) {
            var direct = directGroupChildren(roots[0]), parentName = String(roots[0].name || '');
            var explicitFamily = /^(?:family|fam|خانواده|set|ست)[\\s:_-]*[a-z0-9_-]+/i.test(parentName) ||
                /^(?:f)?[0-9]+$/i.test(parentName);
            var memberPatternCount = 0, sharedCode = '', allSameCode = true;
            for (var k = 0; k < direct.groups.length; k++) {
                var childName = String(direct.groups[k].name || '');
                var match = childName.match(/^([0-9]+)(?:r[0-9]*|g|k|b|d|t)$/i);
                if (match) {
                    memberPatternCount++;
                    if (sharedCode && sharedCode !== match[1]) allSameCode = false;
                    sharedCode = match[1];
                }
            }
            autoSplit = direct.groups.length >= 2 && direct.ungrouped === 0 &&
                (explicitFamily || (memberPatternCount === direct.groups.length && allSameCode));
        }
        var split = mode === 'children' || autoSplit;
        for (var i = 0; i < roots.length; i++) {
            var root = roots[i], name = String(root.name || 'طرح ' + (i + 1)), id = 's' + i;
            if (split && root.typename === 'GroupItem') {
                var children = directGroupChildren(root);
                if (children.ungrouped) {
                    throw Error('گروه «' + name + '» شامل اشیای بدون گروه در سطح خانواده است. آن‌ها را گروه‌بندی کنید یا حالت «هر گروه انتخابی» را برگزینید.');
                }
                if (!children.groups.length) {
                    items.push(describe(id, name, [root], '', 0));
                    continue;
                }
                for (var j = 0; j < children.groups.length; j++) {
                    var child = children.groups[j];
                    items.push(describe(id + '/g' + j,
                        String(child.name || 'طرح ' + (j + 1)), [child], name, 1));
                }
                parents.push(name);
            } else {
                items.push(describe(id, name, [root], '', 0));
            }
        }
        if (!items.length) throw Error('گروه قابل ارسال شناسایی نشد');
        if (items.length > 1000) throw Error('بیش از ۱۰۰۰ طرح انتخاب شده است؛ انتخاب را کوچک‌تر کنید');
        return {source:source, mode:mode, items:items, parents:parents};
    }
    function describePublic(entry) {
        return {id:entry.id, name:entry.name, source_note:entry.source_note,
            parent_name:entry.parent_name, depth:entry.depth, item_count:entry.item_count,
            width_mm:entry.width_mm, height_mm:entry.height_mm, signature:entry.signature};
    }
    function inspectBatch(mode) {
        return wrap(function () {
            var data = collect(mode), result = [];
            for (var i = 0; i < data.items.length; i++) result.push(describePublic(data.items[i]));
            return {ok:true, mode:data.mode, count:result.length,
                doc_name:data.source.doc.name, items:result};
        });
    }
    function exportSingle(entry, doc) {
        var tempDoc = null, output = null, source = doc;
        try {
            tempDoc = app.documents.add(DocumentColorSpace.RGB);
            var target = tempDoc.layers[0];
            for (var i = 0; i < entry._items.length; i++)
                entry._items[i].duplicate(target, ElementPlacement.PLACEATEND);
            var copies = [], pages = target.pageItems;
            for (var j = 0; j < pages.length; j++) {
                if (pages[j].parent === target) copies.push(pages[j]);
            }
            if (!copies.length) throw Error('آیتمی در سند موقت کپی نشد');
            tempDoc.artboards[0].artboardRect = boundsFor(copies);
            output = File(Folder.temp.fsName + '/pardach_batch_' +
                new Date().getTime() + '_' + Math.floor(Math.random() * 1000000000) + '.svg');
            var options = new ExportOptionsSVG();
            options.embedRasterImages = true;
            options.coordinatePrecision = 6;
            tempDoc.exportFile(output, ExportType.SVG, options);
            if (!output.exists) throw Error('فایل SVG ایجاد نشد');
            return {id:entry.id, ok:true, path:output.fsName, signature:entry.signature,
                width_mm:entry.width_mm, height_mm:entry.height_mm};
        } catch (error) {
            if (output && output.exists) try { output.remove(); } catch (_) {}
            return {id:entry.id, ok:false, error:String(error.message || error)};
        } finally {
            if (tempDoc) try { tempDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (_) {}
            if (source) try { source.activate(); } catch (_) {}
        }
    }
    function exportBatch(mode, ids) {
        return wrap(function () {
            var data = collect(mode), requested = String(ids || '').split('|'), results = [];
            if (!requested.length || requested.length > 12) throw Error('حداکثر ۱۲ طرح در هر نوبت خروجی‌گیری می‌شود');
            var byId = {}, requestedId, e;
            for (var i = 0; i < data.items.length; i++) byId[data.items[i].id] = data.items[i];
            for (var j = 0; j < requested.length; j++) {
                requestedId = requested[j];
                if (!/^(all|s[0-9]+(\/g[0-9]+)?)$/.test(requestedId))
                    throw Error('شناسه طرح نامعتبر است');
                e = byId[requestedId];
                if (!e) { results.push({id:requestedId, ok:false,
                    error:'انتخاب تغییر کرده است؛ دوباره بررسی کنید'}); continue; }
                results.push(exportSingle(e, data.source.doc));
            }
            return {ok:true, results:results, doc_name:data.source.doc.name};
        });
    }
    return {inspectBatch:inspectBatch, exportBatch:exportBatch};
}());

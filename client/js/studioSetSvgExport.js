/* CEP 9-compatible extraction bridge. SVG dimensions are explicit physical units. */
(function(root,factory) {
    if (typeof module === 'object' && module.exports) module.exports=factory(require);
    else root.StudioSetSvgExport=factory(root.cep_node && root.cep_node.require ? root.cep_node.require : (typeof require==='function' ? require : null));
}(this,function(load) {
    'use strict';
    var MAX_SVG=20*1024*1024, MAX_PREVIEW=2*1024*1024;
    function normalizeSvg(svg,w,h) {
        if (typeof svg!=='string' || !(w>0 && h>0 && isFinite(w) && isFinite(h))) throw Error('Invalid SVG dimensions');
        // Strip only the standard external SVG 1.1 declaration emitted by Illustrator.
        svg=svg.replace(/<!DOCTYPE\s+svg\s+PUBLIC\s+["']-\/\/W3C\/\/DTD SVG 1\.1\/\/EN["']\s+["']http:\/\/www\.w3\.org\/Graphics\/SVG\/1\.1\/DTD\/svg11\.dtd["']\s*>/i,'');
        var root=svg.match(/<svg\b[^>]*>/i);
        if (!root) throw Error('SVG root missing');
        var view=root[0].match(/\sviewBox\s*=\s*(["'])([^"']+)\1/i);
        if (!view) throw Error('SVG viewBox missing');
        var nums=view[2].trim().split(/[\s,]+/).map(Number);
        if (nums.length!==4 || !nums.every(isFinite) || nums[2]<=0 || nums[3]<=0 ||
            Math.abs((nums[2]/nums[3])/(w/h)-1)>0.002) throw Error('SVG aspect ratio mismatch');
        var tag=root[0].replace(/\s(?:width|height)\s*=\s*(["'])[^"']*\1/gi,'');
        tag=tag.replace(/^<svg\b/i,'<svg width="'+w.toFixed(8)+'cm" height="'+h.toFixed(8)+'cm"');
        return svg.slice(0,root.index)+tag+svg.slice(root.index+root[0].length);
    }
    function readBounded(fs,path,max) {
        var stat=fs.lstatSync(path);
        if (!stat.isFile() || stat.size<=0 || stat.size>max) throw Error('Invalid export file size or type');
        return fs.readFileSync(path);
    }
    function exportBatch(cs,mode,names) {
        if (!load) return Promise.reject(Error('CEP Node runtime required'));
        if (!cs || typeof cs.evalScript!=='function') return Promise.reject(Error('Illustrator bridge required'));
        if (mode!=='selection' && mode!=='symbols' && mode!=='family') return Promise.reject(Error('Invalid extraction mode'));
        names=names||[];
        if (!Array.isArray(names) || names.length>100 || !names.every(function(n){return typeof n==='string' && n.length<=256;})) return Promise.reject(Error('Invalid symbol names'));
        var fs=load('fs'), path=load('path'), os=load('os'), crypto=load('crypto');
        var folder=fs.mkdtempSync(path.join(os.tmpdir(),'studioset-svg-'));
        function cleanup() {
            try {
                fs.readdirSync(folder).forEach(function(name) {
                    var p=path.join(folder,name);
                    if (!fs.lstatSync(p).isDirectory()) fs.unlinkSync(p);
                });
                fs.rmdirSync(folder);
            } catch(e) { /* leftover temp files can be removed manually */ }
        }
        var script;
        try {
            var hostPath=path.join(cs.getSystemPath('extension'),'host','studioSetSvgExport.jsx');
            function literal(x) { return JSON.stringify(x).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029'); }
            script='$.evalFile('+literal(hostPath)+'); StudioSetSvgHost.run('+literal(folder)+','+literal(mode)+','+literal(names)+')';
        } catch(e) { cleanup(); return Promise.reject(e); }
        return new Promise(function(resolve,reject) {
            try {
                cs.evalScript(script,function(raw) {
                    try {
                        var result=JSON.parse(raw);
                        if (!result.success || !Array.isArray(result.items) || result.items.length>100) throw Error(result.error||'Invalid host response');
                        result.items.forEach(function(item,i) {
                            if (!item.success) return;
                            try {
                                var prefix='design-'+(i+1);
                                if (item.index!==i+1 || item.svg!==prefix+'.svg') throw Error('Unexpected SVG filename');
                                if (Math.abs(item.width_cm-item.width_pt*2.54/72)>1e-7 ||
                                    Math.abs(item.height_cm-item.height_pt*2.54/72)>1e-7) throw Error('Invalid unit conversion');
                                var svg=normalizeSvg(readBounded(fs,path.join(folder,item.svg),MAX_SVG).toString('utf8'),item.width_cm,item.height_cm);
                                var bytes=new Buffer(svg,'utf8');
                                if (bytes.length>MAX_SVG) throw Error('SVG exceeds size limit');
                                item.svg_base64=bytes.toString('base64');
                                item.file_hash=crypto.createHash('sha256').update(bytes).digest('hex');
                                item.mime_type='image/svg+xml';
                                if (/<(?:[\w.-]+:)?image\b/i.test(svg)) item.warnings.push('SVG contains raster image content; review before upload');
                                if (item.preview) {
                                    try {
                                        if (item.preview!==prefix+'.png') throw Error('Unexpected preview filename');
                                        item.preview_base64=readBounded(fs,path.join(folder,item.preview),MAX_PREVIEW).toString('base64');
                                    } catch(e) { item.warnings.push('Preview unavailable'); }
                                }
                            } catch(e) { item.success=false; item.error=e.message; delete item.svg_base64; delete item.file_hash; }
                            delete item.svg; delete item.preview;
                        });
                        resolve(result);
                    } catch(e) { reject(e); }
                    finally { cleanup(); }
                });
            } catch(e) { cleanup(); reject(e); }
        });
    }
    return {normalizeSvg:normalizeSvg,exportBatch:exportBatch};
}));

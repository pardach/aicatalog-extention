// ES3 host: open verified SVG as editable artwork; rollback new group on any failure.
var StudioSetArtworkImportHost=(function(){
    function quote(v){return '"'+String(v).replace(/[\\\"\x00-\x1f\u2028\u2029]/g,function(c){return "\\u"+("0000"+c.charCodeAt(0).toString(16)).slice(-4);})+'"';}
    function bounds(item){var b=item.visibleBounds;return {left:b[0],top:b[1],w:b[2]-b[0],h:b[1]-b[3]};}
    function run(files){
        var target=null,temporary=null,root=null,originalSelection=null,success=false;
        try{
            if(!app.documents.length)throw Error("Open a destination document first");
            target=app.activeDocument;
            if(!files||!files.length||files.length>40)throw Error("Invalid import batch");
            originalSelection=target.selection;
            var art=target.artboards[target.artboards.getActiveArtboardIndex()].artboardRect;
            var layer=target.activeLayer;
            if(layer.locked||!layer.visible)throw Error("Destination layer is locked or hidden");
            root=layer.groupItems.add();root.name="Studio Set Catalog";
            var x=art[0]+12,y=art[1]-12,rowHeight=0;
            for(var i=0;i<files.length;i++){
                var entry=files[i],file=new File(entry.path);
                if(!file.exists)throw Error("Local artwork unavailable");
                temporary=app.open(file);
                var member=root.groupItems.add();member.name=entry.name;
                var copied=0;
                // Duplicate direct layer items; never flatten nested vector groups.
                function copyLayer(sourceLayer){
                    for(var j=sourceLayer.pageItems.length-1;j>=0;j--){
                        var item=sourceLayer.pageItems[j];
                        if(item.parent!==sourceLayer)continue;
                        item.duplicate(member,ElementPlacement.PLACEATBEGINNING);copied++;
                    }
                    for(var k=sourceLayer.layers.length-1;k>=0;k--)copyLayer(sourceLayer.layers[k]);
                }
                for(var l=temporary.layers.length-1;l>=0;l--)copyLayer(temporary.layers[l]);
                temporary.close(SaveOptions.DONOTSAVECHANGES);temporary=null;target.activate();
                if(!copied)throw Error("SVG imported no editable artwork");
                var box=bounds(member);
                var tolerance=0.15;
                if(Math.abs(box.w-entry.width_pt)>tolerance||Math.abs(box.h-entry.height_pt)>tolerance)
                    throw Error("Imported bounds differ from catalog dimensions: "+entry.name);
                if(x+box.w>art[2]-12&&x>art[0]+12){x=art[0]+12;y-=rowHeight+12;rowHeight=0;}
                if(x+box.w>art[2]||y-box.h<art[3])throw Error("Artwork does not fit active artboard at original size");
                member.translate(x-box.left,y-box.top);
                x+=box.w+12;rowHeight=Math.max(rowHeight,box.h);
            }
            target.activate();target.selection=null;root.selected=true;success=true;
            return '{"success":true,"count":'+files.length+'}';
        }catch(e){return '{"success":false,"error":'+quote(e.message||e)+'}';}
        finally{
            if(temporary)try{temporary.close(SaveOptions.DONOTSAVECHANGES);}catch(ignored){}
            if(target)try{target.activate();}catch(ignored2){}
            if(!success&&root)try{root.remove();}catch(ignored3){}
            if(!success&&target)try{target.selection=originalSelection;}catch(ignored4){}
        }
    }
    return {run:run};
}());

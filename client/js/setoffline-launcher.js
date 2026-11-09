/* Lightweight launcher linking the original Vector Catalog UI to the
 * independent direct uploader CEP extension. Does not touch SQLite, Symbols
 * or the original catalog implementation.
 */
(function(){
    'use strict';
    function connect() {
        var button=document.getElementById('sendToSetofflineBtn');
        if(!button)return;
        button.addEventListener('click',function(){
            if(typeof CSInterface==='undefined'){
                button.title='این گزینه فقط داخل Adobe Illustrator قابل اجراست';
                return;
            }
            try {
                var cep=new CSInterface();
                cep.requestOpenExtension('ir.pardach.directuploader.panel','');
            } catch(error) {
                var status=document.getElementById('status');
                if(status) status.textContent='افزونه بارگذاری Setoffline نصب نشده است: '+String(error.message||error);
            }
        });
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',connect);
    else connect();
}());

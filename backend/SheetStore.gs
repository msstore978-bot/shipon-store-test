var SheetStore = {
  ensureSheet_: function(name, headers) {
    var ss=getDb_();
    var sh=ss.getSheetByName(name);
    if (!sh) sh=ss.insertSheet(name);
    if (sh.getLastRow()===0) sh.getRange(1,1,1,headers.length).setValues([headers]);
    return sh;
  },

  records_: function(sh) {
    var values=sh.getDataRange().getValues();
    if (!values.length) return [];
    var headers=values[0].map(String);
    return values.slice(1).filter(function(row){
      return row.some(function(v){return v!=="" && v!==null;});
    }).map(function(row){
      var o={};
      headers.forEach(function(h,i){o[h]=row[i];});
      return o;
    });
  },

  append_: function(sh, obj) {
    var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    sh.appendRow(headers.map(function(h){return obj[h] == null ? "" : obj[h];}));
  },

  findBy_: function(sh, field, value) {
    var rows=this.records_(sh);
    for(var i=0;i<rows.length;i++) if(String(rows[i][field])===String(value)) return rows[i];
    return null;
  },

  rowIndexBy_: function(sh, field, value) {
    var values=sh.getDataRange().getValues();
    if(values.length<2) return -1;
    var headers=values[0];
    var idx=headers.indexOf(field);
    if(idx<0) return -1;
    for(var r=1;r<values.length;r++) if(String(values[r][idx])===String(value)) return r+1;
    return -1;
  },

  updateBy_: function(sh, field, value, patch) {
    var row=this.rowIndexBy_(sh,field,value);
    if(row<2) throw new Error("Record not found: "+value);
    var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    var current=sh.getRange(row,1,1,headers.length).getValues()[0];
    headers.forEach(function(h,i){if(Object.prototype.hasOwnProperty.call(patch,h)) current[i]=patch[h];});
    sh.getRange(row,1,1,headers.length).setValues([current]);
  },

  deleteBy_: function(sh, field, value) {
    var row=this.rowIndexBy_(sh,field,value);
    if(row<2) throw new Error("Record not found: "+value);
    sh.deleteRow(row);
  }
};

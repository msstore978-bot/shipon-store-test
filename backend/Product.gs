/** PHASE 8 - Product master + authoritative stock helpers. */
var Products = {
  headers:function(){return ['Product_ID','Product_Code','Name','SKU','Category','Unit','Purchase_Price','Selling_Price','Opening_Stock','Current_Stock','Low_Stock_Level','Barcode','Barcode_Format','Image_ID','Active','CreatedAt','UpdatedAt','Version'];},
  sheet:function(){return SheetStore.ensureSheet_('Products',this.headers());},
  list:function(user,payload){
    requireRole_(user,['ADMIN','STAFF']);
    var rows=SheetStore.records_(this.sheet()), q=clean_(payload&&payload.query).toLowerCase();
    if(q) rows=rows.filter(function(r){return [r.Name,r.Product_ID,r.Product_Code,r.SKU,r.Barcode,r.Category].some(function(v){return String(v||'').toLowerCase().indexOf(q)>=0;});});
    return ok_(rows.map(productRowToObj_));
  },
  get:function(user,payload){requireRole_(user,['ADMIN','STAFF']);var r=SheetStore.findBy_(this.sheet(),'Product_ID',clean_(payload&&payload.id));if(!r)return fail_('PRODUCT_NOT_FOUND','Product not found.');return ok_(productRowToObj_(r));},
  create:function(user,payload){
    requireRole_(user,['ADMIN']); var p=normalizeProductPayload_(payload,true), sh=this.sheet();
    if(SheetStore.findBy_(sh,'Product_ID',p.id)) return ok_({productId:p.id,duplicate:true});
    if(p.sku && SheetStore.records_(sh).some(function(r){return String(r.SKU||'').toLowerCase()===p.sku.toLowerCase();})) return fail_('DUPLICATE_SKU','SKU already exists.');
    SheetStore.append_(sh,p);
    if(p.openingStock!==0) StockLedger.appendAtomic_(user,p.id,'Opening Stock',p.openingStock,0,p.openingStock,'OPENING',p.openingStock? p.purchasePrice:0,new Date(p.date||new Date()).toISOString().slice(0,10));
    Audit.write_(user,'PRODUCT_CREATE','Products',p.id,p); return ok_(productObjFromPayload_(p));
  },
  update:function(user,payload){
    requireRole_(user,['ADMIN']); var id=clean_(payload&&payload.id||payload&&payload.productId), sh=this.sheet(), old=SheetStore.findBy_(sh,'Product_ID',id);if(!old)return fail_('PRODUCT_NOT_FOUND','Product not found.');
    var patch={}; if(payload.name!=null)patch.Name=clean_(payload.name); if(payload.sku!=null)patch.SKU=clean_(payload.sku); if(payload.category!=null)patch.Category=clean_(payload.category); if(payload.unit!=null)patch.Unit=clean_(payload.unit); if(payload.purchasePrice!=null)patch.Purchase_Price=Number(payload.purchasePrice||0); if(payload.sellingPrice!=null)patch.Selling_Price=Number(payload.sellingPrice||0); if(payload.reorderLevel!=null)patch.Low_Stock_Level=Number(payload.reorderLevel||0); if(payload.barcode!=null)patch.Barcode=clean_(payload.barcode); if(payload.imageId!=null)patch.Image_ID=clean_(payload.imageId); if(payload.active!=null)patch.Active=!!payload.active;
    patch.UpdatedAt=new Date().toISOString(); patch.Version=Number(old.Version||1)+1; SheetStore.updateBy_(sh,'Product_ID',id,patch); Audit.write_(user,'PRODUCT_UPDATE','Products',id,payload); return ok_(productRowToObj_(SheetStore.findBy_(sh,'Product_ID',id)));
  }
};
function normalizeProductPayload_(p,isCreate){
  p=p||{}; var id=clean_(p.productId||p.id)||Utilities.getUuid(); var code=clean_(p.productCode||p.productId)||id.slice(0,8).toUpperCase(); var barcode=clean_(p.barcode)||('SHIPON-'+code.toUpperCase()); var now=new Date().toISOString();
  return {Product_ID:id,Product_Code:code,Name:clean_(p.name),SKU:clean_(p.sku),Category:clean_(p.category),Unit:clean_(p.unit||'pcs'),Purchase_Price:Number(p.purchasePrice||0),Selling_Price:Number(p.sellingPrice||0),Opening_Stock:Number(p.openingStock||0),Current_Stock:Number(p.currentStock!=null?p.currentStock:(p.openingStock||0)),Low_Stock_Level:Number(p.reorderLevel!=null?p.reorderLevel:(p.lowStockLevel||0)),Barcode:barcode,Barcode_Format:'CODE128',Image_ID:clean_(p.imageId||p.imageDataId),Active:p.active!==false,CreatedAt:p.createdAt||now,UpdatedAt:now,Version:Number(p.version||1),date:p.date};
}
function productRowToObj_(r){return {id:String(r.Product_ID||''),productId:String(r.Product_ID||''),productCode:String(r.Product_Code||''),name:String(r.Name||''),sku:String(r.SKU||''),category:String(r.Category||''),unit:String(r.Unit||'pcs'),purchasePrice:Number(r.Purchase_Price||0),sellingPrice:Number(r.Selling_Price||0),openingStock:Number(r.Opening_Stock||0),currentStock:Number(r.Current_Stock||0),reorderLevel:Number(r.Low_Stock_Level||0),barcode:String(r.Barcode||''),barcodeFormat:String(r.Barcode_Format||'CODE128'),imageId:String(r.Image_ID||''),active:String(r.Active).toLowerCase()!=='false',createdAt:String(r.CreatedAt||''),updatedAt:String(r.UpdatedAt||''),version:Number(r.Version||1)};}
function productObjFromPayload_(p){return {id:p.Product_ID,productId:p.Product_ID,productCode:p.Product_Code,name:p.Name,sku:p.SKU,category:p.Category,unit:p.Unit,purchasePrice:p.Purchase_Price,sellingPrice:p.Selling_Price,openingStock:p.Opening_Stock,currentStock:p.Current_Stock,reorderLevel:p.Low_Stock_Level,barcode:p.Barcode,barcodeFormat:p.Barcode_Format,imageId:p.Image_ID,active:p.Active,createdAt:p.CreatedAt,updatedAt:p.UpdatedAt,version:p.Version};}

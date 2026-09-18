/** PHASE 8 - authoritative purchase transaction. */
var Purchases = {
 headers:function(){return ['Purchase_ID','Date','Supplier_ID','Invoice_No','Subtotal','Discount','Total','Paid_Amount','Due_Amount','Payment_Method','Note','CreatedAt','UpdatedAt','User_ID','Version'];},
 itemHeaders:function(){return ['Purchase_Item_ID','Purchase_ID','Product_ID','Quantity','Unit_Cost','Line_Total','CreatedAt'];},
 sheet:function(){return SheetStore.ensureSheet_('Purchases',this.headers());},
 itemSheet:function(){return SheetStore.ensureSheet_('Purchase_Items',this.itemHeaders());},
 create:function(user,payload){
   requireRole_(user,['ADMIN','STAFF']); payload=payload||{}; var id=clean_(payload.id||payload.purchaseId)||Utilities.getUuid(), sh=this.sheet(); if(SheetStore.findBy_(sh,'Purchase_ID',id))return ok_({purchaseId:id,duplicate:true});
   var items=Array.isArray(payload.items)?payload.items:[]; if(!items.length)return fail_('EMPTY_PURCHASE','Purchase items required.'); var psh=Products.sheet(); var subtotal=0; items.forEach(function(it){var p=SheetStore.findBy_(psh,'Product_ID',clean_(it.productId));if(!p)throw new Error('Product not found: '+it.productId);var q=Number(it.qty||0),c=Number(it.purchasePrice!=null?it.purchasePrice:p.Purchase_Price||0);if(q<=0)throw new Error('Invalid purchase quantity.');subtotal+=q*c;});
   var discount=Number(payload.discount||0), total=Math.max(0,Number(payload.total!=null?payload.total:subtotal-discount)), paid=Math.min(Math.max(0,Number(payload.paidAmount||0)),total), due=Math.max(0,total-paid), now=new Date().toISOString();
   SheetStore.append_(sh,{Purchase_ID:id,Date:payload.date||now.slice(0,10),Supplier_ID:clean_(payload.supplierId),Invoice_No:clean_(payload.invoice||payload.invoiceNo)||('PUR-'+Date.now()),Subtotal:subtotal,Discount:discount,Total:total,Paid_Amount:paid,Due_Amount:due,Payment_Method:clean_(payload.paymentMethod)||'Cash',Note:clean_(payload.note),CreatedAt:now,UpdatedAt:now,User_ID:user.userId||'',Version:1});
   var ish=this.itemSheet(); items.forEach(function(it){var pid=clean_(it.productId), p=SheetStore.findBy_(psh,'Product_ID',pid),q=Number(it.qty||0),c=Number(it.purchasePrice!=null?it.purchasePrice:p.Purchase_Price||0),before=Number(p.Current_Stock||0),after=before+q;SheetStore.append_(ish,{Purchase_Item_ID:Utilities.getUuid(),Purchase_ID:id,Product_ID:pid,Quantity:q,Unit_Cost:c,Line_Total:q*c,CreatedAt:now});SheetStore.updateBy_(psh,'Product_ID',pid,{Current_Stock:after,Purchase_Price:c,UpdatedAt:now,Version:Number(p.Version||1)+1});StockLedger.appendAtomic_(user,pid,'Purchase',q,before,after,clean_(payload.invoice||payload.invoiceNo)||id,c,payload.date||now.slice(0,10));});
   if(payload.supplierId && due>0) Suppliers.addPurchaseDue_(user,clean_(payload.supplierId),due,id,payload.date||now.slice(0,10)); Audit.write_(user,'PURCHASE_CREATE','Purchases',id,payload); return ok_({purchaseId:id,total:total,paidAmount:paid,dueAmount:due});
 }
};

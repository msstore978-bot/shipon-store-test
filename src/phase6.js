
import {getAll,get,put,uuid,nowIso} from './db.js';
import {enqueue} from './sync.js';
import {requireRole} from './roles.js';
const n=v=>Number(v||0);
export async function createSupplier(x){
  await requireRole(['ADMIN','STAFF']);
 const now=nowIso(),s={id:uuid(),name:String(x.name||'').trim(),shop:x.shop||'',mobile:x.mobile||'',whatsapp:x.whatsapp||'',address:x.address||'',openingDue:n(x.openingDue),currentDue:n(x.openingDue),note:x.note||'',createdAt:now,updatedAt:now,version:1};
 await put('suppliers',s);await enqueue('supplier','create',s);return s;
}
export async function supplierPayment(x){
  await requireRole(['ADMIN','STAFF']);
 const s=await get('suppliers',x.supplierId);if(!s)throw Error('Supplier পাওয়া যায়নি');
 const now=nowIso(),cur=n(s.currentDue),disc=Math.min(n(x.discount),cur),paid=Math.min(n(x.paidAmount),Math.max(0,cur-disc)),rem=Math.max(0,cur-disc-paid);
 s.currentDue=rem;s.updatedAt=now;s.version=(s.version||1)+1;await put('suppliers',s);
 const p={id:uuid(),supplierId:s.id,date:x.date||now.slice(0,10),currentDue:cur,discount:disc,paidAmount:paid,remainingDue:rem,method:x.method||'Cash',note:x.note||'',createdAt:now,updatedAt:now};
 await put('payments',p); const tx={id:uuid(),supplierId:s.id,type:'Payment',date:p.date,previousDue:cur,discount:disc,paidAmount:paid,remainingDue:rem,method:p.method,note:p.note,createdAt:now,updatedAt:now}; await put('supplier_transactions',tx); await enqueue('supplier_payment','create',p);return p;
}
export async function findProduct(q){
 q=String(q||'').trim().toLowerCase();const ps=await getAll('products');
 return ps.filter(p=>[p.name,p.productId,p.sku,p.barcode].some(v=>String(v||'').toLowerCase()===q||String(v||'').toLowerCase().includes(q))).slice(0,20);
}
export async function createSaleCart(x){
  await requireRole(['ADMIN','STAFF']);
 if(!x.items?.length)throw Error('Cart খালি');
 const now=nowIso(),pm=new Map((await getAll('products')).map(p=>[p.id,p]));let sub=0,cost=0;
 for(const i of x.items){const p=pm.get(i.productId);if(!p)throw Error('Product পাওয়া যায়নি');if(n(p.currentStock)<n(i.qty))throw Error(`${p.name} এর পর্যাপ্ত Stock নেই`);sub+=n(i.qty)*(n(i.sellingPrice)||n(p.sellingPrice));cost+=n(i.qty)*n(p.purchasePrice)}
 const net=Math.max(0,sub-n(x.discount)-n(x.commission)),c=x.customerId?await get('customers',x.customerId):null,prev=n(c?.currentDue),total=prev+net,paid=Math.min(n(x.paidAmount),total),newDue=Math.max(0,total-paid);
 const sale={id:uuid(),customerId:x.customerId||'',invoice:x.invoice||'INV-'+Date.now(),date:x.date||now.slice(0,10),items:x.items.map(i=>({...i,qty:n(i.qty),sellingPrice:n(i.sellingPrice)||n(pm.get(i.productId).sellingPrice),purchasePrice:n(i.purchasePrice)||n(pm.get(i.productId).purchasePrice)})),subtotal:sub,discount:n(x.discount),commission:n(x.commission),totalBill:net,costOfGoods:cost,previousDue:prev,totalPayable:total,paidAmount:paid,newDue,paymentMethod:x.paymentMethod||'Cash',note:x.note||'',createdAt:now,updatedAt:now,version:1};
 await put('sales',sale);await enqueue('sale','create',sale);
 for(const i of sale.items){const p=pm.get(i.productId),before=n(p.currentStock),after=before-i.qty;p.currentStock=after;p.updatedAt=now;p.version=(p.version||1)+1;await put('products',p);await put('inventory',{id:p.id,productId:p.id,stock:after,updatedAt:now});const l={id:uuid(),productId:p.id,type:'Sale',qty:-i.qty,stockBefore:before,stockAfter:after,reference:sale.invoice,date:sale.date,createdAt:now,updatedAt:now};await put('stock_ledger',l);await enqueue('product','update',p);await enqueue('stock_ledger','create',l)}
 if(c){c.currentDue=newDue;c.updatedAt=now;c.version=(c.version||1)+1;await put('customers',c);const t={id:uuid(),customerId:c.id,type:'Sale',date:sale.date,bill:net,payment:paid,remainingDue:newDue,reference:sale.invoice,method:sale.paymentMethod,createdAt:now,updatedAt:now};await put('customer_transactions',t);await enqueue('customer_transaction','create',t)}
 return sale;
}


import {getAll,get,put,uuid,nowIso} from './db.js';
import {enqueue} from './sync.js';
import {requireRole} from './roles.js';

export const n = v => Number(v||0);

export async function saveProduct(input){
  await requireRole(['ADMIN']);
  const now=nowIso(), id=input.id||uuid();
  const p={
    id, productId:input.productId||id.slice(0,8).toUpperCase(),
    name:String(input.name||'').trim(), sku:String(input.sku||'').trim(),
    category:String(input.category||'').trim(), unit:String(input.unit||'pcs'),
    purchasePrice:n(input.purchasePrice), sellingPrice:n(input.sellingPrice),
    openingStock:n(input.openingStock), currentStock:n(input.currentStock ?? input.openingStock),
    reorderLevel:n(input.reorderLevel), barcode:input.barcode||('SHIPON-'+(input.productId||id.slice(0,8)).toUpperCase()),
    barcodeFormat:'CODE128', imageData:input.imageData||'', active:true,
    createdAt:input.createdAt||now, updatedAt:now, version:(input.version||0)+1,
    deviceId:localStorage.getItem('shipon_device_id')||''
  };
  await put('products',p);
  await enqueue('product',input.id?'update':'create',p);
  if(p.openingStock){
    const ledger={id:uuid(),productId:p.id,type:'Opening Stock',qty:p.openingStock,
      stockBefore:0,stockAfter:p.openingStock,reference:'OPENING',date:now.slice(0,10),createdAt:now,updatedAt:now};
    await put('stock_ledger',ledger); // Cloud Phase 8 generates authoritative ledger entry.
  }
  return p;
}

export async function createPurchase(input){
  await requireRole(['ADMIN','STAFF']);
  const now=nowIso(), id=uuid();
  const purchase={id,invoice:input.invoice||'PUR-'+Date.now(),supplierId:input.supplierId||'',
    date:input.date||now.slice(0,10),items:input.items||[],subtotal:n(input.subtotal),
    discount:n(input.discount),total:n(input.total),paidAmount:n(input.paidAmount),
    dueAmount:Math.max(0,n(input.total)-n(input.paidAmount)),paymentMethod:input.paymentMethod||'Cash',
    note:input.note||'',createdAt:now,updatedAt:now,version:1};
  await put('purchases',purchase); await enqueue('purchase','create',purchase);
  for(const item of purchase.items){
    const p=await get('products',item.productId); if(!p) continue;
    const qty=n(item.qty), before=n(p.currentStock), after=before+qty;
    p.currentStock=after; p.purchasePrice=n(item.purchasePrice)||p.purchasePrice;
    p.updatedAt=now;p.version=(p.version||1)+1;
    await put('products',p); // Cloud Phase 8 applies purchase stock atomically; do not enqueue child stock mutation.
    const ledger={id:uuid(),productId:p.id,type:'Purchase',qty,stockBefore:before,stockAfter:after,
      reference:purchase.invoice,date:purchase.date,unitCost:n(item.purchasePrice),createdAt:now,updatedAt:now};
    await put('stock_ledger',ledger); // Cloud Phase 8 generates authoritative ledger entry.
    await put('inventory',{id:p.id,productId:p.id,stock:after,updatedAt:now});
  }
  return purchase;
}

export async function adjustStock(productId,qty,type='Adjustment',reference=''){
  await requireRole(['ADMIN']);
  const p=await get('products',productId); if(!p) throw new Error('Product পাওয়া যায়নি');
  const before=n(p.currentStock), after=before+n(qty);
  if(after<0) throw new Error('Stock শূন্যের নিচে যেতে পারবে না');
  const now=nowIso(); p.currentStock=after;p.updatedAt=now;p.version=(p.version||1)+1;
  await put('products',p); await put('inventory',{id:p.id,productId:p.id,stock:after,updatedAt:now});
  const l={id:uuid(),productId,type,qty:n(qty),stockBefore:before,stockAfter:after,reference,
    date:now.slice(0,10),createdAt:now,updatedAt:now};
  await put('stock_ledger',l); await enqueue('product','update',p); await enqueue('stock_ledger','create',l);
  return {product:p,ledger:l};
}

export async function getInventory(){
  const ps=await getAll('products');
  return ps.map(p=>({...p,lowStock:n(p.currentStock)<=n(p.reorderLevel)}));
}

export async function getProfitSummary(){
  const sales=await getAll('sales'), expenses=await getAll('expenses'), purchases=await getAll('purchases');
  const products=await getAll('products'), byId=new Map(products.map(p=>[p.id,p]));
  const today=new Date().toISOString().slice(0,10), month=today.slice(0,7), year=today.slice(0,4);
  const calcProfit=s=> {
    // Phase 4 sales can be bill-only. When item details exist, calculate item-level gross profit.
    let gross=0;
    if(Array.isArray(s.items)&&s.items.length){
      gross=s.items.reduce((sum,it)=>{
        const p=byId.get(it.productId); return sum+n(it.qty)*(n(it.sellingPrice)||n(it.price))-n(it.qty)*(n(it.purchasePrice)||n(p?.purchasePrice));
      },0);
    } else gross=n(s.totalBill)-n(s.costOfGoods);
    return gross-n(s.discount)-n(s.commission);
  };
  const range=(kind)=>{
    const match=d=>kind==='day'?d===today:kind==='month'?d.startsWith(month):d.startsWith(year);
    const revenue=sales.filter(s=>match(String(s.date||s.createdAt).slice(0,10))).reduce((a,s)=>a+n(s.totalBill),0);
    const gross=sales.filter(s=>match(String(s.date||s.createdAt).slice(0,10))).reduce((a,s)=>a+calcProfit(s),0);
    const exp=expenses.filter(e=>match(String(e.date||e.createdAt).slice(0,10))).reduce((a,e)=>a+n(e.amount),0);
    const pur=purchases.filter(p=>match(String(p.date||p.createdAt).slice(0,10))).reduce((a,p)=>a+n(p.total),0);
    return {revenue,grossProfit:gross,expense:exp,purchase:pur,netProfit:gross-exp};
  };
  return {today:range('day'),month:range('month'),year:range('year')};
}

export async function saveExpense(input){
  await requireRole(['ADMIN']);
  const now=nowIso(), e={id:uuid(),category:input.category||'General',description:input.description||'',
    amount:n(input.amount),date:input.date||now.slice(0,10),paymentMethod:input.paymentMethod||'Cash',
    note:input.note||'',createdAt:now,updatedAt:now,version:1};
  await put('expenses',e); await enqueue('expense','create',e); return e;
}


import {put,get,getAll,remove,uuid,nowIso,setMeta,getMeta} from './db.js';
import {login,setToken,getToken,clearToken,getBackendUrl,setBackendUrl,api} from './api.js';
import {enqueue,syncNow,pendingQueue,startAutoSync} from './sync.js';

import {saveProduct,createPurchase,adjustStock,getInventory,getProfitSummary,saveExpense} from './phase5.js';
import {code128Svg} from './barcode.js';
import {createSaleCart,createSupplier,supplierPayment,findProduct} from './phase6.js';
import {scanBarcode} from './scanner.js';
import {initResponsiveLayout} from './uiResponsive.js';
const $ = id => document.getElementById(id);
const money = n => `৳${Number(n||0).toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let state={customers:[], selected:null, search:'', toastTimer:null};

function toast(msg,type='ok'){
  const el=$('toast'); el.textContent=msg; el.className=`toast ${type} show`;
  clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
}
function online(){ return navigator.onLine; }
function setNet(){
  const el=$('netStatus');
  el.textContent=online()?'● Online':'● Offline';
  el.dataset.mode=online()?'online':'offline';
}
async function refreshCustomers(){
  state.customers=await getAll('customers');
  state.customers.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'bn'));
  renderCustomers();
  await refreshStats();
}
function filtered(){
  const q=state.search.trim().toLowerCase();
  return !q?state.customers:state.customers.filter(c =>
    [c.name,c.shop,c.mobile,c.whatsapp].some(v=>String(v||'').toLowerCase().includes(q)));
}
function renderCustomers(){
  $('customerList').innerHTML=filtered().map(c=>`
    <button class="customer-row" data-id="${esc(c.id)}">
      <div class="avatar">${c.imageData?`<img src="${c.imageData}" alt="">`:esc((c.name||'?').slice(0,1))}</div>
      <div class="grow"><b>${esc(c.name)}</b><small>${esc(c.shop||'')}${c.mobile?' • '+esc(c.mobile):''}</small></div>
      <div class="due ${Number(c.currentDue||0)>0?'bad':''}">${money(c.currentDue)}</div>
    </button>`).join('') || `<div class="empty">কোনো কাস্টমার পাওয়া যায়নি</div>`;
  document.querySelectorAll('.customer-row').forEach(b=>b.onclick=()=>openCustomer(b.dataset.id));
}
async function refreshStats(){
  const cs=state.customers;
  $('statCustomers').textContent=cs.length;
  $('statDue').textContent=money(cs.reduce((s,c)=>s+Number(c.currentDue||0),0));
  const sales=await getAll('sales');
  const today=new Date().toISOString().slice(0,10);
  $('statSales').textContent=money(sales.filter(s=>String(s.date||s.createdAt).slice(0,10)===today)
    .reduce((s,x)=>s+Number(x.totalBill||0),0));
}
async function openCustomer(id){
  state.selected=await get('customers',id);
  if(!state.selected)return;
  const c=state.selected;
  $('customerModalTitle').textContent=c.name||'কাস্টমার';
  $('customerModal').classList.add('show');
  $('customerDetail').innerHTML=`
    <div class="profile-head">
      <div class="big-avatar">${c.imageData?`<img src="${c.imageData}">`:esc((c.name||'?').slice(0,1))}</div>
      <div><h2>${esc(c.name)}</h2><div>${esc(c.shop||'')}</div><div>${esc(c.mobile||'')}</div></div>
      <div class="profile-due">${money(c.currentDue)}</div>
    </div>
    <div class="detail-grid">
      <div><span>WhatsApp</span><b>${esc(c.whatsapp||'')}</b></div>
      <div><span>ঠিকানা</span><b>${esc(c.address||'')}</b></div>
      <div><span>NID</span><b>${esc(c.nid||'')}</b></div>
      <div><span>নোট</span><b>${esc(c.note||'')}</b></div>
    </div>
    <div class="section-title">লেনদেন</div>
    <div id="txList">লোড হচ্ছে...</div>`;
  const tx=await getAll('customer_transactions');
  const rows=tx.filter(x=>x.customerId===id).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
  $('txList').innerHTML=rows.map(x=>`
    <div class="tx"><div><b>${esc(x.type||'লেনদেন')}</b><small>${esc(x.date||'')} • ${esc(x.reference||'')}</small></div>
    <div>${x.bill?`বিল ${money(x.bill)}`:''} ${x.payment?`পরিশোধ ${money(x.payment)}`:''}<br><small>বাকি ${money(x.remainingDue)}</small></div></div>`
  ).join('')||'<div class="empty">কোনো লেনদেন নেই</div>';
}
function closeModal(id){$(id).classList.remove('show')}

async function addCustomer(form){
  const fd=new FormData(form), imageFile=fd.get('image');
  let imageData='';
  if(imageFile && imageFile.size){
    imageData=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(imageFile)});
  }
  const id=uuid(), now=nowIso();
  const c={id,name:fd.get('name').trim(),shop:fd.get('shop').trim(),mobile:fd.get('mobile').trim(),
    whatsapp:fd.get('whatsapp').trim(),address:fd.get('address').trim(),nid:fd.get('nid').trim(),
    note:fd.get('note').trim(),openingDue:Number(fd.get('openingDue')||0),currentDue:Number(fd.get('openingDue')||0),
    imageData,createdAt:now,updatedAt:now,version:1,deviceId:deviceId()};
  await put('customers',c);
  if(c.openingDue>0){
    const tx={id:uuid(),customerId:id,type:'Opening Due',date:fd.get('entryDate')||now.slice(0,10),
      bill:c.openingDue,payment:0,remainingDue:c.openingDue,reference:'OPENING-DUE',createdAt:now,updatedAt:now};
    await put('customer_transactions',tx);
    await enqueue('customer_transaction','create',tx);
    const due={id:uuid(),customerId:id,amount:c.openingDue,date:tx.date,reference:'OPENING-DUE',createdAt:now,updatedAt:now};
    await put('due_add',due); await enqueue('due','create',due);
  }
  await enqueue('customer','create',c);
  form.reset(); $('addCustomerModal').classList.remove('show'); await refreshCustomers();
  toast(online()?'কাস্টমার যোগ হয়েছে ও Sync queue-তে আছে':'Offline: কাস্টমার লোকালেই সংরক্ষিত হয়েছে');
}

async function addDue(){
  const c=await get('customers',$('dueCustomer').value);
  const amount=Number($('dueAmount').value||0);
  if(!c||amount<=0)return toast('সঠিক কাস্টমার ও পরিমাণ দিন','error');
  const now=nowIso(), d={id:uuid(),customerId:c.id,amount,date:$('dueDate').value||now.slice(0,10),
    reference:$('dueReference').value.trim(),note:$('dueNote').value.trim(),createdAt:now,updatedAt:now};
  c.currentDue=Number(c.currentDue||0)+amount;c.updatedAt=now;c.version=(c.version||1)+1;
  const tx={id:uuid(),customerId:c.id,type:'Due',date:d.date,bill:amount,payment:0,
    remainingDue:c.currentDue,reference:d.reference,method:'Due',note:d.note,createdAt:now,updatedAt:now};
  await put('customers',c);await put('due_add',d);await put('customer_transactions',tx);
  await enqueue('customer','update',c);await enqueue('due','create',d);await enqueue('customer_transaction','create',tx);
  $('addDueForm').reset();populateCustomerSelects();await refreshCustomers();toast('বাকি যোগ হয়েছে');
}

async function payDue(){
  const c=await get('customers',$('payCustomer').value), paid=Number($('payAmount').value||0), discount=Number($('payDiscount').value||0);
  if(!c||paid<=0)return toast('সঠিক কাস্টমার ও পরিশোধের পরিমাণ দিন','error');
  const current=Number(c.currentDue||0), net=Math.max(0,current-discount), actual=Math.min(paid,net), remaining=Math.max(0,net-actual);
  const now=nowIso(), p={id:uuid(),customerId:c.id,date:$('payDate').value||now.slice(0,10),
    currentDue:current,discount,netPayable:net,paidAmount:actual,remainingDue:remaining,
    method:$('payMethod').value,note:$('payNote').value.trim(),createdAt:now,updatedAt:now};
  c.currentDue=remaining;c.updatedAt=now;c.version=(c.version||1)+1;
  const tx={id:uuid(),customerId:c.id,type:'Payment',date:p.date,bill:0,payment:actual,
    remainingDue:remaining,reference:'PAY-'+p.id.slice(0,8),method:p.method,note:p.note,
    discount,createdAt:now,updatedAt:now};
  await put('customers',c);await put('payments',p);await put('customer_transactions',tx);
  await enqueue('customer','update',c);await enqueue('payment','create',p);await enqueue('customer_transaction','create',tx);
  $('payDueForm').reset();populateCustomerSelects();await refreshCustomers();toast('পরিশোধ সংরক্ষিত হয়েছে');
}

async function createSale(){
  const c=await get('customers',$('saleCustomer').value);
  const bill=Number($('saleBill').value||0), paid=Number($('salePaid').value||0);
  if(!c||bill<=0)return toast('কাস্টমার ও বিল দিন','error');
  const prev=Number(c.currentDue||0), total=prev+bill, newDue=Math.max(0,total-paid);
  const now=nowIso(), s={id:uuid(),customerId:c.id,invoice:$('saleInvoice').value.trim()||'INV-'+Date.now(),
    date:$('saleDate').value||now.slice(0,10),totalBill:bill,previousDue:prev,totalPayable:total,
    paidAmount:Math.min(paid,total),newDue,paymentMethod:$('saleMethod').value,
    discount:Number($('saleDiscount').value||0),commission:Number($('saleCommission').value||0),
    note:$('saleNote').value.trim(),createdAt:now,updatedAt:now,version:1,deviceId:deviceId()};
  c.currentDue=newDue;c.updatedAt=now;c.version=(c.version||1)+1;
  const tx={id:uuid(),customerId:c.id,type:'Sale',date:s.date,bill,payment:s.paidAmount,
    remainingDue:newDue,reference:s.invoice,method:s.paymentMethod,note:s.note,createdAt:now,updatedAt:now};
  await put('sales',s);await put('customers',c);await put('customer_transactions',tx);
  await enqueue('sale','create',s);await enqueue('customer','update',c);await enqueue('customer_transaction','create',tx);
  $('saleForm').reset();populateCustomerSelects();await refreshCustomers();toast('বিক্রি সংরক্ষিত হয়েছে');
}
function deviceId(){let x=localStorage.getItem('shipon_device_id');if(!x){x=uuid();localStorage.setItem('shipon_device_id',x)}return x}
async function populateCustomerSelects(){
  for(const id of ['dueCustomer','payCustomer','saleCustomer']){
    const el=$(id); if(!el)continue;
    el.innerHTML='<option value="">কাস্টমার নির্বাচন করুন</option>'+state.customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${money(c.currentDue)}</option>`).join('');
  }
}
function showTab(tab){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.querySelector(`#view-${tab}`).classList.add('active');
  document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
}
async function loginUI(){
  if(getToken()){ $('loginScreen').classList.remove('show'); return; }
  $('loginScreen').classList.add('show');
}
async function doLogin(){
  try{
    const data=await login($('username').value.trim(),$('password').value);
    setToken(data.token); if(data.user) await setMeta('user',data.user);
    $('loginScreen').classList.remove('show'); toast('Login সফল');
  }catch(e){toast(e.message,'error')}
}
async function updateSync(){
  const q=await pendingQueue(); $('queueCount').textContent=q.length;
  $('syncText').textContent=online()?'Auto Sync চালু':'Offline mode';
  const last=await getMeta('lastSyncAt','');
  $('lastSync').textContent=last?new Date(last).toLocaleString('bn-BD'):'এখনও Sync হয়নি';
}
async function syncClick(){
  $('syncBtn').disabled=true; try{const r=await syncNow();toast(`Sync: ${r.sent} পাঠানো, ${r.failed} ব্যর্থ`)}catch(e){toast(e.message,'error')}finally{$('syncBtn').disabled=false;await updateSync();await refreshCustomers()}
}

function initEvents(){
  window.addEventListener('online',()=>{setNet();toast('Internet এসেছে — Sync শুরু হচ্ছে');syncNow().then(()=>{updateSync();refreshCustomers()})});
  window.addEventListener('offline',()=>{setNet();toast('Offline mode চালু')});
  $('search').oninput=e=>{state.search=e.target.value;renderCustomers()};
  $('syncBtn').onclick=syncClick;
  $('addCustomerBtn').onclick=()=>$('addCustomerModal').classList.add('show');
  $('addDueBtn').onclick=()=>{$('addDueModal').classList.add('show');populateCustomerSelects()};
  $('payDueBtn').onclick=()=>{$('payDueModal').classList.add('show');populateCustomerSelects()};
  $('saleBtn').onclick=()=>{$('saleModal').classList.add('show');populateCustomerSelects()};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
  $('addCustomerForm').onsubmit=e=>{e.preventDefault();addCustomer(e.target)};
  $('addDueForm').onsubmit=e=>{e.preventDefault();addDue()};
  $('payDueForm').onsubmit=e=>{e.preventDefault();payDue()};
  $('saleForm').onsubmit=e=>{e.preventDefault();createSale()};
  $('dueCustomer').onchange=()=>{const c=state.customers.find(x=>x.id===$('dueCustomer').value);$('dueCurrent').value=c?money(c.currentDue):''};
  $('payCustomer').onchange=()=>{const c=state.customers.find(x=>x.id===$('payCustomer').value);$('payCurrent').value=c?money(c.currentDue):''};
  $('saleCustomer').onchange=()=>{const c=state.customers.find(x=>x.id===$('saleCustomer').value);$('salePrevious').value=c?money(c.currentDue):''};
  $('backendForm').onsubmit=e=>{e.preventDefault();setBackendUrl($('backendUrl').value);toast('Backend URL সংরক্ষিত')};
  $('logoutBtn').onclick=()=>{clearToken();loginUI()};
  document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
  $('username').addEventListener('keydown',e=>{if(e.key==='Enter')$('password').focus()});
  $('password').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
  $('loginForm').onsubmit=e=>{e.preventDefault();doLogin()};
}
async function baseBoot(){
  initResponsiveLayout();
  $('backendUrl').value=getBackendUrl();
  setNet(); initEvents(); await refreshCustomers(); await populateCustomerSelects(); await updateSync(); loginUI();
  startAutoSync(async()=>{await updateSync()});
}

let saleCart=[];
function renderCart(){const box=$('cartList');if(!box)return;box.innerHTML=saleCart.map((x,i)=>`<div class="cart-row"><div class="grow"><b>${esc(x.name)}</b><small>${money(x.sellingPrice)} × ${x.qty}</small></div><input data-q="${i}" type="number" min="1" value="${x.qty}"><b>${money(x.sellingPrice*x.qty)}</b><button class="danger" data-del="${i}">×</button></div>`).join('')||'<div class="empty">Cart খালি</div>'; $('cartSubtotal').textContent=money(saleCart.reduce((a,x)=>a+x.sellingPrice*x.qty,0));document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{saleCart.splice(+b.dataset.del,1);renderCart()});document.querySelectorAll('[data-q]').forEach(b=>b.onchange=()=>{saleCart[+b.dataset.q].qty=Math.max(1,+b.value||1);renderCart()})}
async function addCart(q){const a=await findProduct(q);if(!a.length)return toast('Product পাওয়া যায়নি','error');const p=a[0],x=saleCart.find(z=>z.productId===p.id);if(x)x.qty++;else saleCart.push({productId:p.id,name:p.name,qty:1,sellingPrice:+p.sellingPrice||0,purchasePrice:+p.purchasePrice||0});renderCart();toast('Cart-এ যোগ হয়েছে')}
async function fullSale(e){e.preventDefault();try{const s=await createSaleCart({customerId:$('fullSaleCustomer').value,items:saleCart,paidAmount:$('fullSalePaid').value,discount:$('fullSaleDiscount').value,commission:$('fullSaleCommission').value,paymentMethod:$('fullSaleMethod').value,invoice:$('fullSaleInvoice').value,date:$('fullSaleDate').value,note:$('fullSaleNote').value});saleCart=[];renderCart();$('fullSaleModal').classList.remove('show');await refreshCustomers();await renderProducts();await renderProfit();toast('বিক্রি সম্পন্ন: '+s.invoice)}catch(x){toast(x.message,'error')}}
async function renderSuppliers(){const a=await getAll('suppliers');$('supplierList').innerHTML=a.map(s=>`<div class="product-row"><div class="grow"><b>${esc(s.name)}</b><small>${esc(s.shop||'')} • ${esc(s.mobile||'')}</small></div><b class="due bad">${money(s.currentDue)}</b><button class="secondary" data-sp="${s.id}">Pay</button></div>`).join('')||'<div class="empty">Supplier নেই</div>';document.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{$('supplierPayId').value=b.dataset.sp;$('supplierPayModal').classList.add('show')})}
async function phase6Init(){
 $('fullSaleBtn')?.addEventListener('click',async()=>{$('fullSaleCustomer').innerHTML='<option value="">কাস্টমার নির্বাচন</option>'+state.customers.map(c=>`<option value="${c.id}">${esc(c.name)} — ${money(c.currentDue)}</option>`).join('');saleCart=[];renderCart();$('fullSaleModal').classList.add('show')});
 $('saleProductAdd')?.addEventListener('click',()=>addCart($('saleProductSearch').value));
 $('saleProductSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCart(e.target.value)}});
 $('scanBtn')?.addEventListener('click',async()=>{try{addCart(await scanBarcode())}catch(e){if(!e.message.includes('বাতিল'))toast(e.message,'error')}});
 $('fullSaleForm')?.addEventListener('submit',fullSale);
 $('supplierBtn')?.addEventListener('click',()=>$('supplierModal').classList.add('show'));
 $('supplierForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);await createSupplier(Object.fromEntries(f));e.target.reset();$('supplierModal').classList.remove('show');await renderSuppliers();toast('Supplier সংরক্ষিত')});
 $('supplierPayForm')?.addEventListener('submit',async e=>{e.preventDefault();try{await supplierPayment({supplierId:$('supplierPayId').value,paidAmount:$('supplierPayAmount').value,discount:$('supplierPayDiscount').value,method:$('supplierPayMethod').value,date:$('supplierPayDate').value,note:$('supplierPayNote').value});e.target.reset();$('supplierPayModal').classList.remove('show');await renderSuppliers();toast('Supplier payment সংরক্ষিত')}catch(x){toast(x.message,'error')}});
 await renderSuppliers();
}
boot().then(phase6Init);

/** PHASE 7 - hardened sync endpoint
 * Replace the old backend/Sync.gs with this file's contents.
 * Keeps the existing Phase 2 API shape but adds:
 *  - idempotency via Sync_Mutations sheet
 *  - LockService protection around each mutation
 *  - explicit role checks
 *  - compatibility with syncId/mutationId
 *  - stable pull response: {changes, serverTime}
 */
var Sync = {
  push: function(user,payload) {
    var items = payload && Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) return ok_({results:[]});
    var out=[];
    for (var i=0;i<items.length;i++) {
      var item=items[i], lock=LockService.getScriptLock();
      try {
        lock.waitLock(15000);
        var r=applySyncItemIdempotent_(user,item);
        out.push({syncId:String(item.syncId||item.mutationId||''),status:r.duplicate?'DUPLICATE':'SYNCED',data:r.data||r});
      } catch(e) {
        out.push({syncId:String(item && (item.syncId||item.mutationId)||''),status:'FAILED',error:String(e.message||e)});
      } finally { try{lock.releaseLock();}catch(ignore){} }
    }
    return ok_({results:out});
  },

  pull: function(user,payload) {
    var since=payload && payload.since ? new Date(payload.since) : new Date(0);
    var out=[];
    var names=[
      {sheet:'Customers',entity:'customer'},
      {sheet:'Sales',entity:'sale'},
      {sheet:'Due_Payments',entity:'payment'},
      {sheet:'Due_Add',entity:'due'},
      {sheet:'Reminders',entity:'reminder'}
    ];
    names.forEach(function(def){
      var sh=getDb_().getSheetByName(def.sheet); if(!sh) return;
      SheetStore.records_(sh).forEach(function(r){
        var d=new Date(r.UpdatedAt||r.Date||0); if(d>=since) out.push({entity:def.entity,payload:normalizePullRecord_(def.entity,r)});
      });
    });
    return ok_({changes:out,serverTime:new Date().toISOString()});
  }
};

function applySyncItemIdempotent_(user,item) {
  if(!item || !item.entity || !item.operation) throw new Error('Invalid sync item.');
  var mutationId=String(item.mutationId||item.syncId||'');
  if(!mutationId) throw new Error('mutationId/syncId is required.');
  var sh=SheetStore.ensureSheet_('Sync_Mutations',['Mutation_ID','Entity','Operation','User_ID','CreatedAt','Result_JSON']);
  var existing=SheetStore.findBy_(sh,'Mutation_ID',mutationId);
  if(existing) return {duplicate:true,data:existing.Result_JSON ? JSON.parse(existing.Result_JSON) : {mutationId:mutationId}};

  var p=item.payload||{}, entity=String(item.entity).toLowerCase(), op=String(item.operation).toUpperCase(), result;
  switch(entity) {
    case 'customer':
      requireRole_(user,['ADMIN','STAFF']);
      if(op==='CREATE') result=JSON.parse(unwrap_(Customers.create(user,p))).data;
      else if(op==='UPDATE') result=JSON.parse(unwrap_(Customers.update(user,p))).data;
      else if(op==='DELETE') {requireRole_(user,['ADMIN']); result=JSON.parse(unwrap_(Customers.remove(user,p))).data;}
      else throw new Error('Unsupported customer operation.'); break;
    case 'sale':
      requireRole_(user,['ADMIN','STAFF']); if(op!=='CREATE') throw new Error('Unsupported sale operation.');
      result=JSON.parse(unwrap_(Sales.create(user,p))).data; break;
    case 'payment':
      requireRole_(user,['ADMIN','STAFF']); if(op!=='CREATE') throw new Error('Unsupported payment operation.');
      result=JSON.parse(unwrap_(Payments.create(user,p))).data; break;
    case 'due':
      requireRole_(user,['ADMIN','STAFF']); if(op!=='CREATE') throw new Error('Unsupported due operation.');
      result=JSON.parse(unwrap_(Due.create(user,p))).data; break;
    case 'reminder':
      requireRole_(user,['ADMIN','STAFF']);
      if(op==='CREATE'||op==='UPDATE') result=JSON.parse(unwrap_(Reminders.save(user,p))).data;
      else if(op==='DELETE') result=JSON.parse(unwrap_(Reminders.disable(user,p))).data;
      else throw new Error('Unsupported reminder operation.'); break;
    default: throw new Error('Unsupported sync entity: '+entity);
  }
  SheetStore.append_(sh,{Mutation_ID:mutationId,Entity:entity,Operation:op,User_ID:user.userId||'',CreatedAt:new Date().toISOString(),Result_JSON:JSON.stringify(result||{})});
  return {duplicate:false,data:result};
}

function normalizePullRecord_(entity,r){
  if(entity==='customer') return normalizeCustomer_(r);
  if(entity==='sale') return {id:String(r.Sale_ID||''),saleId:String(r.Sale_ID||''),date:r.Date instanceof Date?r.Date.toISOString():String(r.Date||''),customerId:String(r.Customer_ID||''),invoice:String(r.Invoice_No||''),totalBill:Number(r.Total_Bill||0),previousDue:Number(r.Previous_Due||0),totalPayable:Number(r.Total_Payable||0),paidAmount:Number(r.Paid_Amount||0),paymentMethod:String(r.Payment_Method||''),newDue:Number(r.New_Due||0)};
  if(entity==='payment') return {id:String(r.Payment_ID||''),paymentId:String(r.Payment_ID||''),date:r.Date instanceof Date?r.Date.toISOString():String(r.Date||''),customerId:String(r.Customer_ID||''),currentDue:Number(r.Previous_Due||0),discount:Number(r.Discount||0),netPayable:Number(r.Final_Payable||0),paidAmount:Number(r.Paid_Amount||0),method:String(r.Payment_Method||''),remainingDue:Number(r.Remaining_Due||0)};
  if(entity==='due') return {id:String(r.Due_ID||''),dueId:String(r.Due_ID||''),date:r.Date instanceof Date?r.Date.toISOString():String(r.Date||''),customerId:String(r.Customer_ID||''),amount:Number(r.Amount||0),note:String(r.Note||'')};
  return r;
}

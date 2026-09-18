import {api} from './api.js';
import {getAll, put, nowIso, uuid, setMeta, getMeta} from './db.js';

let running = false;

export async function enqueue(entity, operation, payload) {
  const item = { id: uuid(), entity, operation:String(operation||'').toUpperCase(), payload,
    status:'pending', retryCount:0, createdAt:nowIso(), updatedAt:nowIso() };
  await put('sync_queue', item); return item;
}
export async function pendingQueue(){
  return (await getAll('sync_queue')).filter(x=>x.status!=='done')
    .sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
}

function localStore(entity){
  return ({customer:'customers',customers:'customers',sale:'sales',sales:'sales',payment:'payments',payments:'payments',due:'due_add',due_add:'due_add',customer_transaction:'customer_transactions',customer_transactions:'customer_transactions',reminder:'reminders',reminders:'reminders',product:'products',products:'products',supplier:'suppliers',suppliers:'suppliers',purchase:'purchases',purchases:'purchases',expense:'expenses',expenses:'expenses',stock_ledger:'stock_ledger',inventory:'inventory'}[String(entity||'').toLowerCase()]||null);
}
function payloadOf(x){ return x?.payload || x?.record || x?.data || null; }
function entityOf(x){ return String(x?.entity||'').toLowerCase(); }

export async function syncNow(onProgress=()=>{}) {
  if(running || !navigator.onLine) return {sent:0,failed:0};
  running=true; let sent=0,failed=0;
  try {
    const queue=await pendingQueue(); onProgress({phase:'push',total:queue.length,done:0});
    let done=0;
    if(queue.length){
      const items=queue.map(item=>({syncId:item.id,mutationId:item.id,entity:item.entity,operation:item.operation,payload:item.payload}));
      try {
        const result=await api('sync.push',{items});
        const results=Array.isArray(result?.results)?result.results:[];
        for(const item of queue){
          const r=results.find(x=>x.syncId===item.id);
          if(r && (r.status==='SYNCED'||r.status==='DUPLICATE')){item.status='done';item.updatedAt=nowIso();sent++;}
          else if(r){item.status='failed';item.retryCount=(item.retryCount||0)+1;item.lastError=String(r.error||'Sync failed');item.updatedAt=nowIso();failed++;}
          else {item.status='failed';item.retryCount=(item.retryCount||0)+1;item.lastError='No server result';item.updatedAt=nowIso();failed++;}
          await put('sync_queue',item); done++; onProgress({phase:'push',total:queue.length,done});
        }
      } catch(e){
        for(const item of queue){item.status='failed';item.retryCount=(item.retryCount||0)+1;item.lastError=String(e.message||e);item.updatedAt=nowIso();await put('sync_queue',item);failed++;done++;onProgress({phase:'push',total:queue.length,done});}
      }
    }
    try {
      const since=await getMeta('lastPullAt','1970-01-01T00:00:00.000Z');
      const data=await api('sync.pull',{since});
      const changes=Array.isArray(data?.changes)?data.changes:(Array.isArray(data?.items)?data.items:[]);
      let applied=0;
      for(const c of changes){const store=localStore(entityOf(c));const p=payloadOf(c);if(store&&p&&p.id) {await put(store,p);applied++;}}
      await setMeta('lastPullAt',data?.serverTime||new Date().toISOString());
      await setMeta('lastPullApplied',applied);
    }catch(e){await setMeta('lastPullError',String(e.message||e));}
    await setMeta('lastSyncAt',new Date().toISOString()); await setMeta('lastSyncResult',{sent,failed});
  }finally{running=false;}
  return {sent,failed};
}
export function startAutoSync(onProgress=()=>{}){const run=()=>syncNow(onProgress);window.addEventListener('online',run);setInterval(run,60000);}

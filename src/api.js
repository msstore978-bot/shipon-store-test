const KEY_URL = 'shipon_backend_url';
const KEY_TOKEN = 'shipon_session_token';

export function getBackendUrl(){ return localStorage.getItem(KEY_URL)||''; }
export function setBackendUrl(url){ localStorage.setItem(KEY_URL,(url||'').trim().replace(/\/+$/,'')); }
export function getToken(){ return localStorage.getItem(KEY_TOKEN)||''; }
export function setToken(t){ localStorage.setItem(KEY_TOKEN,t||''); }
export function clearToken(){ localStorage.removeItem(KEY_TOKEN); }

export async function api(action,payload={}){
  const base=getBackendUrl();
  if(!base) throw new Error('Backend URL সেট করা হয়নি');
  const res=await fetch(base,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,payload,auth:{token:getToken()}})});
  const text=await res.text();
  let data; try{data=JSON.parse(text)}catch{throw new Error('Backend response JSON নয়')}
  if(!data.success) throw new Error(data.message || data.error?.details || data.error?.code || 'API error');
  return data.data ?? data;
}
export async function login(username,password){ return api('login',{username,password}); }

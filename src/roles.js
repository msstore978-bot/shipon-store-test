import {getMeta,setMeta} from './db.js';

export async function setSessionUser(user){
  if(user) await setMeta('sessionUser', user);
  return user;
}
export async function getSessionUser(){ return await getMeta('sessionUser', null); }
export async function getRole(){ const u=await getSessionUser(); return String(u?.role||'').toUpperCase(); }
export async function isAdmin(){ return (await getRole())==='ADMIN'; }
export async function requireRole(roles){
  const role=await getRole();
  if(!roles.map(String).map(x=>x.toUpperCase()).includes(role)) throw new Error('এই কাজের অনুমতি নেই।');
  return true;
}
export function canSetSellingPrice(role){ return String(role||'').toUpperCase()==='ADMIN'; }

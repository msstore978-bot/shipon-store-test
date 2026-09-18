import { put, get, remove } from './db.js';

export async function fileToCompressedDataUrl(file,{maxSize=1200,quality=.78}={}){
  if(!file) return '';
  return await new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onerror=reject;
    r.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const scale=Math.min(1,maxSize/Math.max(img.width,img.height));
        const c=document.createElement('canvas');
        c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale));
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        resolve(c.toDataURL('image/jpeg',quality));
      };
      img.onerror=reject; img.src=r.result;
    };
    r.readAsDataURL(file);
  });
}

export async function saveLocalImage({id,dataUrl,entity,entityId}){
  const row={id,dataUrl,entity,entityId,updatedAt:new Date().toISOString(),syncStatus:'pending'};
  await put('images',row); return row;
}
export async function getLocalImage(id){return get('images',id)}
export async function deleteLocalImage(id){return remove('images',id)}

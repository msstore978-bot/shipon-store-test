import { scanNativeBarcode } from './nativeScanner.js';

async function scanWebBarcode(){
 if(!('BarcodeDetector' in window)) throw Error('Camera barcode scanner support নেই—Barcode/Product ID/SKU দিয়ে Search করুন।');
 const formats=await BarcodeDetector.getSupportedFormats();
 if(!navigator.mediaDevices?.getUserMedia) throw Error('Camera access পাওয়া যাচ্ছে না।');
 const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
 const v=document.createElement('video');v.setAttribute('playsinline','true');v.srcObject=stream;await v.play();
 const ov=document.createElement('div');ov.className='scanner-overlay';ov.innerHTML='<div class="scanner-box"><b>Barcode Scan করুন</b><small>Barcode ক্যামেরার সামনে রাখুন</small><button id="sx" class="danger">Cancel</button></div>';document.body.append(v,ov);
 return new Promise((res,rej)=>{const stop=()=>{stream.getTracks().forEach(t=>t.stop());v.remove();ov.remove()};ov.querySelector('#sx').onclick=()=>{stop();rej(Error('Scan বাতিল'))};const d=new BarcodeDetector({formats});const loop=async()=>{try{const a=await d.detect(v);if(a[0]){const x=a[0].rawValue;stop();res(x);return}}catch{}requestAnimationFrame(loop)};loop()});
}

export async function scanBarcode(){
  const native=await scanNativeBarcode();
  if(native) return native;
  return scanWebBarcode();
}

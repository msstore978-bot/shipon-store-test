import { Capacitor } from '@capacitor/core';

export async function scanNativeBarcode(){
  if(!Capacitor.isNativePlatform()) return null;
  try{
    const mod=await import('@capacitor-mlkit/barcode-scanning');
    const {BarcodeScanner,BarcodeFormat}=mod;
    const supported=await BarcodeScanner.isSupported();
    if(!supported?.supported) return null;
    const formats=[BarcodeFormat.Code128,BarcodeFormat.Ean13,BarcodeFormat.Ean8,BarcodeFormat.UpcA,BarcodeFormat.UpcE,BarcodeFormat.Code39,BarcodeFormat.Code93,BarcodeFormat.Itf,BarcodeFormat.QrCode];
    const result=await BarcodeScanner.scan({formats,autoZoom:true});
    const first=result?.barcodes?.find(x=>x?.rawValue||x?.displayValue);
    return first?.rawValue||first?.displayValue||null;
  }catch(err){
    const message=String(err?.message||err||'');
    if(/cancel|canceled|cancelled/i.test(message)) throw new Error('Scan বাতিল');
    return null;
  }
}

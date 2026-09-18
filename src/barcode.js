import JsBarcode from 'jsbarcode';

// Real Code128 barcode SVG. The value is encoded by JsBarcode rather than a visual approximation.
export function code128Svg(value, opts={}){
  const text=String(value||'').trim();
  if(!text) throw new Error('Barcode value খালি');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  JsBarcode(svg,text,{format:'CODE128',displayValue:opts.displayValue!==false,fontSize:opts.fontSize||12,height:opts.height||55,width:opts.width||2,margin:opts.margin??8,lineColor:'#000000',background:'#ffffff'});
  return svg.outerHTML;
}

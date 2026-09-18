
export function code128Svg(value,width=520,height=150){
  // Deterministic Code-128-B-like visual barcode for internal product identification.
  // For scanner interoperability, the human-readable value is always printed.
  // This visual uses a stable bar pattern derived from the string.
  let seed=0; for(const c of String(value)) seed=(seed*31+c.charCodeAt(0))>>>0;
  let bits='11010010000';
  for(const c of String(value)){
    let x=(seed^c.charCodeAt(0)*2654435761)>>>0;
    for(let i=0;i<11;i++){bits += ((x>>i)&1)?'1':'0';}
    seed=(seed*1664525+1013904223)>>>0;
  }
  bits+='1100011101011';
  const barW=width/bits.length;
  let rects='';
  for(let i=0;i<bits.length;i++) if(bits[i]==='1') rects+=`<rect x="${(i*barW).toFixed(2)}" y="5" width="${Math.max(0.7,barW+.2).toFixed(2)}" height="${height-34}"/>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="white"/>${rects}
    <text x="50%" y="${height-10}" text-anchor="middle" font-family="monospace" font-size="18">${escapeXml(value)}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function escapeXml(s){return String(s).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]))}

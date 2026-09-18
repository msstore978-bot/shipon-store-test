export function applyResponsiveLayout(){
  const root=document.documentElement;
  const w=window.innerWidth;
  let mode='desktop';
  if(w<=650) mode='mobile'; else if(w<=900) mode='tablet'; else if(w<=1250) mode='laptop';
  root.dataset.layout=mode;
  document.body.dataset.layout=mode;
}
export function initResponsiveLayout(){
  applyResponsiveLayout();
  let t;
  window.addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(applyResponsiveLayout,120)});
}

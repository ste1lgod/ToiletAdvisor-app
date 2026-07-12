// ── THEME ──
function applyTheme(){
  document.body.classList.toggle('dark',currentTheme==='dark');
  document.getElementById('themeBtn').textContent=currentTheme==='dark'?'☀️':'🌙';
  applyMapTheme();
}
function applyMapTheme(){
  if(!myMap)return;
  if(currentTheme==='dark'){
    myMap.panes.get('ground').getElement().style.filter='invert(0.9) hue-rotate(180deg) saturate(0.7) brightness(0.85)';
  }else{
    myMap.panes.get('ground').getElement().style.filter='';
  }
}
function toggleTheme(){
  currentTheme=currentTheme==='dark'?'light':'dark';
  localStorage.setItem('ta_theme',currentTheme);
  applyTheme();
}

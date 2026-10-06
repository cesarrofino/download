(function(){
"use strict";
var C=window.MYCYCLE||{}, KEY="mc_stats_v1", WAIT=10;
var $=function(id){return document.getElementById(id)};

/* ---------- contagem: local + contador público ---------- */
function today(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function load(){try{var s=JSON.parse(localStorage.getItem(KEY));if(s&&s.days)return s}catch(e){}return{visits:0,verified:0,failed:0,downloads:0,last:0,days:{}}}
function hit(key){
  if(!C.COUNTER_BASE||!C.COUNTER_NS)return;
  try{fetch(C.COUNTER_BASE+"/hit/"+C.COUNTER_NS+"/"+key,{mode:"no-cors",referrerPolicy:"no-referrer",keepalive:true})}catch(e){}
}
function track(field){
  var d=today();
  try{
    var s=load();
    s[field]=(s[field]||0)+1;
    s.days[d]=s.days[d]||{d:0,v:0};
    if(field==="downloads"){s.days[d].d++;s.last=Date.now()}
    if(field==="visits")s.days[d].v++;
    localStorage.setItem(KEY,JSON.stringify(s));
  }catch(e){}
  if(field==="downloads"){hit("downloads");hit("d-"+d)}
  if(field==="visits"){hit("visitas");hit("v-"+d)}
}

/* ---------- informação do app ---------- */
$("mPlat").textContent=C.PLATFORM||"Android";
$("mVer").textContent=C.VERSION||"1.0";
$("mSize").textContent=C.FILE_SIZE||"—";
$("yr").textContent=new Date().getFullYear();
track("visits");

/* ---------- download com contagem regressiva ---------- */
var dl=$("dl"),txt=$("dlTxt"),msg=$("vmsg"),box=$("progBox"),bar=$("prog"),manual=$("manual"),running=false;
function say(t,c){msg.textContent=t;msg.className="msg"+(c?" "+c:"")}

dl.addEventListener("click",function(e){
  if(!e.isTrusted||running)return;
  var url=C.DOWNLOAD_URL||"";
  if(!/^https:\/\//i.test(url))return say("Link de download ainda não configurado.","err");
  running=true;dl.disabled=true;manual.hidden=true;
  var left=WAIT;
  box.hidden=false;bar.style.transition="none";bar.style.width="0";
  void bar.offsetWidth;bar.style.transition="";
  txt.textContent="O download fica disponível em "+left+" s";
  say("Aguarde — a preparar o seu download…");
  setTimeout(function(){bar.style.width="10%"},30);
  var iv=setInterval(function(){
    left--;
    bar.style.width=((WAIT-left)/WAIT*100)+"%";
    if(left>0){txt.textContent="O download fica disponível em "+left+" s";return}
    clearInterval(iv);
    track("downloads");
    txt.textContent="Download iniciado";
    say("O download vai começar. Obrigado!","ok");
    manual.href=url;manual.hidden=false;
    window.location.href=url;
    setTimeout(function(){running=false;dl.disabled=false;txt.textContent="Fazer download novamente";box.hidden=true},4000);
  },1000);
});
})();

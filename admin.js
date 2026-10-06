(function(){
"use strict";
var SALT="c325d817c87f4f1c6a73ec76a4bec4c0";
var HASH="eb8fc44a35448b9c577a24f57fdd123798590e5eaaa10ca4a56632c2bfa5772f";
var ITER=150000, KEY="mc_stats_v1", LOCK="mc_lock_v1", SESS="mc_admin_v1";
var C=window.MYCYCLE||{}, creds=null;
var $=function(id){return document.getElementById(id)};
function hex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return x.toString(16).padStart(2,"0")}).join("")}
function unhex(h){var a=new Uint8Array(h.length/2);for(var i=0;i<a.length;i++)a[i]=parseInt(h.substr(i*2,2),16);return a}
function say(t,c){var m=$("lmsg");m.textContent=t;m.className="msg"+(c?" "+c:"")}

async function derive(code,pass){
  var k=await crypto.subtle.importKey("raw",new TextEncoder().encode(code+":"+pass),"PBKDF2",false,["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:unhex(SALT),iterations:ITER},k,256));
}
function same(a,b){if(a.length!==b.length)return false;var r=0;for(var i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
function lock(){try{return JSON.parse(localStorage.getItem(LOCK))||{n:0,until:0}}catch(e){return{n:0,until:0}}}

async function login(){
  var l=lock(),now=Date.now();
  if(l.until>now)return say("Demasiadas tentativas. Aguarde "+Math.ceil((l.until-now)/60000)+" min.","err");
  var code=$("code").value.trim(),pass=$("pass").value;
  if(!code||!pass)return say("Preencha o código e a palavra-passe.","err");
  $("enter").disabled=true;say("A verificar…");
  var ok=false;
  try{ok=same(await derive(code,pass),HASH)}catch(e){say("Este navegador não suporta a verificação segura. Abra a página por HTTPS.","err");$("enter").disabled=false;return}
  $("enter").disabled=false;
  if(ok){
    localStorage.removeItem(LOCK);
    sessionStorage.setItem(SESS,String(Date.now()+15*60000));
    $("pass").value="";start();
  }else{
    l.n=(l.n||0)+1;
    if(l.n>=5){l.until=Date.now()+5*60000;l.n=0}
    localStorage.setItem(LOCK,JSON.stringify(l));
    say("Credenciais incorretas.","err");
    await new Promise(function(r){setTimeout(r,800)});
  }
}
function authed(){return Number(sessionStorage.getItem(SESS)||0)>Date.now()}
function logout(){sessionStorage.removeItem(SESS);location.reload()}

function stats(){try{var s=JSON.parse(localStorage.getItem(KEY));if(s&&s.days)return s}catch(e){}return{visits:0,verified:0,failed:0,downloads:0,last:0,days:{}}}
function ymd(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}

async function start(){
  $("loginBox").hidden=true;$("panel").hidden=false;
  var s=stats(),note="Números deste navegador (contador online indisponível).";
  if(C.COUNTER_BASE&&C.COUNTER_NS){
    try{
      var base=C.COUNTER_BASE+"/get/"+C.COUNTER_NS+"/";
      var get=function(k){return fetch(base+k,{referrerPolicy:"no-referrer"}).then(function(r){
        if(r.status===404)return 0;
        if(!r.ok)throw new Error("net");
        return r.json().then(function(j){return Number(j.value)||0})})};
      var keys=[];
      for(var i=13;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);keys.push(ymd(d))}
      var res=await Promise.all([get("downloads"),get("visitas"),get("falhas")].concat(keys.map(function(k){return get("d-"+k)})));
      var days={};keys.forEach(function(k,n){days[k]={d:res[3+n],v:0}});
      s={downloads:res[0],visits:res[1],failed:res[2],last:0,days:days};
      note="Números globais: todos os downloads feitos por todas as pessoas.";
    }catch(e){note="Não foi possível ler o contador online. A mostrar apenas os números deste navegador."}
  }
  $("srcNote").textContent=note;
  show(s);
}
function show(s){
  lastData=s;
  var t=ymd(new Date());
  $("sDl").textContent=s.downloads||0;
  $("sToday").textContent=(s.days[t]&&s.days[t].d)||0;
  $("sVis").textContent=s.visits||0;
  $("sFail").textContent=s.failed||0;
  $("lastDl").textContent=s.last?"Último download: "+new Date(s.last).toLocaleString("pt-PT"):"";
  var days=[],max=1;
  for(var i=13;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);var k=ymd(d);var n=(s.days[k]&&s.days[k].d)||0;max=Math.max(max,n);days.push({k:k,n:n,l:String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")})}
  var ch=$("chart");ch.textContent="";
  days.forEach(function(x){
    var b=document.createElement("div");b.className="bar"+(x.n?"":" zero");
    var em=document.createElement("em");em.textContent=x.n;
    var bar=document.createElement("i");bar.style.height=Math.max(2,Math.round(x.n/max*100))+"px";
    var lb=document.createElement("span");lb.textContent=x.l;
    b.appendChild(em);b.appendChild(bar);b.appendChild(lb);ch.appendChild(b);
  });
}
var lastData=null;
function csv(){
  var s=lastData||stats(),rows=["data,downloads,visitas"];
  Object.keys(s.days).sort().forEach(function(k){rows.push(k+","+(s.days[k].d||0)+","+(s.days[k].v||0))});
  rows.push("TOTAL,"+(s.downloads||0)+","+(s.visits||0));
  var a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([rows.join("\n")],{type:"text/csv"}));
  a.download="my-cycle-downloads.csv";document.body.appendChild(a);a.click();a.remove();
}
$("enter").addEventListener("click",login);
["code","pass"].forEach(function(id){$(id).addEventListener("keydown",function(e){if(e.key==="Enter")login()})});
$("out").addEventListener("click",logout);
$("csv").addEventListener("click",csv);
$("reset").addEventListener("click",function(){
  if(confirm("Repor os contadores deste navegador? (os globais não são apagados)")){localStorage.removeItem(KEY);start()}
});
if(authed())start();
setInterval(function(){if(!$("panel").hidden&&!authed())logout()},30000);
})();

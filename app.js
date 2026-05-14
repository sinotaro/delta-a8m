
const STORAGE_KEY = "keiba_parser_manager_v2";
let appState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"savedRaces":[],"manualHorses":[],"visibleHorseColumns":null,"visiblePastColumns":null}');
let currentParsed = null;
let selectedSavedId = null;

function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(appState)); }

function initColumns(){
  if(!appState.visibleHorseColumns) appState.visibleHorseColumns = Object.fromEntries(KEIBA_SCHEMA.horseColumns.map(c=>[c.key,c.visible]));
  if(!appState.visiblePastColumns) appState.visiblePastColumns = Object.fromEntries(KEIBA_SCHEMA.pastColumns.map(c=>[c.key,c.visible]));
  persist();
}

function showMainTab(name){
  ["parser","saved","manual","settings"].forEach(t=>document.getElementById("tab-"+t).style.display = t===name ? "block":"none");
  document.querySelectorAll(".tab").forEach((b,i)=>b.classList.toggle("active",["parser","saved","manual","settings"][i]===name));
  if(name==="saved") renderSaved();
  if(name==="manual") renderManual();
  if(name==="settings") renderSettings();
}

function renderColumnSelector(){
  const area = document.getElementById("columnSelector");
  const cols = [
    ...KEIBA_SCHEMA.horseColumns.map(c=>({...c,type:"horse"})),
    ...KEIBA_SCHEMA.pastColumns.filter(c=>!KEIBA_SCHEMA.horseColumns.some(h=>h.key===c.key)).map(c=>({...c,type:"past"}))
  ];
  area.innerHTML = cols.map(c=>{
    const store = c.type==="horse" ? appState.visibleHorseColumns : appState.visiblePastColumns;
    const checked = store[c.key] !== false;
    return `<label class="colcheck"><input type="checkbox" ${checked?"checked":""} onchange="toggleColumn('${c.type}','${c.key}',this.checked)"> ${escapeHtml(c.label)}</label>`;
  }).join("");
}

function toggleColumn(type,key,checked){
  if(type==="horse") appState.visibleHorseColumns[key]=checked;
  else appState.visiblePastColumns[key]=checked;
  persist();
  renderParsed();
}

function parseInput(){
  const text = document.getElementById("rawInput").value;
  currentParsed = parseKeibaText(text);
  document.getElementById("statSaved").textContent = "未保存";
  renderParsed();
}

function renderParsed(){
  if(!currentParsed) return;
  document.getElementById("statHorseCount").textContent = currentParsed.horses.length;
  document.getElementById("statPastCount").textContent = currentParsed.past_results.length;
  const avg = currentParsed.horses.length ? Math.round(currentParsed.horses.reduce((s,h)=>s+(h.confidence||0),0)/currentParsed.horses.length) : 0;
  document.getElementById("statQuality").innerHTML = avg>=70 ? `<span class="ok">${avg}%</span>` : avg>=40 ? `<span class="warn">${avg}%</span>` : `<span class="bad">${avg}%</span>`;
  renderTable("horseOutput", currentParsed.horses, KEIBA_SCHEMA.horseColumns, appState.visibleHorseColumns);
  renderTable("pastOutput", currentParsed.past_results, KEIBA_SCHEMA.pastColumns, appState.visiblePastColumns);
  document.getElementById("jsonOutput").textContent = JSON.stringify(currentParsed, null, 2);
}

function renderTable(targetId, rows, schema, visibleMap){
  const cols = schema.filter(c=>visibleMap[c.key]!==false);
  if(!rows || !rows.length){ document.getElementById(targetId).innerHTML = `<p class="muted" style="padding:10px;">データなし</p>`; return; }
  document.getElementById(targetId).innerHTML = `<table><thead><tr>${cols.map(c=>`<th>${escapeHtml(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${formatCell(r[c.key])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function formatCell(v){
  if(v===null || v===undefined) return "";
  if(typeof v==="number") return String(v);
  return escapeHtml(String(v)).replace(/\n/g,"<br>");
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function saveParsedRace(){
  if(!currentParsed) parseInput();
  if(!currentParsed || !currentParsed.horses.length){ alert("保存できる解析結果がありません"); return; }
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const name = currentParsed.race.race_name || `解析データ ${new Date().toLocaleString("ja-JP")}`;
  appState.savedRaces.unshift({id,name,createdAt:new Date().toISOString(),data:currentParsed});
  persist();
  document.getElementById("statSaved").textContent = "保存済み";
  alert("保存しました");
}

function renderSaved(){
  const list = document.getElementById("savedList");
  if(!appState.savedRaces.length){ list.innerHTML = `<p class="muted">保存データなし</p>`; document.getElementById("savedDetail").innerHTML = ""; return; }
  if(!selectedSavedId) selectedSavedId = appState.savedRaces[0].id;
  list.innerHTML = appState.savedRaces.map(r=>`
    <div class="item ${r.id===selectedSavedId?"active":""}" onclick="selectedSavedId='${r.id}';renderSaved();">
      <b>${escapeHtml(r.name)}</b><br>
      <span class="muted">${new Date(r.createdAt).toLocaleString("ja-JP")} / ${r.data.horses.length}頭 / 過去走${r.data.past_results.length}</span>
      <div style="margin-top:8px;"><button class="danger" onclick="event.stopPropagation();deleteSaved('${r.id}')">削除</button></div>
    </div>`).join("");
  const item = appState.savedRaces.find(r=>r.id===selectedSavedId);
  if(!item) return;
  document.getElementById("savedDetail").innerHTML = `
    <div class="summary">
      <div class="metric">馬数<b>${item.data.horses.length}</b></div>
      <div class="metric">過去走<b>${item.data.past_results.length}</b></div>
      <div class="metric">Version<b>${item.data.version}</b></div>
      <div class="metric">警告<b>${item.data.parser_meta.warnings.length}</b></div>
    </div>
    <h3>出走馬</h3><div class="table-wrap" id="savedHorseTable"></div>
    <h3>過去走</h3><div class="table-wrap" id="savedPastTable"></div>`;
  renderTable("savedHorseTable", item.data.horses, KEIBA_SCHEMA.horseColumns, appState.visibleHorseColumns);
  renderTable("savedPastTable", item.data.past_results, KEIBA_SCHEMA.pastColumns, appState.visiblePastColumns);
}

function deleteSaved(id){
  if(!confirm("削除しますか？")) return;
  appState.savedRaces = appState.savedRaces.filter(r=>r.id!==id);
  selectedSavedId = appState.savedRaces[0]?.id || null;
  persist(); renderSaved();
}

function addManualHorse(){
  appState.manualHorses.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    horse_name:mHorse.value||null,jockey:mJockey.value||null,assigned_weight:mWeight.value?Number(mWeight.value):null,
    sex_age:mSexAge.value||null,style:mStyle.value||null,note:mMemo.value||null,createdAt:new Date().toISOString()
  });
  ["mHorse","mJockey","mWeight","mSexAge","mStyle","mMemo"].forEach(id=>document.getElementById(id).value="");
  persist(); renderManual();
}
function renderManual(){
  const cols = [{key:"horse_name",label:"馬名"},{key:"jockey",label:"騎手"},{key:"assigned_weight",label:"斤量"},{key:"sex_age",label:"性齢"},{key:"style",label:"脚質"},{key:"note",label:"メモ"}];
  renderTable("manualTable", appState.manualHorses, cols, Object.fromEntries(cols.map(c=>[c.key,true])));
}

function clearInput(){
  document.getElementById("rawInput").value="";
  currentParsed=null;
  document.getElementById("horseOutput").innerHTML="";
  document.getElementById("pastOutput").innerHTML="";
  document.getElementById("jsonOutput").textContent="{}";
  document.getElementById("statHorseCount").textContent="0";
  document.getElementById("statPastCount").textContent="0";
  document.getElementById("statQuality").textContent="-";
  document.getElementById("statSaved").textContent="未保存";
}

function copyJson(){ navigator.clipboard.writeText(document.getElementById("jsonOutput").textContent); alert("JSONをコピーしました"); }
function downloadJson(){
  const blob = new Blob([document.getElementById("jsonOutput").textContent],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="keiba-parsed.json"; a.click(); URL.revokeObjectURL(a.href);
}
function exportAll(){
  const blob=new Blob([JSON.stringify(appState,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="keiba-parser-all-data.json"; a.click(); URL.revokeObjectURL(a.href);
}
function importAll(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{ try{ appState=JSON.parse(reader.result); initColumns(); persist(); renderSaved(); alert("読み込みました"); }catch{ alert("JSON読込に失敗しました"); } };
  reader.readAsText(file);
}
function clearAllData(){ if(confirm("保存データを全削除しますか？")){ appState.savedRaces=[]; appState.manualHorses=[]; persist(); renderSaved(); } }
function renderSettings(){
  document.getElementById("schemaView").textContent=JSON.stringify(KEIBA_SCHEMA,null,2);
  document.getElementById("dictView").textContent=JSON.stringify(NORMALIZE_DICT,null,2);
  document.getElementById("rulesView").textContent=Object.keys(RULES).map(k=>`${k}: ${RULES[k]}`).join("\n");
}
function loadSample(){
  document.getElementById("rawInput").value = `馬名
騎手
斤量
アイサンサン
幸英明
56.0
エリカエクスプレス
武豊
56.0
基本
アイサンサン
橋田 宜長(栗東)
父：
キズナ
母：
ウアジェト
(母の父：シンボリクリスエス)
牝4/青鹿
56.0kg
幸 英明
2026年3月22日 中京
愛知杯
G3
1着 18頭 18番
12番人気
幸 英明 55.0kg
1400芝
1:19.6
良
106
458kg
1 1
3F 34.2
ソルトクィーン(0.0)
エリカエクスプレス
杉山 晴紀(栗東)
父：
エピファネイア
母：
エンタイスド
(母の父：Galileo)
牝4/黒鹿
56.0kg
武 豊
2026年3月7日 中山
中山牝馬S
G3
4着 16頭 13番
4番人気
武 豊 56.0kg
1800芝
1:47.3
稍重
108
472kg
2 3 3 3
3F 35.9
エセルフリーダ(0.2)`;
  parseInput();
}

initColumns();
renderColumnSelector();
renderManual();
renderSettings();

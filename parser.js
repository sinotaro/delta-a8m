
const KEIBA_SCHEMA = {
  horseColumns: [
    { key: "horse_name", label: "馬名", visible: true },
    { key: "frame_no", label: "枠", visible: true },
    { key: "horse_no", label: "馬番", visible: true },
    { key: "jockey", label: "騎手", visible: true },
    { key: "assigned_weight", label: "斤量", visible: true },
    { key: "sex_age", label: "性齢", visible: true },
    { key: "trainer", label: "調教師", visible: true },
    { key: "sire", label: "父", visible: false },
    { key: "dam", label: "母", visible: false },
    { key: "broodmare_sire", label: "母父", visible: false },
    { key: "odds", label: "単勝", visible: true },
    { key: "popularity", label: "人気", visible: true },
    { key: "body_weight", label: "馬体重", visible: true },
    { key: "body_weight_diff", label: "増減", visible: true },
    { key: "note", label: "メモ", visible: true },
    { key: "confidence", label: "信頼度", visible: true }
  ],
  pastColumns: [
    { key: "horse_name", label: "馬名", visible: true },
    { key: "run_index", label: "何走前", visible: true },
    { key: "date", label: "日付", visible: true },
    { key: "course", label: "競馬場", visible: true },
    { key: "race_name", label: "レース名", visible: true },
    { key: "grade", label: "格", visible: true },
    { key: "finish", label: "着順", visible: true },
    { key: "field_size", label: "頭数", visible: true },
    { key: "gate_no", label: "馬番", visible: false },
    { key: "popularity", label: "人気", visible: true },
    { key: "jockey", label: "騎手", visible: true },
    { key: "assigned_weight", label: "斤量", visible: true },
    { key: "surface", label: "芝/ダ", visible: true },
    { key: "distance", label: "距離", visible: true },
    { key: "time", label: "タイム", visible: true },
    { key: "track_condition", label: "馬場", visible: true },
    { key: "rating", label: "指数", visible: true },
    { key: "body_weight", label: "馬体重", visible: false },
    { key: "passing", label: "通過", visible: true },
    { key: "last3f", label: "上がり3F", visible: true },
    { key: "margin_target", label: "相手/着差", visible: true },
    { key: "raw", label: "元ブロック", visible: false }
  ]
};

const NORMALIZE_DICT = {
  grades: {"GⅠ":"G1","ＧⅠ":"G1","GI":"G1","G1":"G1","GⅡ":"G2","ＧⅡ":"G2","GII":"G2","G2":"G2","GⅢ":"G3","ＧⅢ":"G3","GIII":"G3","G3":"G3","リステッド":"L","L":"L","OP":"OP","オープン":"OP","3勝ク":"3勝","2勝ク":"2勝","1勝ク":"1勝"},
  surfaces: {"芝":"芝","ダ":"ダート","ダート":"ダート"},
  conditions: {"良":"良","稍重":"稍重","重":"重","不良":"不良"}
};

const RULES = {
  date: /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/,
  grade: /(GⅠ|ＧⅠ|GⅡ|ＧⅡ|GⅢ|ＧⅢ|GI|GII|GIII|G1|G2|G3|リステッド|OP|オープン|[123]勝ク|[123]勝)/,
  finish: /(\d{1,2})着|除外|中止|取消/,
  fieldGate: /(\d{1,2})頭\s*(?:\s*(\d{1,2})番)?/,
  popularity: /(\d{1,2})番人気/,
  weight: /(\d{2,3}(?:\.\d)?)kg/,
  distanceSurface: /(\d{3,4})(芝|ダ|ダート)|(?:芝|ダ|ダート)(\d{3,4})/,
  time: /(\d{1,2}:\d{2}\.\d)/,
  last3f: /3F\s*(\d{2}\.\d)/i,
  bodyWeight: /(\d{3})kg/,
  rating: /(?:良|稍重|重|不良)\s*(\d{2,3})(?=\s|$)/,
  trainer: /(.+?)\((栗東|美浦)\)/,
  sire: /父：\s*([\s\S]*?)(?=\n母：|\n\()/,
  dam: /母：\s*([\s\S]*?)(?=\n\(母の父：)/,
  broodmareSire: /\(母の父：(.+?)\)/,
  sexAge: /(牡|牝|セ)\d{1,2}\/?[^\s\n]*/,
  oddsPopularity: /(\d+(?:\.\d+)?)\s*(?:倍)?\s*\(?(\d{1,2})番人気\)?/
};

function uuid(){ return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random())); }

function normalizeText(input) {
  let t = (input || "").normalize("NFKC").replace(/\r/g, "\n");
  t = t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").replace(/Ｇ/g, "G");
  t = t.replace(/Ⅰ/g, "I").replace(/Ⅱ/g, "II").replace(/Ⅲ/g, "III");
  t = t.replace(/\bGI\b/g, "G1").replace(/\bGII\b/g, "G2").replace(/\bGIII\b/g, "G3");
  return t.trim();
}

function normalizeGrade(g) {
  if (!g) return null;
  return NORMALIZE_DICT.grades[g] || g.replace("GI","G1").replace("GII","G2").replace("GIII","G3");
}

function normalizeDate(m) {
  if (!m) return null;
  return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
}

function compactLine(line) { return (line || "").trim().replace(/\s+/g, " "); }

function isHorseNameCandidate(line) {
  const ng = /^(基本|メニュー|枠|馬番|馬名|騎手|斤量|前走|前々走|3走前|4走前|単勝|血統|調教師名|ブリンカー着用)$/;
  if (!line || ng.test(line)) return false;
  if (RULES.date.test(line)) return false;
  if (/(父：|母：|kg|頭|番人気|3F|芝|ダート|良|稍重|重|不良)/.test(line)) return false;
  if (/^[0-9.\s]+$/.test(line)) return false;
  return line.length >= 2 && line.length <= 24;
}

function extractTopHorseList(text) {
  const lines = text.split("\n").map(compactLine).filter(Boolean);
  const start = lines.findIndex(l => l === "馬名");
  const horses = [];
  if (start < 0) return horses;
  for (let i = start + 1; i < lines.length - 2; i++) {
    const name = lines[i], jockey = lines[i+1], weight = lines[i+2];
    if (isHorseNameCandidate(name) && /^[^\d]{1,14}$/.test(jockey) && /^\d{2,3}\.\d$/.test(weight)) {
      horses.push({ horse_name:name, jockey, assigned_weight:Number(weight), source:"top_list" });
      i += 2;
    }
  }
  return horses;
}

function splitHorseBlocks(text, knownNames) {
  const lines = text.split("\n").map(compactLine).filter(Boolean);
  const set = new Set(knownNames);
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const header = /^(基本|メニュー|枠|馬番|馬名|騎手|斤量|前走|前々走|3走前|4走前|単勝オッズ|馬体重|性齢)/.test(line);
    if (header) continue;
    const isName = set.has(line) || (knownNames.length === 0 && isHorseNameCandidate(line));
    if (isName) {
      if (current) blocks.push(current);
      current = { horse_name: line, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks.filter(b => b.lines.length >= 2);
}

function parseHorseBlock(block, topInfoMap) {
  const raw = block.lines.join("\n");
  const lines = block.lines.map(compactLine).filter(Boolean);
  const top = topInfoMap[block.horse_name] || {};

  const trainerMatch = raw.match(RULES.trainer);
  const sireMatch = raw.match(RULES.sire);
  const damMatch = raw.match(RULES.dam);
  const bmsMatch = raw.match(RULES.broodmareSire);
  const sexAgeMatch = raw.match(RULES.sexAge);
  const oddsPopMatch = raw.match(RULES.oddsPopularity);

  let assignedWeight = top.assigned_weight || null;
  let jockey = top.jockey || null;

  for (let i = 0; i < Math.min(lines.length, 24); i++) {
    if (!assignedWeight) {
      const w = lines[i].match(/^(\d{2,3}(?:\.\d)?)kg$/);
      if (w) assignedWeight = Number(w[1]);
    }
    if (!jockey && i > 0 && /^\d{2,3}(?:\.\d)?kg$/.test(lines[i])) {
      const prev = lines[i-1];
      if (/^[^\d]{1,14}$/.test(prev) && !/(父：|母：|牝|牡|セ)/.test(prev)) jockey = prev;
    }
  }

  const past_results = parsePastResults(block.horse_name, raw);
  const horse = {
    id: uuid(),
    horse_name: block.horse_name,
    frame_no: null, horse_no: null,
    jockey, assigned_weight,
    sex_age: sexAgeMatch ? sexAgeMatch[0].replace("/", "") : null,
    trainer: trainerMatch ? `${trainerMatch[1].trim()}(${trainerMatch[2]})` : null,
    sire: sireMatch ? sireMatch[1].trim().replace(/\n/g,"") : null,
    dam: damMatch ? damMatch[1].trim().replace(/\n/g,"") : null,
    broodmare_sire: bmsMatch ? bmsMatch[1].trim() : null,
    odds: oddsPopMatch ? Number(oddsPopMatch[1]) : null,
    popularity: oddsPopMatch ? Number(oddsPopMatch[2]) : null,
    body_weight: null, body_weight_diff: null,
    note: /ブリンカー着用/.test(raw) ? "ブリンカー着用" : null,
    confidence: 0
  };
  horse.confidence = calcHorseConfidence(horse, past_results);
  return { horse, past_results };
}

function calcHorseConfidence(horse, past) {
  let pts = 0;
  ["horse_name","jockey","assigned_weight","sex_age","trainer"].forEach(k => { if (horse[k]) pts += 10; });
  if (past.length) pts += Math.min(50, past.length * 12);
  return Math.min(100, pts);
}

function parsePastResults(horseName, raw) {
  const lines = raw.split("\n").map(compactLine).filter(Boolean);
  const dateIndexes = [];
  lines.forEach((l, idx) => { if (RULES.date.test(l)) dateIndexes.push(idx); });
  const results = [];

  dateIndexes.forEach((startIdx, n) => {
    const endIdx = dateIndexes[n+1] ?? lines.length;
    const chunkLines = lines.slice(startIdx, endIdx);
    const chunk = chunkLines.join("\n");
    const dateMatch = chunkLines[0].match(RULES.date);

    let course = null, raceName = null;
    const cLine = chunkLines[1] || "";
    if (/^(東京|中山|京都|阪神|中京|札幌|函館|福島|新潟|小倉|香港)$/.test(cLine)) {
      course = cLine; raceName = chunkLines[2] || null;
    } else {
      const c = chunk.match(/(東京|中山|京都|阪神|中京|札幌|函館|福島|新潟|小倉|香港)/);
      course = c ? c[1] : null;
      raceName = chunkLines.find(l => !RULES.date.test(l) && !/^(東京|中山|京都|阪神|中京|札幌|函館|福島|新潟|小倉|香港)$/.test(l) && !RULES.grade.test(l) && !RULES.finish.test(l)) || null;
    }

    const gradeMatch = chunk.match(RULES.grade);
    const finishMatch = chunk.match(RULES.finish);
    const fieldGateMatch = chunk.match(RULES.fieldGate);
    const popMatch = chunk.match(RULES.popularity);
    const weightMatch = chunk.match(/([^\n\d]{1,14})\s+(\d{2,3}(?:\.\d)?)kg/);
    const ds = chunk.match(RULES.distanceSurface);
    const timeMatch = chunk.match(RULES.time);
    const last3fMatch = chunk.match(RULES.last3f);
    const bodyWeightMatch = chunk.match(RULES.bodyWeight);
    const ratingMatch = chunk.match(RULES.rating);
    const conditionMatch = chunk.match(/(良|稍重|重|不良)/);
    const passingLine = chunkLines.find(l => /^(\d{1,2}\s+){0,5}\d{1,2}$/.test(l));

    results.push({
      id: uuid(),
      horse_name: horseName,
      run_index: n + 1,
      date: normalizeDate(dateMatch),
      course,
      race_name: raceName,
      grade: normalizeGrade(gradeMatch ? gradeMatch[1] : null),
      finish: finishMatch && finishMatch[1] ? Number(finishMatch[1]) : (finishMatch ? finishMatch[0] : null),
      field_size: fieldGateMatch ? Number(fieldGateMatch[1]) : null,
      gate_no: fieldGateMatch && fieldGateMatch[2] ? Number(fieldGateMatch[2]) : null,
      popularity: popMatch ? Number(popMatch[1]) : null,
      jockey: weightMatch ? weightMatch[1].trim() : null,
      assigned_weight: weightMatch ? Number(weightMatch[2]) : null,
      surface: ds ? (NORMALIZE_DICT.surfaces[ds[2]] || ds[2] || null) : null,
      distance: ds ? Number(ds[1] || ds[3]) : null,
      time: timeMatch ? timeMatch[1] : null,
      track_condition: conditionMatch ? conditionMatch[1] : null,
      rating: ratingMatch ? Number(ratingMatch[1]) : null,
      body_weight: bodyWeightMatch ? Number(bodyWeightMatch[1]) : null,
      passing: passingLine ? passingLine.replace(/\s+/g, "-") : null,
      last3f: last3fMatch ? Number(last3fMatch[1]) : null,
      margin_target: chunkLines[chunkLines.length - 1] || null,
      raw: chunk
    });
  });
  return results;
}

function detectRaceInfo(text) {
  const first = text.split("\n").slice(0, 20).join(" ");
  const raceNo = first.match(/(\d{1,2})R/);
  const course = first.match(/(東京|中山|京都|阪神|中京|札幌|函館|福島|新潟|小倉)/);
  return { race_name:null, course:course?course[1]:null, race_no:raceNo?Number(raceNo[1]):null, source_type:"text_paste", parsed_at:new Date().toISOString() };
}

function parseKeibaText(input) {
  const raw_text = input || "";
  const normalized_text = normalizeText(raw_text);
  const race = detectRaceInfo(normalized_text);
  const topList = extractTopHorseList(normalized_text);
  const knownNames = [...new Set(topList.map(h => h.horse_name))];
  const topInfoMap = Object.fromEntries(topList.map(h => [h.horse_name, h]));
  const blocks = splitHorseBlocks(normalized_text, knownNames);

  const horses = [];
  const past_results = [];
  for (const block of blocks) {
    const parsed = parseHorseBlock(block, topInfoMap);
    if (!horses.some(h => h.horse_name === parsed.horse.horse_name)) {
      horses.push(parsed.horse);
      past_results.push(...parsed.past_results);
    }
  }
  for (const top of topList) {
    if (!horses.some(h => h.horse_name === top.horse_name)) {
      horses.push({
        id: uuid(), horse_name: top.horse_name, frame_no:null, horse_no:null,
        jockey: top.jockey, assigned_weight: top.assigned_weight, sex_age:null, trainer:null,
        sire:null, dam:null, broodmare_sire:null, odds:null, popularity:null,
        body_weight:null, body_weight_diff:null, note:null, confidence:35
      });
    }
  }

  return {
    version:"2.0.0",
    raw_text,
    normalized_text,
    race,
    horses,
    past_results,
    parser_meta:{
      engine:"local-js-regex-hybrid",
      horse_count:horses.length,
      past_result_count:past_results.length,
      warnings: buildWarnings(horses, past_results)
    }
  };
}

function buildWarnings(horses, past) {
  const warnings = [];
  if (!horses.length) warnings.push("馬名を検出できませんでした。");
  const low = horses.filter(h => (h.confidence || 0) < 40);
  if (low.length) warnings.push(`信頼度40未満の馬が${low.length}件あります。`);
  if (!past.length) warnings.push("過去走を検出できませんでした。");
  return warnings;
}

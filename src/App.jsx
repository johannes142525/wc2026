import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// ─── グループ定義 ────────────────────────────────────────────────
const GROUPS = {
  A: ["🇲🇽 メキシコ","🇰🇷 韓国","🇿🇦 南アフリカ","🇨🇿 チェコ"],
  B: ["🇨🇦 カナダ","🇧🇦 ボスニア","🇶🇦 カタール","🇨🇭 スイス"],
  C: ["🇧🇷 ブラジル","🇲🇦 モロッコ","🏴󠁧󠁢󠁳󠁣󠁴󠁿 スコットランド","🇭🇹 ハイチ"],
  D: ["🇺🇸 アメリカ","🇵🇾 パラグアイ","🇦🇺 オーストラリア","🇹🇷 トルコ"],
  E: ["🇩🇪 ドイツ","🇨🇼 キュラソー","🇨🇮 コートジボワール","🇪🇨 エクアドル"],
  F: ["🇳🇱 オランダ","🇯🇵 日本","🇸🇪 スウェーデン","🇹🇳 チュニジア"],
  G: ["🇧🇪 ベルギー","🇮🇷 イラン","🇪🇬 エジプト","🇳🇿 ニュージーランド"],
  H: ["🇪🇸 スペイン","🇺🇾 ウルグアイ","🇸🇦 サウジアラビア","🇨🇻 カーボベルデ"],
  I: ["🇫🇷 フランス","🇸🇳 セネガル","🇳🇴 ノルウェー","🇮🇶 イラク"],
  J: ["🇦🇷 アルゼンチン","🇦🇹 オーストリア","🇩🇿 アルジェリア","🇯🇴 ヨルダン"],
  K: ["🇵🇹 ポルトガル","🇨🇴 コロンビア","🇺🇿 ウズベキスタン","🇨🇩 DRコンゴ"],
  L: ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 イングランド","🇭🇷 クロアチア","🇵🇦 パナマ","🇬🇭 ガーナ"],
};

// チーム→組のマップ（スコア入力時に順位表を更新するため）
const TEAM_GROUP = {};
Object.entries(GROUPS).forEach(([g, teams]) => teams.forEach(t => { TEAM_GROUP[t] = g; }));

function makeInitialStats(teams) {
  return teams.map(name => ({ name, w:0, d:0, l:0, gf:0, ga:0 }));
}

// ─── 決勝T構造 ───────────────────────────────────────────────────
const R32_SLOTS = [
  { match:73, home:"A2", away:"B2",        date:"2026-06-29", time:"04:00", tv:[] },
  { match:76, home:"C1", away:"F2",        date:"2026-06-30", time:"02:00", tv:[] },
  { match:74, home:"E1", away:"3rd_ABCDF", date:"2026-06-30", time:"05:30", tv:[] },
  { match:75, home:"F1", away:"C2",        date:"2026-06-30", time:"10:00", tv:[] },
  { match:78, home:"E2", away:"I2",        date:"2026-07-01", time:"02:00", tv:["日本テレビ"] },
  { match:77, home:"I1", away:"3rd_CDFGH", date:"2026-07-01", time:"06:00", tv:[] },
  { match:79, home:"A1", away:"3rd_CEFHI", date:"2026-07-01", time:"10:00", tv:[] },
  { match:80, home:"L1", away:"3rd_EHIJK", date:"2026-07-02", time:"01:00", tv:[] },
  { match:82, home:"G1", away:"3rd_AEHIJ", date:"2026-07-02", time:"05:00", tv:[] },
  { match:81, home:"D1", away:"3rd_BEFIJ", date:"2026-07-02", time:"09:00", tv:[] },
  { match:84, home:"H1", away:"J2",        date:"2026-07-03", time:"04:00", tv:[] },
  { match:83, home:"K2", away:"L2",        date:"2026-07-03", time:"08:00", tv:["日本テレビ"] },
  { match:85, home:"B1", away:"3rd_EFGIJ", date:"2026-07-03", time:"12:00", tv:[] },
  { match:88, home:"D2", away:"G2",        date:"2026-07-04", time:"03:00", tv:[] },
  { match:86, home:"J1", away:"H2",        date:"2026-07-04", time:"07:00", tv:["日本テレビ"] },
  { match:87, home:"K1", away:"3rd_DEIJL", date:"2026-07-04", time:"10:30", tv:[] },
];
const R16_SLOTS = [
  { match:89,  home:"W73", away:"W75", date:"2026-07-05", time:"02:00", tv:[] },
  { match:90,  home:"W74", away:"W77", date:"2026-07-05", time:"06:00", tv:["日本テレビ"] },
  { match:91,  home:"W76", away:"W78", date:"2026-07-06", time:"05:00", tv:[] },
  { match:92,  home:"W79", away:"W80", date:"2026-07-06", time:"09:00", tv:[] },
  { match:93,  home:"W83", away:"W84", date:"2026-07-07", time:"04:00", tv:["日本テレビ"] },
  { match:94,  home:"W81", away:"W82", date:"2026-07-07", time:"09:00", tv:[] },
  { match:95,  home:"W86", away:"W88", date:"2026-07-08", time:"01:00", tv:[] },
  { match:96,  home:"W85", away:"W87", date:"2026-07-08", time:"05:00", tv:[] },
];
const QF_SLOTS = [
  { match:105, home:"W89",  away:"W90",  date:"2026-07-10", time:"05:00", tv:[] },
  { match:106, home:"W93",  away:"W94",  date:"2026-07-11", time:"04:00", tv:[] },
  { match:107, home:"W91",  away:"W92",  date:"2026-07-12", time:"06:00", tv:[] },
  { match:108, home:"W95",  away:"W96",  date:"2026-07-12", time:"10:00", tv:[] },
];
const SF_SLOTS = [
  { match:109, home:"W105", away:"W106", date:"2026-07-15", time:"04:00", tv:[] },
  { match:110, home:"W107", away:"W108", date:"2026-07-16", time:"04:00", tv:[] },
];
const FIN_SLOTS = [
  { match:111, home:"—", away:"—", label:"3位決定戦", date:"2026-07-19", time:"06:00", tv:["NHK"] },
  { match:112, home:"—", away:"—", label:"決勝",      date:"2026-07-20", time:"04:00", tv:["NHK"] },
];

// ─── グループステージ試合リスト ───────────────────────────────────
const GROUP_MATCHES = [
  { id:"g001", date:"2026-06-12",time:"04:00",home:"🇲🇽 メキシコ",away:"🇿🇦 南アフリカ",group:"A組1節",tv:["NHK"] },
  { id:"g002", date:"2026-06-12",time:"11:00",home:"🇰🇷 韓国",away:"🇨🇿 チェコ",group:"A組1節",tv:[] },
  { id:"g003", date:"2026-06-13",time:"04:00",home:"🇨🇦 カナダ",away:"🇧🇦 ボスニア",group:"B組1節",tv:["NHK"] },
  { id:"g004", date:"2026-06-13",time:"10:00",home:"🇺🇸 アメリカ",away:"🇵🇾 パラグアイ",group:"D組1節",tv:[] },
  { id:"g005", date:"2026-06-14",time:"04:00",home:"🇶🇦 カタール",away:"🇨🇭 スイス",group:"B組1節",tv:[] },
  { id:"g006", date:"2026-06-14",time:"07:00",home:"🇧🇷 ブラジル",away:"🇲🇦 モロッコ",group:"C組1節",tv:[] },
  { id:"g007", date:"2026-06-14",time:"10:00",home:"🏴󠁧󠁢󠁳󠁣󠁴󠁿 スコットランド",away:"🇭🇹 ハイチ",group:"C組1節",tv:["NHK"] },
  { id:"g008", date:"2026-06-14",time:"13:00",home:"🇦🇺 オーストラリア",away:"🇹🇷 トルコ",group:"D組1節",tv:["日本テレビ"] },
  { id:"g009", date:"2026-06-15",time:"02:00",home:"🇩🇪 ドイツ",away:"🇨🇼 キュラソー",group:"E組1節",tv:[] },
  { id:"g010", date:"2026-06-15",time:"05:00",home:"🇳🇱 オランダ",away:"🇯🇵 日本",group:"F組1節",tv:["NHK"],japan:true },
  { id:"g011", date:"2026-06-15",time:"08:00",home:"🇨🇮 コートジボワール",away:"🇪🇨 エクアドル",group:"E組1節",tv:[] },
  { id:"g012", date:"2026-06-15",time:"11:00",home:"🇸🇪 スウェーデン",away:"🇹🇳 チュニジア",group:"F組1節",tv:["日本テレビ"] },
  { id:"g013", date:"2026-06-16",time:"01:00",home:"🇪🇸 スペイン",away:"🇨🇻 カーボベルデ",group:"H組1節",tv:["NHK"] },
  { id:"g014", date:"2026-06-16",time:"04:00",home:"🇧🇪 ベルギー",away:"🇪🇬 エジプト",group:"G組1節",tv:["NHK"] },
  { id:"g015", date:"2026-06-16",time:"07:00",home:"🇸🇦 サウジアラビア",away:"🇺🇾 ウルグアイ",group:"H組1節",tv:[] },
  { id:"g016", date:"2026-06-16",time:"10:00",home:"🇮🇷 イラン",away:"🇳🇿 ニュージーランド",group:"G組1節",tv:[] },
  { id:"g017", date:"2026-06-17",time:"04:00",home:"🇫🇷 フランス",away:"🇸🇳 セネガル",group:"I組1節",tv:["フジテレビ"] },
  { id:"g018", date:"2026-06-17",time:"07:00",home:"🇮🇶 イラク",away:"🇳🇴 ノルウェー",group:"I組1節",tv:[] },
  { id:"g019", date:"2026-06-17",time:"10:00",home:"🇦🇷 アルゼンチン",away:"🇩🇿 アルジェリア",group:"J組1節",tv:["NHK"] },
  { id:"g020", date:"2026-06-17",time:"13:00",home:"🇦🇹 オーストリア",away:"🇯🇴 ヨルダン",group:"J組1節",tv:[] },
  { id:"g021", date:"2026-06-18",time:"02:00",home:"🇵🇹 ポルトガル",away:"🇨🇩 DRコンゴ",group:"K組1節",tv:["フジテレビ"] },
  { id:"g022", date:"2026-06-18",time:"05:00",home:"🏴󠁧󠁢󠁥󠁮󠁧󠁿 イングランド",away:"🇭🇷 クロアチア",group:"L組1節",tv:[] },
  { id:"g023", date:"2026-06-18",time:"08:00",home:"🇬🇭 ガーナ",away:"🇵🇦 パナマ",group:"L組1節",tv:[] },
  { id:"g024", date:"2026-06-18",time:"11:00",home:"🇺🇿 ウズベキスタン",away:"🇨🇴 コロンビア",group:"K組1節",tv:[] },
  { id:"g025", date:"2026-06-19",time:"01:00",home:"🇨🇿 チェコ",away:"🇿🇦 南アフリカ",group:"A組2節",tv:["日本テレビ"] },
  { id:"g026", date:"2026-06-19",time:"04:00",home:"🇨🇭 スイス",away:"🇧🇦 ボスニア",group:"B組2節",tv:[] },
  { id:"g027", date:"2026-06-19",time:"07:00",home:"🇨🇦 カナダ",away:"🇶🇦 カタール",group:"B組2節",tv:[] },
  { id:"g028", date:"2026-06-19",time:"10:00",home:"🇲🇽 メキシコ",away:"🇰🇷 韓国",group:"A組2節",tv:["NHK"] },
  { id:"g029", date:"2026-06-20",time:"04:00",home:"🇺🇸 アメリカ",away:"🇦🇺 オーストラリア",group:"D組2節",tv:["NHK"] },
  { id:"g030", date:"2026-06-20",time:"07:00",home:"🏴󠁧󠁢󠁳󠁣󠁴󠁿 スコットランド",away:"🇲🇦 モロッコ",group:"C組2節",tv:["フジテレビ"] },
  { id:"g031", date:"2026-06-20",time:"09:30",home:"🇧🇷 ブラジル",away:"🇭🇹 ハイチ",group:"C組2節",tv:["NHK"] },
  { id:"g032", date:"2026-06-20",time:"12:00",home:"🇹🇷 トルコ",away:"🇵🇾 パラグアイ",group:"D組2節",tv:[] },
  { id:"g033", date:"2026-06-21",time:"02:00",home:"🇳🇱 オランダ",away:"🇸🇪 スウェーデン",group:"F組2節",tv:["NHK"] },
  { id:"g034", date:"2026-06-21",time:"05:00",home:"🇩🇪 ドイツ",away:"🇨🇮 コートジボワール",group:"E組2節",tv:["日本テレビ"] },
  { id:"g035", date:"2026-06-21",time:"09:00",home:"🇪🇨 エクアドル",away:"🇨🇼 キュラソー",group:"E組2節",tv:[] },
  { id:"g036", date:"2026-06-21",time:"13:00",home:"🇹🇳 チュニジア",away:"🇯🇵 日本",group:"F組2節",tv:["日本テレビ","NHK BS"],japan:true },
  { id:"g037", date:"2026-06-22",time:"01:00",home:"🇪🇸 スペイン",away:"🇸🇦 サウジアラビア",group:"H組2節",tv:["NHK"] },
  { id:"g038", date:"2026-06-22",time:"04:00",home:"🇧🇪 ベルギー",away:"🇮🇷 イラン",group:"G組2節",tv:[] },
  { id:"g039", date:"2026-06-22",time:"07:00",home:"🇺🇾 ウルグアイ",away:"🇨🇻 カーボベルデ",group:"H組2節",tv:[] },
  { id:"g040", date:"2026-06-22",time:"10:00",home:"🇳🇿 ニュージーランド",away:"🇪🇬 エジプト",group:"G組2節",tv:[] },
  { id:"g041", date:"2026-06-23",time:"02:00",home:"🇦🇷 アルゼンチン",away:"🇦🇹 オーストリア",group:"J組2節",tv:[] },
  { id:"g042", date:"2026-06-23",time:"06:00",home:"🇫🇷 フランス",away:"🇮🇶 イラク",group:"I組2節",tv:[] },
  { id:"g043", date:"2026-06-23",time:"09:00",home:"🇳🇴 ノルウェー",away:"🇸🇳 セネガル",group:"I組2節",tv:["NHK"] },
  { id:"g044", date:"2026-06-23",time:"12:00",home:"🇯🇴 ヨルダン",away:"🇩🇿 アルジェリア",group:"J組2節",tv:[] },
  { id:"g045", date:"2026-06-24",time:"02:00",home:"🇵🇹 ポルトガル",away:"🇺🇿 ウズベキスタン",group:"K組2節",tv:["NHK"] },
  { id:"g046", date:"2026-06-24",time:"05:00",home:"🏴󠁧󠁢󠁥󠁮󠁧󠁿 イングランド",away:"🇬🇭 ガーナ",group:"L組2節",tv:[] },
  { id:"g047", date:"2026-06-24",time:"08:00",home:"🇵🇦 パナマ",away:"🇭🇷 クロアチア",group:"L組2節",tv:["フジテレビ"] },
  { id:"g048", date:"2026-06-24",time:"11:00",home:"🇨🇴 コロンビア",away:"🇨🇩 DRコンゴ",group:"K組2節",tv:["日本テレビ"] },
  { id:"g049", date:"2026-06-25",time:"04:00",home:"🇨🇭 スイス",away:"🇨🇦 カナダ",group:"B組3節",tv:["NHK"] },
  { id:"g050", date:"2026-06-25",time:"04:00",home:"🇧🇦 ボスニア",away:"🇶🇦 カタール",group:"B組3節",tv:[] },
  { id:"g051", date:"2026-06-25",time:"07:00",home:"🏴󠁧󠁢󠁳󠁣󠁴󠁿 スコットランド",away:"🇧🇷 ブラジル",group:"C組3節",tv:[] },
  { id:"g052", date:"2026-06-25",time:"07:00",home:"🇲🇦 モロッコ",away:"🇭🇹 ハイチ",group:"C組3節",tv:[] },
  { id:"g053", date:"2026-06-25",time:"10:00",home:"🇨🇿 チェコ",away:"🇲🇽 メキシコ",group:"A組3節",tv:["NHK"] },
  { id:"g054", date:"2026-06-25",time:"10:00",home:"🇿🇦 南アフリカ",away:"🇰🇷 韓国",group:"A組3節",tv:[] },
  { id:"g055", date:"2026-06-26",time:"05:00",home:"🇨🇼 キュラソー",away:"🇨🇮 コートジボワール",group:"E組3節",tv:[] },
  { id:"g056", date:"2026-06-26",time:"05:00",home:"🇪🇨 エクアドル",away:"🇩🇪 ドイツ",group:"E組3節",tv:[] },
  { id:"g057", date:"2026-06-26",time:"08:00",home:"🇯🇵 日本",away:"🇸🇪 スウェーデン",group:"F組3節",tv:["NHK"],japan:true },
  { id:"g058", date:"2026-06-26",time:"08:00",home:"🇹🇳 チュニジア",away:"🇳🇱 オランダ",group:"F組3節",tv:[] },
  { id:"g059", date:"2026-06-26",time:"11:00",home:"🇹🇷 トルコ",away:"🇺🇸 アメリカ",group:"D組3節",tv:["日本テレビ"] },
  { id:"g060", date:"2026-06-26",time:"11:00",home:"🇵🇾 パラグアイ",away:"🇦🇺 オーストラリア",group:"D組3節",tv:[] },
  { id:"g061", date:"2026-06-27",time:"04:00",home:"🇳🇴 ノルウェー",away:"🇫🇷 フランス",group:"I組3節",tv:["NHK"] },
  { id:"g062", date:"2026-06-27",time:"04:00",home:"🇸🇳 セネガル",away:"🇮🇶 イラク",group:"I組3節",tv:[] },
  { id:"g063", date:"2026-06-27",time:"09:00",home:"🇨🇻 カーボベルデ",away:"🇸🇦 サウジアラビア",group:"H組3節",tv:[] },
  { id:"g064", date:"2026-06-27",time:"09:00",home:"🇺🇾 ウルグアイ",away:"🇪🇸 スペイン",group:"H組3節",tv:["日本テレビ"] },
  { id:"g065", date:"2026-06-27",time:"12:00",home:"🇪🇬 エジプト",away:"🇮🇷 イラン",group:"G組3節",tv:[] },
  { id:"g066", date:"2026-06-27",time:"12:00",home:"🇳🇿 ニュージーランド",away:"🇧🇪 ベルギー",group:"G組3節",tv:["日本テレビ"] },
  { id:"g067", date:"2026-06-28",time:"06:00",home:"🇵🇦 パナマ",away:"🏴󠁧󠁢󠁥󠁮󠁧󠁿 イングランド",group:"L組3節",tv:[] },
  { id:"g068", date:"2026-06-28",time:"06:00",home:"🇭🇷 クロアチア",away:"🇬🇭 ガーナ",group:"L組3節",tv:[] },
  { id:"g069", date:"2026-06-28",time:"08:30",home:"🇨🇴 コロンビア",away:"🇵🇹 ポルトガル",group:"K組3節",tv:["フジテレビ"] },
  { id:"g070", date:"2026-06-28",time:"08:30",home:"🇨🇩 DRコンゴ",away:"🇺🇿 ウズベキスタン",group:"K組3節",tv:[] },
  { id:"g071", date:"2026-06-28",time:"11:00",home:"🇩🇿 アルジェリア",away:"🇦🇹 オーストリア",group:"J組3節",tv:[] },
  { id:"g072", date:"2026-06-28",time:"11:00",home:"🇯🇴 ヨルダン",away:"🇦🇷 アルゼンチン",group:"J組3節",tv:["NHK"] },
];

// ─── ユーティリティ ───────────────────────────────────────────────
const TV_COLOR = {"NHK":"#4a7c59","日本テレビ":"#c0392b","フジテレビ":"#2980b9","NHK BS":"#6b4c9a"};
const DAY = ["日","月","火","水","木","金","土"];

function jstDisp(date, time) {
  const h = parseInt(time);
  return h < 3 ? `${24+h}:${time.slice(3)}` : time;
}
function koDate(date, time) {
  const h = parseInt(time);
  if (h < 3) {
    const d = new Date(date); d.setDate(d.getDate()-1);
    return new Date(`${d.toISOString().slice(0,10)}T${time}:00+09:00`);
  }
  return new Date(`${date}T${time}:00+09:00`);
}
function dispDate(date, time) {
  const h = parseInt(time);
  if (h < 3) { const d=new Date(date); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); }
  return date;
}
function fmtDate(s) {
  const d = new Date(s+"T00:00:00+09:00");
  return `${d.getMonth()+1}/${d.getDate()}（${DAY[d.getDay()]}）`;
}
function todayJST() {
  const d = new Date();
  return new Date(d.getTime() + 9*60*60*1000).toISOString().slice(0,10);
}
function resolveSlot(k) {
  const m={A1:"A組1位",A2:"A組2位",B1:"B組1位",B2:"B組2位",C1:"C組1位",C2:"C組2位",
    D1:"D組1位",D2:"D組2位",E1:"E組1位",E2:"E組2位",F1:"F組1位",F2:"F組2位",
    G1:"G組1位",G2:"G組2位",H1:"H組1位",H2:"H組2位",I1:"I組1位",I2:"I組2位",
    J1:"J組1位",J2:"J組2位",K1:"K組1位",K2:"K組2位",L1:"L組1位",L2:"L組2位"};
  return m[k]||k;
}

// ─── 小コンポーネント ─────────────────────────────────────────────
function TVBadge({s}) {
  return <span style={{background:TV_COLOR[s]||"#555",color:"#fff",fontSize:"0.62rem",
    fontWeight:700,padding:"1px 5px",borderRadius:3,marginRight:2,whiteSpace:"nowrap"}}>{s}</span>;
}



// ─── 順位表コンポーネント ─────────────────────────────────────────
function GroupTable({groupKey, stats}) {
  const rows = GROUPS[groupKey].map((name,i) => {
    const s = stats[i];
    const pts = s.w*3 + s.d;
    const gd  = s.gf - s.ga;
    return { name, ...s, pts, gd, played: s.w+s.d+s.l };
  }).sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);

  return (
    <div style={{background:"#161b22",border:"1px solid #21262d",borderRadius:8,
      marginBottom:10,overflow:"hidden"}}>
      <div style={{background:"#21262d",padding:"5px 10px",fontSize:"0.76rem",
        fontWeight:800,color:"#8b949e",letterSpacing:"0.05em"}}>{groupKey}組</div>
      {/* ヘッダ: 順位 | チーム名 | 勝点 試 勝 分 負 差 */}
      <div style={{display:"grid",gridTemplateColumns:"14px 1fr 30px 22px 20px 20px 20px 28px",
        gap:"0 3px",padding:"3px 10px 2px",alignItems:"center"}}>
        {["","","勝点","試","勝","分","負","差"].map((h,i)=>(
          <span key={i} style={{fontSize:"0.62rem",color:"#8b949e",textAlign:"right"}}>{h}</span>
        ))}
      </div>
      {rows.map((t,i) => {
        const rank = i+1;
        const rankColor = rank<=2?"#2ea043":rank===3?"#f0883e":"#6e7681";
        const isJapan = t.name.includes("日本");
        const gdStr = t.gd > 0 ? `+${t.gd}` : `${t.gd}`;
        return (
          <div key={t.name} style={{display:"grid",
            gridTemplateColumns:"14px 1fr 30px 22px 20px 20px 20px 28px",
            gap:"0 3px",padding:"5px 10px",alignItems:"center",
            borderTop:"1px solid #21262d",
            background:isJapan?"rgba(31,111,235,0.08)":"transparent"}}>
            {/* 順位バッジ */}
            <span style={{fontSize:"0.68rem",fontWeight:800,color:rankColor,textAlign:"center"}}>{rank}</span>
            {/* チーム名 */}
            <span style={{fontSize:"0.8rem",fontWeight:isJapan?700:400,
              color:isJapan?"#79c0ff":"#e6edf3",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
            {/* 勝点（強調） */}
            <span style={{fontFamily:"monospace",fontSize:"0.88rem",fontWeight:800,textAlign:"right",
              color:rank<=2?"#2ea043":rank===3?"#f0883e":"#8b949e"}}>{t.pts}</span>
            {/* 試 勝 分 負 */}
            {[t.played, t.w, t.d, t.l].map((v,ci) => (
              <span key={ci} style={{fontFamily:"monospace",fontSize:"0.76rem",
                color:"#8b949e",textAlign:"right"}}>{v}</span>
            ))}
            {/* 得失点差 */}
            <span style={{fontFamily:"monospace",fontSize:"0.76rem",fontWeight:700,textAlign:"right",
              color:t.gd>0?"#2ea043":t.gd<0?"#f85149":"#8b949e"}}>{gdStr}</span>
          </div>
        );
      })}
      <div style={{padding:"3px 10px 5px",display:"flex",gap:10}}>
        <span style={{fontSize:"0.6rem",color:"#2ea043"}}>■1〜2位:直接進出</span>
        <span style={{fontSize:"0.6rem",color:"#f0883e"}}>■3位:3位争い</span>
        <span style={{fontSize:"0.6rem",color:"#6e7681"}}>■4位:敗退</span>
      </div>
    </div>
  );
}

// ─── 試合カード（スコア自動取得・ネタバレ防止対応） ──────────────
function MatchRow({m, now, scores, spoiler}) {
  const ko  = koDate(m.date, m.time);
  const end = new Date(ko.getTime()+110*60*1000);
  const live = now>=ko && now<=end;
  const past = now>end;
  const sc = scores[m.id];
  const hasScore = sc && sc.h!=null && sc.a!=null;
  // ネタバレ防止ON＋終了試合 → タップで解除
  const [revealed, setRevealed] = useState(false);
  const hidden = spoiler && past && !live;

  return (
    <div style={{background:m.japan?"linear-gradient(135deg,#1a1f2e,#161b22)":"#161b22",
      border:`1px solid ${live?"#f0883e":m.japan?"#1f6feb":"#21262d"}`,
      borderRadius:8,padding:"8px 10px",marginBottom:5,opacity:past&&!hasScore?0.5:1}}>
      {/* 1行目：時刻・チーム名・スコア */}
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontFamily:"monospace",fontSize:"0.95rem",fontWeight:800,
          flexShrink:0,minWidth:44,
          color:live?"#f0883e":past?"#8b949e":"#e6edf3"}}>
          {jstDisp(m.date,m.time)}
        </span>
        {live&&<span style={{background:"#f0883e",color:"#fff",fontSize:"0.58rem",
          fontWeight:800,padding:"1px 4px",borderRadius:3,flexShrink:0}}>LIVE</span>}

        <span style={{fontSize:"0.82rem",fontWeight:700,flex:1,
          color:m.japan?"#79c0ff":"#e6edf3",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right"}}>
          {m.home}
        </span>

        {/* スコア表示部 */}
        <div style={{flexShrink:0,minWidth:52,textAlign:"center"}}>
          {hasScore ? (
            hidden && !revealed ? (
              <button onClick={()=>setRevealed(true)} style={{
                background:"#21262d",border:"1px solid #30363d",borderRadius:4,
                color:"#8b949e",fontSize:"0.62rem",padding:"2px 6px",cursor:"pointer"}}>
                終了 👁
              </button>
            ) : (
              <span style={{fontFamily:"monospace",fontSize:"1rem",fontWeight:800,
                color:live?"#f0883e":"#e6edf3",letterSpacing:1}}>
                {sc.h} - {sc.a}
              </span>
            )
          ) : (
            <span style={{color:"#8b949e",fontSize:"0.8rem"}}>vs</span>
          )}
        </div>

        <span style={{fontSize:"0.82rem",fontWeight:700,flex:1,
          color:m.japan?"#79c0ff":"#e6edf3",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {m.away}
        </span>
      </div>

      {/* 2行目：組・放送 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:3}}>
        <span style={{fontSize:"0.66rem",color:"#8b949e"}}>{m.groupLabel||m.group}</span>
        <div style={{display:"flex",gap:2}}>
          {m.tv&&m.tv.length>0?m.tv.map(t=><TVBadge key={t} s={t}/>)
            :<span style={{fontSize:"0.62rem",color:"#8b949e"}}>DAZN</span>}
        </div>
      </div>
      {m.thirdNote&&<div style={{fontSize:"0.62rem",color:"#e6af00",marginTop:2}}>
        🃏 3位通過枠：{m.thirdNote}</div>}
    </div>
  );
}

// ─── 決勝T行 ─────────────────────────────────────────────────────
function BracketRow({s, now}) {
  const isThird = s.away&&s.away.startsWith("3rd_");
  const thirdGs = isThird ? s.away.replace("3rd_","").split("").join("・") : null;
  const homeL   = resolveSlot(s.home||"—");
  const awayL   = isThird ? "3位通過枠" : resolveSlot(s.away||"TBD");
  const td  = dispDate(s.date,s.time);
  const ko  = koDate(s.date,s.time);
  const end = new Date(ko.getTime()+110*60*1000);
  const live=now>=ko&&now<=end, past=now>end;
  return (
    <div style={{backgrou

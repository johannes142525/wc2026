import { useState, useMemo } from "react";

// ─── グループ定義（チーム名・初期stats） ─────────────────────────
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

// 初期stats（全0、大会開幕後に試合結果から更新できる構造）
function makeInitialStats(teams) {
  return teams.map(name => ({ name, w:0, d:0, l:0, gf:0, ga:0 }));
}

const R32_SLOTS = [
  { match:73, home:"A2", away:"B2",         date:"2026-06-29", time:"04:00", tv:[] },
  { match:76, home:"C1", away:"F2",         date:"2026-06-30", time:"02:00", tv:[] },
  { match:74, home:"E1", away:"3rd_ABCDF",  date:"2026-06-30", time:"05:30", tv:[] },
  { match:75, home:"F1", away:"C2",         date:"2026-06-30", time:"10:00", tv:[] },
  { match:78, home:"E2", away:"I2",         date:"2026-07-01", time:"02:00", tv:["日本テレビ"] },
  { match:77, home:"I1", away:"3rd_CDFGH",  date:"2026-07-01", time:"06:00", tv:[] },
  { match:79, home:"A1", away:"3rd_CEFHI",  date:"2026-07-01", time:"10:00", tv:[] },
  { match:80, home:"L1", away:"3rd_EHIJK",  date:"2026-07-02", time:"01:00", tv:[] },
  { match:82, home:"G1", away:"3rd_AEHIJ",  date:"2026-07-02", time:"05:00", tv:[] },
  { match:81, home:"D1", away:"3rd_BEFIJ",  date:"2026-07-02", time:"09:00", tv:[] },
  { match:84, home:"H1", away:"J2",         date:"2026-07-03", time:"04:00", tv:[] },
  { match:83, home:"K2", away:"L2",         date:"2026-07-03", time:"08:00", tv:["日本テレビ"] },
  { match:85, home:"B1", away:"3rd_EFGIJ",  date:"2026-07-03", time:"12:00", tv:[] },
  { match:88, home:"D2", away:"G2",         date:"2026-07-04", time:"03:00", tv:[] },
  { match:86, home:"J1", away:"H2",         date:"2026-07-04", time:"07:00", tv:["日本テレビ"] },
  { match:87, home:"K1", away:"3rd_DEIJL",  date:"2026-07-04", time:"10:30", tv:[] },
];
const R16_SLOTS = [
  { match:89, home:"W73", away:"W75", date:"2026-07-05", time:"02:00", tv:[] },
  { match:90, home:"W74", away:"W77", date:"2026-07-05", time:"06:00", tv:["日本テレビ"] },
  { match:91, home:"W76", away:"W78", date:"2026-07-06", time:"05:00", tv:[] },
  { match:92, home:"W79", away:"W80", date:"2026-07-06", time:"09:00", tv:[] },
  { match:93, home:"W83", away:"W84", date:"2026-07-07", time:"04:00", tv:["日本テレビ"] },
  { match:94, home:"W81", away:"W82", date:"2026-07-07", time:"09:00", tv:[] },
  { match:95, home:"W86", away:"W88", date:"2026-07-08", time:"01:00", tv:[] },
  { match:96, home:"W85", away:"W87", date:"2026-07-08", time:"05:00", tv:[] },
];
const QF_SLOTS  = [
  { match:105, home:"W89", away:"W90", date:"2026-07-10", time:"05:00", tv:[] },
  { match:106, home:"W93", away:"W94", date:"2026-07-11", time:"04:00", tv:[] },
  { match:107, home:"W91", away:"W92", date:"2026-07-12", time:"06:00", tv:[] },
  { match:108, home:"W95", away:"W96", date:"2026-07-12", time:"10:00", tv:[] },
];
const SF_SLOTS  = [
  { match:109, home:"W105", away:"W106", date:"2026-07-15", time:"04:00", tv:[] },
  { match:110, home:"W107", away:"W108", date:"2026-07-16", time:"04:00", tv:[] },
];
const FIN_SLOTS = [
  { match:111, home:"3位決定戦A", away:"3位決定戦B", label:"3位決定戦", date:"2026-07-19", time:"06:00", tv:["NHK"] },
  { match:112, home:"決勝A",      away:"決勝B",      label:"決勝",      date:"2026-07-20", time:"04:00", tv:["NHK"] },
];

const GROUP_MATCHES = [
  { date:"2026-06-12",time:"04:00",home:"🇲🇽 メキシコ",away:"🇿🇦 南アフリカ",group:"A組1節",tv:["NHK"] },
  { date:"2026-06-12",time:"11:00",home:"🇰🇷 韓国",away:"🇨🇿 チェコ",group:"A組1節",tv:[] },
  { date:"2026-06-13",time:"04:00",home:"🇨🇦 カナダ",away:"🇧🇦 ボスニア",group:"B組1節",tv:["NHK"] },
  { date:"2026-06-13",time:"10:00",home:"🇺🇸 アメリカ",away:"🇵🇾 パラグアイ",group:"D組1節",tv:[] },
  { date:"2026-06-14",time:"04:00",home:"🇶🇦 カタール",away:"🇨🇭 スイス",group:"B組1節",tv:[] },
  { date:"2026-06-14",time:"07:00",home:"🇧🇷 ブラジル",away:"🇲🇦 モロッコ",group:"C組1節",tv:[] },
  { date:"2026-06-14",time:"10:00",home:"🏴󠁧󠁢󠁳󠁣󠁴󠁿 スコットランド",away:"🇭🇹 ハイチ",group:"C組1節",tv:["NHK"] },
  { date:"2026-06-14",time:"13:00",home:"🇦🇺 オーストラリア",away:"🇹🇷 トルコ",group:"D組1節",tv:["日本テレビ"] },
  { date:"2026-06-15",time:"02:00",home:"🇩🇪 ドイツ",away:"🇨🇼 キュラソー",group:"E組1節",tv:[] },
  { date:"2026-06-15",time:"05:00",home:"🇳🇱 オランダ",away:"🇯🇵 日本",group:"F組1節",tv:["NHK"],japan:true },
  { date:"2026-06-15",time:"08:00",home:"🇨🇮 コートジボワール",away:"🇪🇨 エクアドル",group:"E組1節",tv:[] },
  { date:"2026-06-15",time:"11:00",home:"🇸🇪 スウェーデン",away:"🇹🇳 チュニジア",group:"F組1節",tv:["日本テレビ"] },
  { date:"2026-06-16",time:"01:00",home:"🇪🇸 スペイン",away:"🇨🇻 カーボベルデ",group:"H組1節",tv:["NHK"] },
  { date:"2026-06-16",time:"04:00",home:"🇧🇪 ベルギー",away:"🇪🇬 エジプト",group:"G組1節",tv:["NHK"] },
  { date:"2026-06-16",time:"07:00",home:"🇸🇦 サウジアラビア",away:"🇺🇾 ウルグアイ",group:"H組1節",tv:[] },
  { date:"2026-06-16",time:"10:00",home:"🇮🇷 イラン",away:"🇳🇿 ニュージーランド",group:"G組1節",tv:[] },
  { date:"2026-06-17",time:"04:00",home:"🇫🇷 フランス",away:"🇸🇳 セネガル",group:"I組1節",tv:["フジテレビ"] },
  { date:"2026-06-17",time:"07:00",home:"🇮🇶 イラク",away:"🇳🇴 ノルウェー",group:"I組1節",tv:[] },
  { date:"2026-06-17",time:"10:00",home:"🇦🇷 アルゼンチン",away:"🇩🇿 アルジェリア",group:"J組1節",tv:["NHK"] },
  { date:"2026-06-17",time:"13:00",home:"🇦🇹 オーストリア",away:"🇯🇴 ヨルダン",group:"J組1節",tv:[] },
  { date:"2026-06-18",time:"02:00",home:"🇵🇹 ポルトガル",away:"🇨🇩 DRコンゴ",group:"K組1節",tv:["フジテレビ"] },
  { date:"2026-06-18",time:"05:00",home:"🏴󠁧󠁢󠁥󠁮󠁧󠁿 イングランド",away:"🇭🇷 クロアチア",group:"L組1節",tv:[] },
  { date:"2026-06-18",time:"08:00",home:"🇬🇭 ガーナ",away:"🇵🇦 パナマ",group:"L組1節",tv:[] },
  { date:"2026-06-18",time:"11:00",home:"🇺🇿 ウズベキスタン",away:"🇨🇴 コロンビア",group:"K組1節",tv:[] },
  { date:"2026-06-19",time:"01:00",home:"🇨🇿 チェコ",away:"🇿🇦 南アフリカ",group:"A組2節",tv:["日本テレビ"] },
  { date:"2026-06-19",time:"04:00",home:"🇨🇭 スイス",away:"🇧🇦 ボスニア",group:"B組2節",tv:[] },
  { date:"2026-06-19",time:"07:00",home:"🇨🇦 カナダ",away:"🇶🇦 カタール",group:"B組2節",tv:[] },
  { date:"2026-06-19",time:"10:00",home:"🇲🇽 メキシコ",away:"🇰🇷 韓国",group:"A組2節",tv:["NHK"] },
  { date:"2026-06-20",time:"04:00",home:"🇺🇸 アメリカ",away:"🇦🇺 オーストラリア",group:"D組2節",tv:["NHK"] },
  { date:"2026-06-20",time:"07:00",home:"🏴󠁧󠁢󠁳󠁣󠁴󠁿 スコットランド",away:"🇲🇦 モロッコ",group:"C組2節",tv:["フジテレビ"] },
  { date:"2026-06-20",time:"09:30",home:"🇧🇷 ブラジル",away:"🇭🇹 ハイチ",group:"C組2節",tv:["NHK"] },
  { date:"2026-06-20",time:"12:00",home:"🇹🇷 トルコ",away:"🇵🇾 パラグアイ",group:"D組2節",tv:[] },
  { date:"2026-06-21",time:"02:00",home:"🇳🇱 オランダ",away:"🇸🇪 スウェーデン",group:"F組2節",tv:["NHK"] },
  { date:"2026-06-21",time:"05:00",home:"🇩🇪 ドイツ",away:"🇨🇮 コートジボワール",group:"E組2節",tv:["日本テレビ"] },
  { date:"2026-06-21",time:"09:00",home:"🇪🇨 エクアドル",away:"🇨🇼 キュラソー",group:"E組2節",tv:[] },
  { date:"2026-06-21",time:"13:00",home:"🇹🇳 チュニジア",away:"🇯🇵 日本",group:"F組2節",tv:["日本テレビ","NHK BS"],japan:true },
  { date:"2026-06-22",time:"01:00",home:"🇪🇸 スペイン",away:"🇸🇦 サウジアラビア",group:"H組2節",tv:["NHK"] },
  { date:"2026-06-22",time:"04:00",home:"🇧🇪 ベルギー",away:"🇮🇷 イラン",group:"G組2節",tv:[] },
  { date:"2026-06-22",time:"07:00",home:"🇺🇾 ウルグアイ",away:"🇨🇻 カーボベルデ",group:"H組2節",tv:[] },
  { date:"2026-06-22",time:"10:00",home:"🇳🇿 ニュージーランド",away:"🇪🇬 エジプト",group:"G組2節",tv:[] },
  { date:"2026-06-23",time:"02:00",home:"🇦🇷 アルゼンチン",away:"🇦🇹 オーストリア",group:"J組2節",tv:[] },
  { date:"2026-06-23",time:"06:00",home:"🇫🇷 フランス",away:"🇮🇶 イラク",group:"I組2節",tv:[] },
  { date:"2026-06-23",time:"09:00",home:"🇳🇴 ノルウェー",away:"🇸🇳 セネガル",group:"I組2節",tv:["NHK"] },
  { date:"2026-06-23",time:"12:00",home:"🇯🇴 ヨルダン",away:"🇩🇿 アルジェリア",group:"J組2節",tv:[] },
  { date:"2026-06-24",time:"02:00",home:"🇵🇹 ポルトガル",away:"🇺🇿 ウズベキスタン",group:"K組2節",tv:["NHK"] },
  { date:"2026-06-24",time:"05:00",home:"🏴󠁧󠁢󠁥󠁮󠁧󠁿 イングランド",away:"🇬🇭 ガーナ",group:"L組2節",tv:[] },
  { date:"2026-06-24",time:"08:00",home:"🇵🇦 パナマ",away:"🇭🇷 クロアチア",group:"L組2節",tv:["フジテレビ"] },
  { date:"2026-06-24",time:"11:00",home:"🇨🇴 コロンビア",away:"🇨🇩 DRコンゴ",group:"K組2節",tv:["日本テレビ"] },
  { date:"2026-06-25",time:"04:00",home:"🇨🇭 スイス",away:"🇨🇦 カナダ",group:"B組3節",tv:["NHK"] },
  { date:"2026-06-25",time:"04:00",home:"🇧🇦 ボスニア",away:"🇶🇦 カタール",group:"B組3節",tv:[] },
  { date:"2026-06-25",time:"07:00",home:"🏴󠁧󠁢󠁳󠁣󠁴󠁿 スコットランド",away:"🇧🇷 ブラジル",group:"C組3節",tv:[] },
  { date:"2026-06-25",time:"07:00",home:"🇲🇦 モロッコ",away:"🇭🇹 ハイチ",group:"C組3節",tv:[] },
  { date:"2026-06-25",time:"10:00",home:"🇨🇿 チェコ",away:"🇲🇽 メキシコ",group:"A組3節",tv:["NHK"] },
  { date:"2026-06-25",time:"10:00",home:"🇿🇦 南アフリカ",away:"🇰🇷 韓国",group:"A組3節",tv:[] },
  { date:"2026-06-26",time:"05:00",home:"🇨🇼 キュラソー",away:"🇨🇮 コートジボワール",group:"E組3節",tv:[] },
  { date:"2026-06-26",time:"05:00",home:"🇪🇨 エクアドル",away:"🇩🇪 ドイツ",group:"E組3節",tv:[] },
  { date:"2026-06-26",time:"08:00",home:"🇯🇵 日本",away:"🇸🇪 スウェーデン",group:"F組3節",tv:["NHK"],japan:true },
  { date:"2026-06-26",time:"08:00",home:"🇹🇳 チュニジア",away:"🇳🇱 オランダ",group:"F組3節",tv:[] },
  { date:"2026-06-26",time:"11:00",home:"🇹🇷 トルコ",away:"🇺🇸 アメリカ",group:"D組3節",tv:["日本テレビ"] },
  { date:"2026-06-26",time:"11:00",home:"🇵🇾 パラグアイ",away:"🇦🇺 オーストラリア",group:"D組3節",tv:[] },
  { date:"2026-06-27",time:"04:00",home:"🇳🇴 ノルウェー",away:"🇫🇷 フランス",group:"I組3節",tv:["NHK"] },
  { date:"2026-06-27",time:"04:00",home:"🇸🇳 セネガル",away:"🇮🇶 イラク",group:"I組3節",tv:[] },
  { date:"2026-06-27",time:"09:00",home:"🇨🇻 カーボベルデ",away:"🇸🇦 サウジアラビア",group:"H組3節",tv:[] },
  { date:"2026-06-27",time:"09:00",home:"🇺🇾 ウルグアイ",away:"🇪🇸 スペイン",group:"H組3節",tv:["日本テレビ"] },
  { date:"2026-06-27",time:"12:00",home:"🇪🇬 エジプト",away:"🇮🇷 イラン",group:"G組3節",tv:[] },
  { date:"2026-06-27",time:"12:00",home:"🇳🇿 ニュージーランド",away:"🇧🇪 ベルギー",group:"G組3節",tv:["日本テレビ"] },
  { date:"2026-06-28",time:"06:00",home:"🇵🇦 パナマ",away:"🏴󠁧󠁢󠁥󠁮󠁧󠁿 イングランド",group:"L組3節",tv:[] },
  { date:"2026-06-28",time:"06:00",home:"🇭🇷 クロアチア",away:"🇬🇭 ガーナ",group:"L組3節",tv:[] },
  { date:"2026-06-28",time:"08:30",home:"🇨🇴 コロンビア",away:"🇵🇹 ポルトガル",group:"K組3節",tv:["フジテレビ"] },
  { date:"2026-06-28",time:"08:30",home:"🇨🇩 DRコンゴ",away:"🇺🇿 ウズベキスタン",group:"K組3節",tv:[] },
  { date:"2026-06-28",time:"11:00",home:"🇩🇿 アルジェリア",away:"🇦🇹 オーストリア",group:"J組3節",tv:[] },
  { date:"2026-06-28",time:"11:00",home:"🇯🇴 ヨルダン",away:"🇦🇷 アルゼンチン",group:"J組3節",tv:["NHK"] },
];

// ─── ユーティリティ ────────────────────────────────────────────
const TV_COLOR = { "NHK":"#4a7c59","日本テレビ":"#c0392b","フジテレビ":"#2980b9","NHK BS":"#6b4c9a" };
const DAY = ["日","月","火","水","木","金","土"];

function jstDisp(date,time) {
  const h = parseInt(time);
  return h < 3 ? `${24+h}:${time.slice(3)}` : time;
}
function koDate(date,time) {
  const h = parseInt(time);
  if (h < 3) {
    const d = new Date(date); d.setDate(d.getDate()-1);
    return new Date(`${d.toISOString().slice(0,10)}T${time}:00+09:00`);
  }
  return new Date(`${date}T${time}:00+09:00`);
}
function dispDate(date,time) {
  const h = parseInt(time);
  if (h < 3) { const d=new Date(date); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); }
  return date;
}
function fmtDate(s) {
  const d = new Date(s+"T00:00:00+09:00");
  return `${d.getMonth()+1}/${d.getDate()}（${DAY[d.getDay()]}）`;
}
function resolveSlot(k) {
  const m={A1:"A組1位",A2:"A組2位",B1:"B組1位",B2:"B組2位",C1:"C組1位",C2:"C組2位",
    D1:"D組1位",D2:"D組2位",E1:"E組1位",E2:"E組2位",F1:"F組1位",F2:"F組2位",
    G1:"G組1位",G2:"G組2位",H1:"H組1位",H2:"H組2位",I1:"I組1位",I2:"I組2位",
    J1:"J組1位",J2:"J組2位",K1:"K組1位",K2:"K組2位",L1:"L組1位",L2:"L組2位"};
  return m[k]||k;
}

// ─── 小コンポーネント ──────────────────────────────────────────
function TVBadge({s}) {
  return <span style={{background:TV_COLOR[s]||"#555",color:"#fff",fontSize:"0.65rem",
    fontWeight:700,padding:"1px 5px",borderRadius:3,marginRight:2,whiteSpace:"nowrap"}}>{s}</span>;
}

function StatCell({v,color}) {
  return <span style={{fontFamily:"monospace",fontSize:"0.78rem",fontWeight:700,
    color:color||"#e6edf3",minWidth:22,textAlign:"right",display:"inline-block"}}>{v}</span>;
}

// グループ順位表（横スクロール対応の本格テーブル）
function GroupTable({groupKey, stats, onEdit}) {
  const teams = GROUPS[groupKey];
  const rows = teams.map((name,i)=>{
    const s = stats[i];
    const pts = s.w*3 + s.d;
    const gd  = s.gf - s.ga;
    return { name, ...s, pts, gd, played: s.w+s.d+s.l };
  }).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);

  return (
    <div style={{background:"#161b22",border:"1px solid #21262d",borderRadius:8,
      marginBottom:10,overflow:"hidden"}}>
      <div style={{background:"#21262d",padding:"6px 10px",fontSize:"0.78rem",
        fontWeight:800,color:"#8b949e",letterSpacing:"0.05em"}}>
        {groupKey}組
      </div>
      {/* ヘッダ行 */}
      <div style={{display:"grid",gridTemplateColumns:"16px 1fr 28px 22px 22px 22px 22px 28px 32px",
        gap:"0 4px",padding:"4px 10px 2px",alignItems:"center"}}>
        <span/>
        <span style={{fontSize:"0.65rem",color:"#8b949e"}}>チーム</span>
        {["試","勝","分","負","得","失","差","勝点"].map(h=>(
          <span key={h} style={{fontSize:"0.65rem",color:"#8b949e",textAlign:"right"}}>{h}</span>
        ))}
      </div>
      {rows.map((t,i)=>{
        const rank = i+1;
        const rankColor = rank<=2?"#2ea043":rank===3?"#f0883e":"#6e7681";
        const isJapan = t.name.includes("日本");
        return (
          <div key={t.name} style={{display:"grid",
            gridTemplateColumns:"16px 1fr 28px 22px 22px 22px 22px 28px 32px",
            gap:"0 4px",padding:"5px 10px",alignItems:"center",
            borderTop:"1px solid #21262d",
            background:isJapan?"rgba(31,111,235,0.08)":"transparent"}}>
            <span style={{fontSize:"0.72rem",fontWeight:800,color:rankColor,textAlign:"center"}}>
              {rank}
            </span>
            <span style={{fontSize:"0.8rem",fontWeight:isJapan?700:400,
              color:isJapan?"#79c0ff":"#e6edf3",overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
            <StatCell v={t.played} color="#8b949e"/>
            <StatCell v={t.w}/>
            <StatCell v={t.d}/>
            <StatCell v={t.l}/>
            <StatCell v={t.gf}/>
            <StatCell v={t.ga}/>
            <StatCell v={t.gd>=0?`+${t.gd}`:t.gd} color={t.gd>0?"#2ea043":t.gd<0?"#f85149":"#8b949e"}/>
            <StatCell v={t.pts} color={rank<=2?"#2ea043":rank===3?"#f0883e":"#e6edf3"}/>
          </div>
        );
      })}
      {/* 凡例ライン */}
      <div style={{padding:"4px 10px 6px",display:"flex",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:"0.62rem",color:"#2ea043"}}>■ 1〜2位：直接進出</span>
        <span style={{fontSize:"0.62rem",color:"#f0883e"}}>■ 3位：3位争いへ</span>
        <span style={{fontSize:"0.62rem",color:"#6e7681"}}>■ 4位：敗退</span>
      </div>
    </div>
  );
}

// スケジュール行
function MatchRow({m, now}) {
  const ko = koDate(m.date,m.time);
  const end = new Date(ko.getTime()+110*60*1000);
  const live = now>=ko && now<=end;
  const past = now>end;
  return (
    <div style={{background:m.japan?"linear-gradient(135deg,#1a1f2e,#161b22)":"#161b22",
      border:`1px solid ${live?"#f0883e":m.japan?"#1f6feb":"#21262d"}`,
      borderRadius:8,padding:"8px 10px",marginBottom:5,opacity:past?0.45:1}}>
      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        <span style={{fontFamily:"monospace",fontSize:"1rem",fontWeight:800,minWidth:46,flexShrink:0,
          color:live?"#f0883e":past?"#8b949e":"#e6edf3"}}>{jstDisp(m.date,m.time)}</span>
        {live&&<span style={{background:"#f0883e",color:"#fff",fontSize:"0.6rem",
          fontWeight:800,padding:"1px 5px",borderRadius:3}}>LIVE</span>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"0.85rem",fontWeight:700,color:m.japan?"#79c0ff":"#e6edf3",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {m.home} <span style={{color:"#8b949e",fontWeight:400,fontSize:"0.75rem"}}>vs</span> {m.away}
          </div>
          <div style={{fontSize:"0.68rem",color:"#8b949e",marginTop:1}}>{m.groupLabel||m.group}</div>
          {m.thirdNote&&<div style={{fontSize:"0.65rem",color:"#e6af00",marginTop:1}}>🃏 3位通過枠：{m.thirdNote}</div>}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"flex-end",gap:2,flexShrink:0}}>
          {m.tv&&m.tv.length>0?m.tv.map(t=><TVBadge key={t} s={t}/>)
            :<span style={{fontSize:"0.65rem",color:"#8b949e"}}>DAZN</span>}
        </div>
      </div>
    </div>
  );
}

// 決勝T行（縦レイアウト、スマホ対応）
function BracketRow({s, now}) {
  const isThird = s.away&&s.away.startsWith("3rd_");
  const thirdGroups = isThird ? s.away.replace("3rd_","").split("").join("・") : null;
  const homeLabel = isThird||!s.home ? resolveSlot(s.home||"") : resolveSlot(s.home);
  const awayLabel = isThird ? `3位通過枠` : resolveSlot(s.away||"TBD");
  const td = dispDate(s.date,s.time);
  const ko = koDate(s.date,s.time);
  const end = new Date(ko.getTime()+110*60*1000);
  const live = now>=ko&&now<=end;
  const past = now>end;
  return (
    <div style={{background:"#161b22",border:`1px solid ${live?"#f0883e":"#21262d"}`,
      borderRadius:8,padding:"8px 10px",marginBottom:5,opacity:past?0.45:1}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
        {/* 日付・時刻 */}
        <div style={{flexShrink:0,minWidth:62}}>
          <div style={{fontSize:"0.65rem",color:"#8b949e"}}>{fmtDate(td)}</div>
          <div style={{fontFamily:"monospace",fontSize:"0.95rem",fontWeight:800,
            color:live?"#f0883e":past?"#8b949e":"#e6edf3"}}>{jstDisp(s.date,s.time)}</div>
        </div>
        {/* 内容 */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"0.7rem",color:"#8b949e",marginBottom:2}}>
            {s.label||`M${s.match}`}
          </div>
          <div style={{fontSize:"0.82rem",fontWeight:700,color:"#e6edf3"}}>
            {homeLabel}
            <span style={{color:"#8b949e",fontWeight:400,margin:"0 4px",fontSize:"0.75rem"}}>vs</span>
            {awayLabel}
          </div>
          {isThird&&<div style={{fontSize:"0.65rem",color:"#e6af00",marginTop:3,
            background:"#1f1a00",border:"1px solid #3a3000",borderRadius:3,
            padding:"1px 6px",display:"inline-block"}}>
            {thirdGroups}組の3位チームが入る枠
          </div>}
        </div>
        {/* 放送 */}
        <div style={{flexShrink:0,display:"flex",flexWrap:"wrap",gap:2,justifyContent:"flex-end"}}>
          {s.tv&&s.tv.length>0?s.tv.map(t=><TVBadge key={t} s={t}/>)
            :<span style={{fontSize:"0.65rem",color:"#8b949e"}}>DAZN</span>}
        </div>
      </div>
    </div>
  );
}

// ─── メイン ─────────────────────────────────────────────────────
export default function App() {
  const now = new Date();
  const [tab, setTab] = useState("schedule");
  const [filter, setFilter] = useState("all");
  const [phase, setPhase] = useState("all");
  const [tweetOpen, setTweetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // グループ成績 state（チームごとにW/D/L/GF/GA）
  const [groupStats, setGroupStats] = useState(() => {
    const s = {};
    Object.entries(GROUPS).forEach(([k,teams])=>{ s[k]=makeInitialStats(teams); });
    return s;
  });

  // 全試合リスト統合
  const allMatches = useMemo(()=>{
    const gm = GROUP_MATCHES.map(m=>({...m,phase:"group"}));
    const r32 = R32_SLOTS.map(s=>({
      date:s.date, time:s.time, phase:"r32", tv:s.tv,
      home: resolveSlot(s.home),
      away: s.away.startsWith("3rd_")
        ? `3位通過枠(${s.away.replace("3rd_","").split("").join("・")}組)`
        : resolveSlot(s.away),
      groupLabel:`R32 M${s.match}`,
      thirdNote: s.away.startsWith("3rd_") ? s.away.replace("3rd_","").split("").join("・")+"組" : null,
    }));
    const r16 = R16_SLOTS.map(s=>({date:s.date,time:s.time,phase:"r16",tv:s.tv,
      home:s.home,away:s.away,groupLabel:`R16 M${s.match}`}));
    const qf  = QF_SLOTS.map(s=>({date:s.date,time:s.time,phase:"qf",tv:s.tv,
      home:"TBD",away:"TBD",groupLabel:`準々決勝 M${s.match}`}));
    const sf  = SF_SLOTS.map(s=>({date:s.date,time:s.time,phase:"sf",tv:s.tv,
      home:"TBD",away:"TBD",groupLabel:`準決勝 M${s.match}`}));
    const fin = FIN_SLOTS.map(s=>({date:s.date,time:s.time,phase:"final",tv:s.tv,
      home:"TBD",away:"TBD",groupLabel:s.label}));
    return [...gm,...r32,...r16,...qf,...sf,...fin];
  },[]);

  const within24h = useMemo(()=>{
    const lim = new Date(now.getTime()+24*60*60*1000);
    return allMatches.filter(m=>{const k=koDate(m.date,m.time);return k>=now&&k<=lim;});
  },[allMatches]);

  const filtered = useMemo(()=>{
    return allMatches.filter(m=>{
      if (phase==="group"&&m.phase!=="group") return false;
      if (phase==="knockout"&&m.phase==="group") return false;
      if (filter==="tv"&&(!m.tv||m.tv.length===0)) return false;
      if (filter==="japan"&&!m.japan) return false;
      const ko=koDate(m.date,m.time);
      return ko >= new Date(now.getTime()-2*60*60*1000);
    });
  },[allMatches,filter,phase]);

  const grouped = useMemo(()=>{
    const map={};
    filtered.forEach(m=>{const k=dispDate(m.date,m.time);(map[k]=map[k]||[]).push(m);});
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b));
  },[filtered]);

  const tweetText = useMemo(()=>{
    if (!within24h.length) return "";
    const lines=within24h.map(m=>{
      const t=jstDisp(m.date,m.time);
      const d=fmtDate(dispDate(m.date,m.time));
      const tv=m.tv&&m.tv.length>0?` 📺${m.tv.join("/")}`:" 📡DAZN";
      return `${d} ${t} ${m.home} vs ${m.away}（${m.groupLabel||m.group}）${tv}`;
    });
    return `⚽ #W杯2026 直近の試合\n\n${lines.join("\n")}\n\n#FIFAWorldCup`;
  },[within24h]);

  // タブボタン
  const tabs=[["schedule","📅 日程"],["groups","🏆 順位表"],["bracket","🔀 決勝T"]];

  return (
    <div style={{background:"#0d1117",minHeight:"100vh",color:"#e6edf3",
      fontFamily:"'Hiragino Sans','Meiryo',sans-serif",maxWidth:780,margin:"0 auto"}}>

      {/* ヘッダー */}
      <div style={{background:"linear-gradient(135deg,#1a2e1a,#0d1117)",
        borderBottom:"2px solid #2ea043",padding:"12px 12px 0",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontSize:"1.4rem"}}>⚽</span>
          <div>
            <div style={{fontSize:"1.05rem",fontWeight:800,color:"#2ea043"}}>W杯 2026 番組表</div>
            <div style={{fontSize:"0.68rem",color:"#8b949e"}}>北中米大会 · 全104試合 · JST</div>
          </div>
        </div>
        <div style={{display:"flex",gap:0}}>
          {tabs.map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)} style={{
              flex:1,background:"transparent",border:"none",
              borderBottom:`2px solid ${tab===v?"#2ea043":"transparent"}`,
              color:tab===v?"#2ea043":"#8b949e",
              padding:"8px 4px",fontSize:"0.82rem",cursor:"pointer",fontWeight:tab===v?700:400
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"10px 12px 40px"}}>

        {/* ===== 日程タブ ===== */}
        {tab==="schedule"&&<>
          {/* フィルタ */}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
            {[["all","全試合"],["tv","📺 地上波"],["japan","🇯🇵 日本戦"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{
                background:filter===v?"#2ea043":"#21262d",color:filter===v?"#fff":"#8b949e",
                border:`1px solid ${filter===v?"#2ea043":"#30363d"}`,borderRadius:16,
                padding:"3px 10px",fontSize:"0.74rem",cursor:"pointer",fontWeight:filter===v?700:400
              }}>{l}</button>
            ))}
            <span style={{width:1,background:"#30363d",margin:"0 2px"}}/>
            {[["all","全期間"],["group","GL"],["knockout","決勝T"]].map(([v,l])=>(
              <button key={v} onClick={()=>setPhase(v)} style={{
                background:phase===v?"#1f6feb":"#21262d",color:phase===v?"#fff":"#8b949e",
                border:`1px solid ${phase===v?"#1f6feb":"#30363d"}`,borderRadius:16,
                padding:"3px 10px",fontSize:"0.74rem",cursor:"pointer",fontWeight:phase===v?700:400
              }}>{l}</button>
            ))}
          </div>

          {/* Xポスト */}
          <button onClick={()=>setTweetOpen(!tweetOpen)} style={{
            background:tweetOpen?"#1d9bf0":"#21262d",color:tweetOpen?"#fff":"#8b949e",
            border:`1px solid ${tweetOpen?"#1d9bf0":"#30363d"}`,borderRadius:8,
            padding:"5px 12px",fontSize:"0.76rem",cursor:"pointer",fontWeight:600,
            display:"flex",alignItems:"center",gap:5,marginBottom:8
          }}>
            𝕏 24h以内の試合をポスト
            {within24h.length>0&&<span style={{background:"#f85149",color:"#fff",borderRadius:"50%",
              width:17,height:17,fontSize:"0.65rem",display:"flex",alignItems:"center",
              justifyContent:"center",fontWeight:800}}>{within24h.length}</span>}
          </button>
          {tweetOpen&&(
            <div style={{background:"#161b22",border:"1px solid #1d9bf0",borderRadius:8,
              padding:12,marginBottom:10}}>
              {within24h.length===0
                ?<div style={{color:"#8b949e",fontSize:"0.82rem"}}>24時間以内に試合はありません</div>
                :<>
                  <pre style={{fontFamily:"inherit",fontSize:"0.78rem",color:"#e6edf3",
                    whiteSpace:"pre-wrap",margin:"0 0 8px",lineHeight:1.6}}>{tweetText}</pre>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{navigator.clipboard.writeText(tweetText);
                      setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{
                      background:"#21262d",color:copied?"#2ea043":"#e6edf3",
                      border:"1px solid #30363d",borderRadius:6,padding:"4px 10px",
                      fontSize:"0.74rem",cursor:"pointer"}}>{copied?"✓ コピー済":"📋 コピー"}</button>
                    <button onClick={()=>window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,"_blank")} style={{
                      background:"#1d9bf0",color:"#fff",border:"none",borderRadius:6,
                      padding:"4px 10px",fontSize:"0.74rem",cursor:"pointer",fontWeight:700}}>𝕏 ポストする</button>
                  </div>
                </>}
            </div>
          )}

          {grouped.length===0
            ?<div style={{textAlign:"center",color:"#8b949e",padding:"40px 0"}}>該当する試合はありません</div>
            :grouped.map(([d,ms])=>(
              <div key={d} style={{marginBottom:12}}>
                <div style={{fontSize:"0.76rem",fontWeight:700,color:"#8b949e",
                  padding:"4px 0",borderBottom:"1px solid #21262d",marginBottom:5,letterSpacing:"0.05em"}}>
                  {fmtDate(d)}
                </div>
                {ms.map((m,i)=><MatchRow key={i} m={m} now={now}/>)}
              </div>
            ))}

          <div style={{borderTop:"1px solid #21262d",paddingTop:10,marginTop:4,
            display:"flex",gap:8,flexWrap:"wrap",fontSize:"0.68rem",color:"#8b949e",alignItems:"center"}}>
            {Object.entries(TV_COLOR).map(([k,v])=>(
              <span key={k} style={{display:"flex",alignItems:"center",gap:3}}>
                <span style={{background:v,width:7,height:7,borderRadius:2,display:"inline-block"}}/>
                {k}
              </span>
            ))}
            <span>BSP4K 全試合（録画含む）</span>
          </div>
        </>}

        {/* ===== 順位表タブ ===== */}
        {tab==="groups"&&<>
          <div style={{fontSize:"0.76rem",color:"#8b949e",marginBottom:10,padding:"8px 10px",
            background:"#161b22",borderRadius:8,border:"1px solid #21262d",lineHeight:1.7}}>
            <span style={{color:"#2ea043",fontWeight:700}}>1〜2位</span>：ラウンド32へ直接進出　
            <span style={{color:"#f0883e",fontWeight:700}}>3位</span>：12組の3位でランク付け、上位<span style={{color:"#e6af00",fontWeight:700}}>8チーム</span>のみ進出<br/>
            <span style={{fontSize:"0.65rem"}}>3位ランク基準：①勝点 ②得失点差 ③総得点 ④フェアプレー ⑤FIFAランク</span>
          </div>
          {/* 1列表示（スマホ対応） */}
          {Object.keys(GROUPS).map(g=>(
            <GroupTable key={g} groupKey={g} stats={groupStats[g]}
              onEdit={(gk,ti,field,val)=>{
                setGroupStats(prev=>{
                  const next={...prev};
                  const arr=[...next[gk]];
                  arr[ti]={...arr[ti],[field]:Math.max(0,parseInt(val)||0)};
                  next[gk]=arr;
                  return next;
                });
              }}/>
          ))}
        </>}

        {/* ===== 決勝Tタブ ===== */}
        {tab==="bracket"&&<>
          <div style={{fontSize:"0.74rem",color:"#8b949e",marginBottom:10,padding:"8px 10px",
            background:"#161b22",borderRadius:8,border:"1px solid #21262d",lineHeight:1.7}}>
            3位チームの対戦相手は<span style={{color:"#e6af00",fontWeight:700}}>495通り（FIFA Annex C）</span>で事前規定。<br/>
            GL全日程終了後に自動確定します。🃏マークのスロットは3位チームが入る枠です。
          </div>

          {[
            ["ラウンド32", R32_SLOTS],
            ["ラウンド16", R16_SLOTS],
            ["準々決勝", QF_SLOTS],
            ["準決勝", SF_SLOTS],
            ["最終", FIN_SLOTS],
          ].map(([label,slots])=>(
            <div key={label} style={{marginBottom:14}}>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:"#8b949e",
                padding:"4px 0",borderBottom:"1px solid #21262d",marginBottom:5,letterSpacing:"0.05em"}}>
                {label}
              </div>
              {slots.map((s,i)=><BracketRow key={i} s={s} now={now}/>)}
            </div>
          ))}

          <div style={{background:"#161b22",border:"1px solid #30363d",borderRadius:8,padding:12,marginTop:4}}>
            <div style={{fontWeight:700,fontSize:"0.8rem",color:"#e6af00",marginBottom:6}}>
              🔀 FIFA Annex C とは
            </div>
            <div style={{fontSize:"0.72rem",color:"#8b949e",lineHeight:1.7}}>
              12組から3位が1チームずつ→8チーム選ぶ組み合わせは<span style={{color:"#e6edf3",fontWeight:700}}>495通り</span>。<br/>
              FIFAはこの全パターンに対してどの3位チームがどのスロットに入るかを事前規定済みのため、<br/>
              GL終了後に追加抽選は行われず即座にブラケットが確定します。
            </div>
          </div>
        </>}

      </div>
      <style>{`*{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#0d1117}
        ::-webkit-scrollbar-thumb{background:#30363d;border-radius:4px}
      `}</style>
    </div>
  );
}

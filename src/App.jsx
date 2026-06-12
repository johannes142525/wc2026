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

// チーム→組のマップ（スコア反映時に順位表を更新するため）
const TEAM_GROUP = {};
Object.entries(GROUPS).forEach(([g, teams]) => teams.forEach(t => { TEAM_GROUP[t] = g; }));

// 日本語名 → 英語名（API照合用）
const TEAM_EN = {
  "🇲🇽 メキシコ":"mexico","🇰🇷 韓国":"korea","🇿🇦 南アフリカ":"south africa","🇨🇿 チェコ":"czech",
  "🇨🇦 カナダ":"canada","🇧🇦 ボスニア":"bosnia","🇶🇦 カタール":"qatar","🇨🇭 スイス":"switzerland",
  "🇧🇷 ブラジル":"brazil","🇲🇦 モロッコ":"morocco","🏴󠁧󠁢󠁳󠁣󠁴󠁿 スコットランド":"scotland","🇭🇹 ハイチ":"haiti",
  "🇺🇸 アメリカ":"usa","🇵🇾 パラグアイ":"paraguay","🇦🇺 オーストラリア":"australia","🇹🇷 トルコ":"turk",
  "🇩🇪 ドイツ":"germany","🇨🇼 キュラソー":"curacao","🇨🇮 コートジボワール":"ivoire","🇪🇨 エクアドル":"ecuador",
  "🇳🇱 オランダ":"netherlands","🇯🇵 日本":"japan","🇸🇪 スウェーデン":"sweden","🇹🇳 チュニジア":"tunisia",
  "🇧🇪 ベルギー":"belgium","🇮🇷 イラン":"iran","🇪🇬 エジプト":"egypt","🇳🇿 ニュージーランド":"zealand",
  "🇪🇸 スペイン":"spain","🇺🇾 ウルグアイ":"uruguay","🇸🇦 サウジアラビア":"saudi","🇨🇻 カーボベルデ":"verde",
  "🇫🇷 フランス":"france","🇸🇳 セネガル":"senegal","🇳🇴 ノルウェー":"norway","🇮🇶 イラク":"iraq",
  "🇦🇷 アルゼンチン":"argentina","🇦🇹 オーストリア":"austria","🇩🇿 アルジェリア":"algeria","🇯🇴 ヨルダン":"jordan",
  "🇵🇹 ポルトガル":"portugal","🇨🇴 コロンビア":"colombia","🇺🇿 ウズベキスタン":"uzbekistan","🇨🇩 DRコンゴ":"congo",
  "🏴󠁧󠁢󠁥󠁮󠁧󠁿 イングランド":"england","🇭🇷 クロアチア":"croatia","🇵🇦 パナマ":"panama","🇬🇭 ガーナ":"ghana",
};

// FIFA match centre URL（試合番号の連番仮説に基づく。開幕戦=400021443）
// 形式: /match/{大会ID}/{シーズンID}/{ステージID}/{試合ID}
function fifaUrl(matchNo) {
  return `https://www.fifa.com/en/match-centre/match/17/285023/289273/${400021442 + matchNo}`;
}

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

      {/* 2行目：組・FIFAリンク・放送 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:3}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:"0.66rem",color:"#8b949e"}}>{m.groupLabel||m.group}</span>
          {m.matchNo&&(
            <a href={fifaUrl(m.matchNo)} target="_blank" rel="noopener noreferrer"
              style={{fontSize:"0.62rem",color:"#58a6ff",textDecoration:"none",
                border:"1px solid #1f6feb44",borderRadius:3,padding:"0 4px"}}>
              FIFA ↗
            </a>
          )}
        </div>
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
    <div style={{background:"#161b22",border:`1px solid ${live?"#f0883e":"#21262d"}`,
      borderRadius:8,padding:"8px 10px",marginBottom:5,opacity:past?0.45:1}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
        <div style={{flexShrink:0,minWidth:58}}>
          <div style={{fontSize:"0.62rem",color:"#8b949e"}}>{fmtDate(td)}</div>
          <div style={{fontFamily:"monospace",fontSize:"0.9rem",fontWeight:800,
            color:live?"#f0883e":past?"#8b949e":"#e6edf3"}}>{jstDisp(s.date,s.time)}</div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"0.68rem",color:"#8b949e",marginBottom:1}}>{s.label||`M${s.match}`}</div>
          <div style={{fontSize:"0.8rem",fontWeight:700,color:"#e6edf3"}}>
            {homeL}<span style={{color:"#8b949e",margin:"0 4px",fontWeight:400,fontSize:"0.72rem"}}>vs</span>{awayL}
          </div>
          {isThird&&<div style={{fontSize:"0.62rem",color:"#e6af00",marginTop:2,
            background:"#1f1a00",border:"1px solid #3a3000",borderRadius:3,
            padding:"1px 5px",display:"inline-block"}}>{thirdGs}組の3位チームが入る枠</div>}
        </div>
        <div style={{flexShrink:0,display:"flex",flexWrap:"wrap",gap:2,justifyContent:"flex-end"}}>
          {s.tv&&s.tv.length>0?s.tv.map(t=><TVBadge key={t} s={t}/>)
            :<span style={{fontSize:"0.62rem",color:"#8b949e"}}>DAZN</span>}
        </div>
      </div>
    </div>
  );
}

// ─── メイン ──────────────────────────────────────────────────────
export default function App() {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{
    const t = setInterval(()=>setNow(new Date()), 30000);
    return ()=>clearInterval(t);
  },[]);

  const [tab, setTab]       = useState("schedule");
  const [filter, setFilter] = useState("all");
  const [phase, setPhase]   = useState("all");
  const [tweetOpen, setTweetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [spoiler, setSpoiler] = useState(false); // ネタバレ防止

  // スコア state: { [matchId]: {h, a} }  APIから自動取得
  const [scores, setScores] = useState({});
  const [apiStatus, setApiStatus] = useState("idle"); // idle | loading | ok | error
  const [lastFetch, setLastFetch] = useState(null);

  // API取得関数（worldcup26.ir の無料API）
  const fetchScores = useCallback(async ()=>{
    setApiStatus("loading");
    try {
      const res = await fetch("https://worldcup26.ir/get/games", {signal: AbortSignal.timeout(8000)});
      if (!res.ok) throw new Error("HTTP "+res.status);
      const data = await res.json();
      // 実レスポンス構造: { games: [ { id:"1", home_score:"2", away_score:"0",
      //   finished:"TRUE", home_team_name_en:"Mexico", away_team_name_en:"South Africa", ... } ] }
      const games = data.games || [];
      const map = {};
      games.forEach(g=>{
        // 第一候補: APIのid＝公式試合番号 → こちらのmatchNo(g001=1...)と直接対応
        let matchFound = null;
        const apiNo = parseInt(g.id, 10);
        if (!isNaN(apiNo) && apiNo >= 1 && apiNo <= 72) {
          const cand = GROUP_MATCHES.find(m => parseInt(m.id.slice(1),10) === apiNo);
          // チーム名で軽く検証（番号ズレ対策）
          if (cand) {
            const he = TEAM_EN[cand.home], ae = TEAM_EN[cand.away];
            const gh = String(g.home_team_name_en||"").toLowerCase();
            const ga = String(g.away_team_name_en||"").toLowerCase();
            // IDが主キーなので名前は片側一致でOK（"United States"等の表記ゆれ対策）
            if ((he && gh.includes(he)) || (ae && ga.includes(ae))) {
              matchFound = cand;
            }
          }
        }
        // 第二候補: チーム名のみで照合（番号検証に失敗した場合の保険）
        if (!matchFound) {
          const gh = String(g.home_team_name_en||"").toLowerCase();
          const ga = String(g.away_team_name_en||"").toLowerCase();
          if (gh && ga) {
            matchFound = GROUP_MATCHES.find(m=>{
              const he = TEAM_EN[m.home], ae = TEAM_EN[m.away];
              return he && ae && gh.includes(he) && ga.includes(ae);
            });
          }
        }
        if (!matchFound) return;
        // スコアは文字列で来る。試合中/終了のみ反映
        const hs = parseInt(g.home_score, 10);
        const as_ = parseInt(g.away_score, 10);
        const started = String(g.finished).toUpperCase()==="TRUE"
          || (g.time_elapsed && g.time_elapsed!=="notstarted" && g.time_elapsed!=="null");
        if (!isNaN(hs) && !isNaN(as_) && started) {
          map[matchFound.id] = {h: hs, a: as_};
        }
      });
      setScores(prev=>({...prev,...map}));
      setApiStatus("ok");
      setLastFetch(new Date());
    } catch(e) {
      setApiStatus("error");
    }
  }, []);

  // 起動時・30分ごとに自動取得
  useEffect(()=>{
    fetchScores();
    const t = setInterval(fetchScores, 30*60*1000);
    return ()=>clearInterval(t);
  },[fetchScores]);

  // グループ成績 state
  const [groupStats, setGroupStats] = useState(()=>{
    const s={};
    Object.entries(GROUPS).forEach(([k,teams])=>{ s[k]=makeInitialStats(teams); });
    return s;
  });

  // スコアが更新されたら順位表に自動反映
  useEffect(()=>{
    Object.entries(scores).forEach(([id, sc])=>{
      const m = GROUP_MATCHES.find(x=>x.id===id);
      if (!m) return;
      const hv = parseInt(sc.h), av = parseInt(sc.a);
      if (isNaN(hv)||isNaN(av)) return;
      const hGroup = TEAM_GROUP[m.home];
      if (!hGroup) return;
      setGroupStats(prev=>{
        const arr = prev[hGroup].map(t=>{
          if (t.name===m.home) { const w=hv>av?1:0,d=hv===av?1:0,l=hv<av?1:0; return {...t,w,d,l,gf:hv,ga:av}; }
          if (t.name===m.away) { const w=av>hv?1:0,d=av===hv?1:0,l=av<hv?1:0; return {...t,w,d,l,gf:av,ga:hv}; }
          return t;
        });
        return {...prev,[hGroup]:arr};
      });
    });
  },[scores]);

  // 今日ジャンプ用 ref マップ
  const dateRefs = useRef({});
  const scheduleContainerRef = useRef(null);

  const scrollToToday = useCallback(()=>{
    const today = todayJST();
    const target = dateRefs.current[today]
      || dateRefs.current[Object.keys(dateRefs.current).filter(d=>d>=today).sort()[0]];
    if (!target) return;
    // stickyヘッダ(約96px)分だけオフセット
    const y = target.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({top: Math.max(0, y), behavior:"smooth"});
  },[]);

  // 日程タブを開いたとき自動で今日へスクロール
  useEffect(()=>{
    if (tab==="schedule") {
      setTimeout(scrollToToday, 100);
    }
  },[tab]);

  // 全試合リスト統合
  const allMatches = useMemo(()=>{
    const gm = GROUP_MATCHES.map(m=>({...m, phase:"group", matchNo: parseInt(m.id.slice(1),10)}));
    const r32 = R32_SLOTS.map(s=>({
      date:s.date,time:s.time,phase:"r32",tv:s.tv,matchNo:s.match,
      home:resolveSlot(s.home),
      away:s.away.startsWith("3rd_")
        ?`3位通過枠(${s.away.replace("3rd_","").split("").join("・")}組)`
        :resolveSlot(s.away),
      groupLabel:`R32 M${s.match}`,
      thirdNote:s.away.startsWith("3rd_")?s.away.replace("3rd_","").split("").join("・")+"組":null,
    }));
    const r16 = R16_SLOTS.map(s=>({date:s.date,time:s.time,phase:"r16",tv:s.tv,matchNo:s.match,
      home:s.home,away:s.away,groupLabel:`R16 M${s.match}`}));
    const qf  = QF_SLOTS.map(s=>({date:s.date,time:s.time,phase:"qf",tv:s.tv,matchNo:s.match,
      home:"TBD",away:"TBD",groupLabel:`準々決勝 M${s.match}`}));
    const sf  = SF_SLOTS.map(s=>({date:s.date,time:s.time,phase:"sf",tv:s.tv,matchNo:s.match,
      home:"TBD",away:"TBD",groupLabel:`準決勝 M${s.match}`}));
    const fin = FIN_SLOTS.map(s=>({date:s.date,time:s.time,phase:"final",tv:s.tv,matchNo:s.match,
      home:"TBD",away:"TBD",groupLabel:s.label}));
    return [...gm,...r32,...r16,...qf,...sf,...fin];
  },[]);

  const within24h = useMemo(()=>{
    const lim = new Date(now.getTime()+24*60*60*1000);
    return allMatches.filter(m=>{const k=koDate(m.date,m.time);return k>=now&&k<=lim;});
  },[allMatches,now]);

  const filtered = useMemo(()=>
    allMatches.filter(m=>{
      if (phase==="group"&&m.phase!=="group") return false;
      if (phase==="knockout"&&m.phase==="group") return false;
      if (filter==="tv"&&(!m.tv||m.tv.length===0)) return false;
      if (filter==="japan"&&!m.japan) return false;
      return true; // 過去試合も表示（スコア入力のため）
    })
  ,[allMatches,filter,phase]);

  const groupedDates = useMemo(()=>{
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

  const today = todayJST();

  return (
    <div style={{background:"#0d1117",minHeight:"100vh",color:"#e6edf3",
      fontFamily:"'Hiragino Sans','Meiryo',sans-serif",maxWidth:780,margin:"0 auto"}}>

      {/* ─── ヘッダー（sticky） ─── */}
      <div style={{background:"linear-gradient(135deg,#1a2e1a,#0d1117)",
        borderBottom:"2px solid #2ea043",padding:"12px 12px 0",
        position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:"1.4rem"}}>⚽</span>
            <div>
              <div style={{fontSize:"1.05rem",fontWeight:800,color:"#2ea043"}}>W杯 2026 番組表</div>
              <div style={{fontSize:"0.66rem",color:"#8b949e"}}>北中米大会 · JST</div>
            </div>
          </div>
          {/* 今日ボタン（日程タブのみ表示） */}
          {tab==="schedule"&&(
            <button onClick={scrollToToday} style={{
              background:"#21262d",color:"#e6edf3",border:"1px solid #30363d",
              borderRadius:20,padding:"5px 14px",fontSize:"0.76rem",
              cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
              📅 今日
            </button>
          )}
        </div>
        <div style={{display:"flex",gap:0}}>
          {[["schedule","📅 日程"],["groups","🏆 順位表"],["bracket","🔀 決勝T"]].map(([v,l])=>(
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
          {/* フィルタ行 */}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
            {[["all","全試合"],["tv","📺 地上波"],["japan","🇯🇵 日本戦"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{
                background:filter===v?"#2ea043":"#21262d",color:filter===v?"#fff":"#8b949e",
                border:`1px solid ${filter===v?"#2ea043":"#30363d"}`,borderRadius:16,
                padding:"3px 10px",fontSize:"0.72rem",cursor:"pointer",fontWeight:filter===v?700:400
              }}>{l}</button>
            ))}
            <span style={{width:1,background:"#30363d",margin:"0 2px"}}/>
            {[["all","全期間"],["group","GL"],["knockout","決勝T"]].map(([v,l])=>(
              <button key={v} onClick={()=>setPhase(v)} style={{
                background:phase===v?"#1f6feb":"#21262d",color:phase===v?"#fff":"#8b949e",
                border:`1px solid ${phase===v?"#1f6feb":"#30363d"}`,borderRadius:16,
                padding:"3px 10px",fontSize:"0.72rem",cursor:"pointer",fontWeight:phase===v?700:400
              }}>{l}</button>
            ))}
            <span style={{width:1,background:"#30363d",margin:"0 2px"}}/>
            <button onClick={()=>setSpoiler(!spoiler)} style={{
              background:spoiler?"#6e3a9a":"#21262d",color:spoiler?"#fff":"#8b949e",
              border:`1px solid ${spoiler?"#6e3a9a":"#30363d"}`,borderRadius:16,
              padding:"3px 10px",fontSize:"0.72rem",cursor:"pointer",fontWeight:spoiler?700:400,
              display:"flex",alignItems:"center",gap:3
            }}>{spoiler?"🙈 ネタバレOFF":"👁 ネタバレ防止"}</button>
          </div>

          {/* Xポスト */}
          <button onClick={()=>setTweetOpen(!tweetOpen)} style={{
            background:tweetOpen?"#1d9bf0":"#21262d",color:tweetOpen?"#fff":"#8b949e",
            border:`1px solid ${tweetOpen?"#1d9bf0":"#30363d"}`,borderRadius:8,
            padding:"5px 12px",fontSize:"0.74rem",cursor:"pointer",fontWeight:600,
            display:"flex",alignItems:"center",gap:5,marginBottom:8}}>
            𝕏 24h以内をポスト
            {within24h.length>0&&<span style={{background:"#f85149",color:"#fff",
              borderRadius:"50%",width:16,height:16,fontSize:"0.62rem",
              display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>
              {within24h.length}</span>}
          </button>
          {tweetOpen&&(
            <div style={{background:"#161b22",border:"1px solid #1d9bf0",borderRadius:8,
              padding:12,marginBottom:10}}>
              {within24h.length===0
                ?<div style={{color:"#8b949e",fontSize:"0.8rem"}}>24時間以内に試合はありません</div>
                :<>
                  <pre style={{fontFamily:"inherit",fontSize:"0.76rem",color:"#e6edf3",
                    whiteSpace:"pre-wrap",margin:"0 0 8px",lineHeight:1.6}}>{tweetText}</pre>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{navigator.clipboard.writeText(tweetText);
                      setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{
                      background:"#21262d",color:copied?"#2ea043":"#e6edf3",
                      border:"1px solid #30363d",borderRadius:6,padding:"4px 10px",
                      fontSize:"0.72rem",cursor:"pointer"}}>{copied?"✓ コピー済":"📋 コピー"}</button>
                    <button onClick={()=>window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,"_blank")} style={{
                      background:"#1d9bf0",color:"#fff",border:"none",borderRadius:6,
                      padding:"4px 10px",fontSize:"0.72rem",cursor:"pointer",fontWeight:700}}>
                      𝕏 ポスト</button>
                  </div>
                </>}
            </div>
          )}

          {/* 試合一覧 */}
          {groupedDates.length===0
            ?<div style={{textAlign:"center",color:"#8b949e",padding:"40px 0"}}>該当する試合はありません</div>
            :groupedDates.map(([d,ms])=>(
              <div key={d} ref={el=>{if(el) dateRefs.current[d]=el;}} style={{marginBottom:12}}>
                <div style={{
                  fontSize:"0.76rem",fontWeight:700,padding:"4px 8px",
                  borderBottom:"1px solid #21262d",marginBottom:5,letterSpacing:"0.04em",
                  display:"flex",alignItems:"center",gap:6,
                  color: d===today?"#e6af00":"#8b949e",
                  background: d===today?"rgba(230,175,0,0.06)":"transparent",
                  borderRadius: d===today?"6px 6px 0 0":0,
                }}>
                  {d===today&&<span style={{background:"#e6af00",color:"#000",fontSize:"0.6rem",
                    fontWeight:800,padding:"1px 5px",borderRadius:3}}>TODAY</span>}
                  {fmtDate(d)}
                </div>
                {ms.map((m,i)=><MatchRow key={i} m={m} now={now} scores={scores} spoiler={spoiler}/>)}
              </div>
            ))}

          <div style={{borderTop:"1px solid #21262d",paddingTop:10,marginTop:4,
            display:"flex",gap:8,flexWrap:"wrap",fontSize:"0.66rem",color:"#8b949e",alignItems:"center"}}>
            {Object.entries(TV_COLOR).map(([k,v])=>(
              <span key={k} style={{display:"flex",alignItems:"center",gap:3}}>
                <span style={{background:v,width:7,height:7,borderRadius:2,display:"inline-block"}}/>
                {k}
              </span>
            ))}
            <span>BSP4K 全試合</span>
          </div>
          <div style={{fontSize:"0.62rem",color:"#8b949e",marginTop:4,display:"flex",alignItems:"center",gap:6}}>
            {apiStatus==="loading"&&<span>⏳ スコア取得中...</span>}
            {apiStatus==="ok"&&lastFetch&&<span>✅ スコア更新: {lastFetch.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})}</span>}
            {apiStatus==="error"&&<span>⚠️ API取得失敗（大会中のみ有効）</span>}
            <button onClick={fetchScores} style={{background:"#21262d",border:"1px solid #30363d",
              borderRadius:4,color:"#8b949e",fontSize:"0.62rem",padding:"1px 6px",cursor:"pointer"}}>
              🔄 再取得
            </button>
          </div>
        </>}

        {/* ===== 順位表タブ ===== */}
        {tab==="groups"&&<>
          <div style={{fontSize:"0.74rem",color:"#8b949e",marginBottom:10,padding:"8px 10px",
            background:"#161b22",borderRadius:8,border:"1px solid #21262d",lineHeight:1.7}}>
            <span style={{color:"#2ea043",fontWeight:700}}>1〜2位</span>：ラウンド32へ直接進出　
            <span style={{color:"#f0883e",fontWeight:700}}>3位</span>：上位<span style={{color:"#e6af00",fontWeight:700}}>8チーム</span>のみ進出<br/>
            <span style={{fontSize:"0.62rem"}}>3位ランク：①勝点 ②得失点差 ③総得点 ④フェアプレー ⑤FIFAランク</span>
          </div>
          {Object.keys(GROUPS).map(g=>(
            <GroupTable key={g} groupKey={g} stats={groupStats[g]}/>
          ))}
        </>}

        {/* ===== 決勝Tタブ ===== */}
        {tab==="bracket"&&<>
          <div style={{fontSize:"0.72rem",color:"#8b949e",marginBottom:10,padding:"8px 10px",
            background:"#161b22",borderRadius:8,border:"1px solid #21262d",lineHeight:1.7}}>
            3位チームの対戦相手は<span style={{color:"#e6af00",fontWeight:700}}>495通り（FIFA Annex C）</span>で事前規定。<br/>
            GL全日程終了後に自動確定します。🃏マークのスロットは3位チームが入る枠です。
          </div>
          {[["ラウンド32",R32_SLOTS],["ラウンド16",R16_SLOTS],["準々決勝",QF_SLOTS],
            ["準決勝",SF_SLOTS],["最終",FIN_SLOTS]].map(([label,slots])=>(
            <div key={label} style={{marginBottom:14}}>
              <div style={{fontSize:"0.74rem",fontWeight:700,color:"#8b949e",
                padding:"4px 0",borderBottom:"1px solid #21262d",marginBottom:5}}>
                {label}
              </div>
              {slots.map((s,i)=><BracketRow key={i} s={s} now={now}/>)}
            </div>
          ))}
          <div style={{background:"#161b22",border:"1px solid #30363d",borderRadius:8,padding:12,marginTop:4}}>
            <div style={{fontWeight:700,fontSize:"0.78rem",color:"#e6af00",marginBottom:5}}>🔀 FIFA Annex C とは</div>
            <div style={{fontSize:"0.7rem",color:"#8b949e",lineHeight:1.7}}>
              12組の3位から8チーム選ぶ組み合わせは<span style={{color:"#e6edf3",fontWeight:700}}>495通り</span>。<br/>
              全パターンに対しスロット割り当てが事前規定されているため、GL終了後に追加抽選なしで即座にブラケットが確定します。
            </div>
          </div>
        </>}
      </div>

      <style>{`
        *{box-sizing:border-box}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#0d1117}
        ::-webkit-scrollbar-thumb{background:#30363d;border-radius:4px}
      `}</style>
    </div>
  );
}

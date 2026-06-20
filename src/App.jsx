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

// FIFA match centre URL は FIFA公式API から実IDを取得して構築する
// （IDは連番ではないため、起動時に api.fifa.com から全試合マップを取得）
const FIFA_API = "https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&count=500&language=en";

// アクセント記号を除去して小文字化（Türkiye→turkiye, Curaçao→curacao, Côte d'Ivoire→cote d'ivoire）
function normName(s) {
  return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}

function makeInitialStats(teams) {
  return teams.map(name => ({ name, w:0, d:0, l:0, gf:0, ga:0 }));
}

// ─── 2026ルールのタイブレーク順位付け ─────────────────────────────
// FIFA World Cup 2026 第13条:
//  1. 勝ち点（全試合）
//  2. 当該チーム間（直接対決）の勝ち点
//  3. 当該チーム間の得失点差
//  4. 当該チーム間の総得点
//  5. 全試合の得失点差
//  6. 全試合の総得点
//  （以降フェアプレー・FIFAランクは手元データなしのため未実装）
//
// statsArr: [{name,w,d,l,gf,ga}], h2hGames: 当該グループの確定試合 [{home,away,hs,as}]
function rankGroup(statsArr, h2hGames) {
  // 基本指標を付与
  const base = statsArr.map(s => ({
    ...s, pts: s.w*3+s.d, gd: s.gf-s.ga, played: s.w+s.d+s.l
  }));

  // 当該チーム集合内だけのミニ順位表を計算するヘルパー
  const miniStats = (names) => {
    const set = new Set(names);
    const m = {};
    names.forEach(n => { m[n] = {pts:0, gd:0, gf:0}; });
    h2hGames.forEach(g => {
      if (!set.has(g.home) || !set.has(g.away)) return; // 当該チーム同士の試合のみ
      const hs=g.hs, as_=g.as;
      // 勝ち点
      if (hs>as_) m[g.home].pts+=3;
      else if (hs<as_) m[g.away].pts+=3;
      else { m[g.home].pts+=1; m[g.away].pts+=1; }
      // 得失点・得点
      m[g.home].gd += hs-as_; m[g.away].gd += as_-hs;
      m[g.home].gf += hs;     m[g.away].gf += as_;
    });
    return m;
  };

  // 比較関数（同点グループ内で再帰的に直接対決を見る）
  const cmp = (a, b) => {
    // 1. 全体勝ち点
    if (b.pts !== a.pts) return b.pts - a.pts;
    // 2〜4. 同勝ち点で並ぶチーム集合を特定し、その中での直接対決を見る
    const tiedNames = base.filter(t => t.pts === a.pts).map(t => t.name);
    if (tiedNames.length >= 2) {
      const mini = miniStats(tiedNames);
      const ma = mini[a.name], mb = mini[b.name];
      if (ma && mb) {
        if (mb.pts !== ma.pts) return mb.pts - ma.pts; // 直接対決の勝ち点
        if (mb.gd  !== ma.gd ) return mb.gd  - ma.gd;  // 直接対決の得失点差
        if (mb.gf  !== ma.gf ) return mb.gf  - ma.gf;  // 直接対決の総得点
      }
    }
    // 5. 全体得失点差
    if (b.gd !== a.gd) return b.gd - a.gd;
    // 6. 全体総得点
    if (b.gf !== a.gf) return b.gf - a.gf;
    return 0;
  };

  return [...base].sort(cmp);
}

// scores と GROUP_MATCHES から、指定グループの確定済み直接対決リストを作る
function groupH2H(groupKey, scores, groupMatches, teamGroup) {
  const out = [];
  groupMatches.forEach(m => {
    if (teamGroup[m.home] !== groupKey) return;
    const sc = scores[m.id];
    if (!sc || sc.h==null || sc.a==null) return;
    out.push({home:m.home, away:m.away, hs:Number(sc.h), as:Number(sc.a)});
  });
  return out;
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
  { id:"g007", date:"2026-06-14",time:"10:00",home:"🇭🇹 ハイチ",away:"🏴󠁧󠁢󠁳󠁣󠁴󠁿 スコットランド",group:"C組1節",tv:["NHK"] },
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

// 深夜の試合も翌日の実時刻表記（26:00ではなく翌日2:00）で扱う
function jstDisp(date, time) {
  return time;
}
function koDate(date, time) {
  return new Date(`${date}T${time}:00+09:00`);
}
function dispDate(date, time) {
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
function GroupTable({groupKey, stats, h2h, clinch}) {
  const rows = rankGroup(stats, h2h||[]);

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
            {/* チーム名＋確定マーク */}
            <span style={{fontSize:"0.8rem",fontWeight:isJapan?700:400,
              color:isJapan?"#79c0ff":"#e6edf3",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {t.name}
              {clinch&&clinch[t.name]==="first"&&<span title="1位通過確定" style={{marginLeft:3}}>🥇</span>}
              {clinch&&clinch[t.name]==="advance"&&<span title="突破確定" style={{marginLeft:3}}>✅</span>}
              {clinch&&clinch[t.name]==="out"&&<span title="敗退確定" style={{marginLeft:3,opacity:0.7}}>❌</span>}
            </span>
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

// ─── 3位チーム比較順位表 ─────────────────────────────────────────
function ThirdPlaceTable({groupStats, h2hByGroup}) {
  // 各組の3位を抽出（組内順位は2026ルール=直接対決優先）
  // 3位同士の比較は規定通り全体成績（勝点→得失点差→総得点）で行う
  const thirds = Object.entries(groupStats).map(([g, stats])=>{
    const sorted = rankGroup(stats, (h2hByGroup&&h2hByGroup[g])||[]);
    return { group: g, ...sorted[2] };
  }).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);

  return (
    <div style={{background:"#161b22",border:"1px solid #e6af0044",borderRadius:8,
      marginTop:16,overflow:"hidden"}}>
      <div style={{background:"#1f1a00",padding:"6px 10px",fontSize:"0.78rem",
        fontWeight:800,color:"#e6af00",letterSpacing:"0.05em"}}>
        🃏 3位チーム比較（上位8チームが決勝T進出）
      </div>
      <div style={{display:"grid",gridTemplateColumns:"14px 22px 1fr 30px 22px 28px 28px",
        gap:"0 3px",padding:"3px 10px 2px",alignItems:"center"}}>
        {["","組","","勝点","試","差","得"].map((h,i)=>(
          <span key={i} style={{fontSize:"0.62rem",color:"#8b949e",
            textAlign:i===1?"center":"right"}}>{h}</span>
        ))}
      </div>
      {thirds.map((t,i)=>{
        const rank = i+1;
        const advance = rank <= 8;
        const isJapan = t.name.includes("日本");
        const gdStr = t.gd>0?`+${t.gd}`:`${t.gd}`;
        return (
          <div key={t.group} style={{display:"grid",
            gridTemplateColumns:"14px 22px 1fr 30px 22px 28px 28px",
            gap:"0 3px",padding:"5px 10px",alignItems:"center",
            borderTop: rank===9 ? "2px solid #f8514966" : "1px solid #21262d",
            background: isJapan ? "rgba(31,111,235,0.08)"
              : advance ? "rgba(46,160,67,0.05)" : "rgba(248,81,73,0.04)"}}>
            <span style={{fontSize:"0.68rem",fontWeight:800,textAlign:"center",
              color:advance?"#2ea043":"#f85149"}}>{rank}</span>
            <span style={{fontSize:"0.7rem",fontWeight:700,color:"#8b949e",
              textAlign:"center"}}>{t.group}</span>
            <span style={{fontSize:"0.8rem",fontWeight:isJapan?700:400,
              color:isJapan?"#79c0ff":advance?"#e6edf3":"#8b949e",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {t.name}
              {!advance&&<span style={{fontSize:"0.6rem",color:"#f85149",marginLeft:4}}>敗退圏</span>}
            </span>
            <span style={{fontFamily:"monospace",fontSize:"0.88rem",fontWeight:800,
              textAlign:"right",color:advance?"#2ea043":"#f85149"}}>{t.pts}</span>
            <span style={{fontFamily:"monospace",fontSize:"0.76rem",color:"#8b949e",
              textAlign:"right"}}>{t.played}</span>
            <span style={{fontFamily:"monospace",fontSize:"0.76rem",fontWeight:700,textAlign:"right",
              color:t.gd>0?"#2ea043":t.gd<0?"#f85149":"#8b949e"}}>{gdStr}</span>
            <span style={{fontFamily:"monospace",fontSize:"0.76rem",color:"#8b949e",
              textAlign:"right"}}>{t.gf}</span>
          </div>
        );
      })}
      <div style={{padding:"4px 10px 6px",fontSize:"0.62rem",color:"#8b949e",lineHeight:1.5}}>
        順位基準：①勝点 ②得失点差 ③総得点（④フェアプレー ⑤FIFAランクは手元データなし）<br/>
        <span style={{color:"#2ea043"}}>■ 1〜8位：決勝T進出</span>　
        <span style={{color:"#f85149"}}>■ 9〜12位：敗退</span>
      </div>
    </div>
  );
}

// ─── 試合カード（自動取得＋手動編集・ネタバレ防止対応） ──────────
function MatchRow({m, now, scores, spoiler, onManualScore}) {
  const ko  = koDate(m.date, m.time);
  const end = new Date(ko.getTime()+110*60*1000);
  const live = now>=ko && now<=end;
  const past = now>end;
  const sc = scores[m.id];
  const hasScore = sc && sc.h!=null && sc.a!=null;
  const [revealed, setRevealed] = useState(false);
  const hidden = spoiler && past && !live;
  // 編集モード
  const [editing, setEditing] = useState(false);
  const [eh, setEh] = useState(sc?.h ?? "");
  const [ea, setEa] = useState(sc?.a ?? "");
  const canEdit = !!m.id; // グループ試合のみ（決勝Tはカード未確定なので対象外）

  const openEdit = ()=>{
    setEh(sc?.h ?? ""); setEa(sc?.a ?? "");
    setEditing(true);
  };
  const saveEdit = ()=>{
    if (eh==="" || ea==="") { onManualScore(m.id, null, null); }
    else { onManualScore(m.id, eh, ea); }
    setEditing(false);
  };

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
          {editing ? (
            <div style={{display:"flex",alignItems:"center",gap:2,justifyContent:"center"}}>
              <input type="number" min="0" max="30" value={eh} onChange={e=>setEh(e.target.value)}
                style={{width:26,background:"#0d1117",border:"1px solid #1f6feb",borderRadius:3,
                  color:"#e6edf3",fontSize:"0.85rem",fontWeight:800,textAlign:"center",padding:"1px 0"}}/>
              <span style={{color:"#8b949e",fontSize:"0.8rem"}}>-</span>
              <input type="number" min="0" max="30" value={ea} onChange={e=>setEa(e.target.value)}
                style={{width:26,background:"#0d1117",border:"1px solid #1f6feb",borderRadius:3,
                  color:"#e6edf3",fontSize:"0.85rem",fontWeight:800,textAlign:"center",padding:"1px 0"}}/>
            </div>
          ) : hasScore ? (
            hidden && !revealed ? (
              <button onClick={()=>setRevealed(true)} style={{
                background:"#21262d",border:"1px solid #30363d",borderRadius:4,
                color:"#8b949e",fontSize:"0.62rem",padding:"2px 6px",cursor:"pointer"}}>
                終了 👁
              </button>
            ) : (
              <span onClick={canEdit?openEdit:undefined} style={{fontFamily:"monospace",
                fontSize:"1rem",fontWeight:800,letterSpacing:1,cursor:canEdit?"pointer":"default",
                color:live?"#f0883e":"#e6edf3"}}>
                {sc.h} - {sc.a}{sc.manual&&<span style={{fontSize:"0.55rem",color:"#6e3a9a",marginLeft:2}}>✎</span>}
              </span>
            )
          ) : canEdit && past ? (
            <button onClick={openEdit} style={{background:"transparent",border:"1px dashed #30363d",
              borderRadius:4,color:"#6e7681",fontSize:"0.6rem",padding:"2px 5px",cursor:"pointer"}}>
              入力
            </button>
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

      {/* 編集モードの保存/クリアボタン */}
      {editing && (
        <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:6}}>
          <button onClick={saveEdit} style={{background:"#1f6feb",color:"#fff",border:"none",
            borderRadius:4,fontSize:"0.66rem",padding:"3px 12px",cursor:"pointer",fontWeight:700}}>保存</button>
          <button onClick={()=>{onManualScore(m.id,null,null);setEditing(false);}} style={{
            background:"#21262d",color:"#8b949e",border:"1px solid #30363d",
            borderRadius:4,fontSize:"0.66rem",padding:"3px 10px",cursor:"pointer"}}>自動に戻す</button>
          <button onClick={()=>setEditing(false)} style={{background:"transparent",color:"#6e7681",
            border:"none",fontSize:"0.66rem",padding:"3px 6px",cursor:"pointer"}}>×</button>
        </div>
      )}

      {/* 2行目：組・FIFAリンク・放送 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:3}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:"0.66rem",color:"#8b949e"}}>{m.groupLabel||(m.group||"").replace(/\d+節$/,"")}</span>
          {m.fifaLink&&(
            <a href={m.fifaLink} target="_blank" rel="noopener noreferrer"
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
function BracketRow({s, now, slotTeam}) {
  const isThird = s.away&&s.away.startsWith("3rd_");
  const thirdGs = isThird ? s.away.replace("3rd_","").split("").join("・") : null;
  // 確定済みスロットなら実チーム名、未確定なら「A組1位」等のプレースホルダ
  const resolveWithTeam = (key) => {
    if (slotTeam && slotTeam[key]) return slotTeam[key];
    return resolveSlot(key||"—");
  };
  const homeL   = resolveWithTeam(s.home);
  const awayL   = isThird ? "3位通過枠" : resolveWithTeam(s.away||"TBD");
  const homeFixed = slotTeam && s.home && slotTeam[s.home];
  const awayFixed = slotTeam && s.away && slotTeam[s.away];
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
            <span style={{color:homeFixed?"#79c0ff":"#e6edf3"}}>{homeL}</span>
            <span style={{color:"#8b949e",margin:"0 4px",fontWeight:400,fontSize:"0.72rem"}}>vs</span>
            <span style={{color:awayFixed?"#79c0ff":"#e6edf3"}}>{awayL}</span>
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
  const [postMode, setPostMode] = useState("tomorrow"); // tomorrow | result
  const [copied, setCopied] = useState(false);
  const [spoiler, setSpoiler] = useState(false); // ネタバレ防止

  // スコア state: { [matchId]: {h, a, final} }  APIから自動取得
  // 確定済みスコアはlocalStorageに永続化（再読み込み時に即復元）
  const [scores, setScores] = useState(()=>{
    try {
      const saved = localStorage.getItem("wc2026_scores");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; } // Claudeプレビュー等localStorage不可の環境でも動作
  });
  const [apiStatus, setApiStatus] = useState("idle"); // idle | loading | ok | error
  const [lastFetch, setLastFetch] = useState(null);
  // FIFA試合ページURLマップ: {内部試合キー: URL}
  const [fifaLinks, setFifaLinks] = useState({});

  // FIFA公式APIから「リンク」と「スコア」を一括取得
  // FIFAの試合データに紐づく内部キーを返す（group=id / knockout="m"+match）
  const matchFifaResult = (fm) => {
    const fh = normName(fm.Home?.TeamName?.[0]?.Description || fm.PlaceHolderA);
    const fa = normName(fm.Away?.TeamName?.[0]?.Description || fm.PlaceHolderB);
    // 名前両方一致（グループ）
    let g = GROUP_MATCHES.find(m=>{
      const he=TEAM_EN[m.home], ae=TEAM_EN[m.away];
      return he&&ae&&fh.includes(he)&&fa.includes(ae);
    });
    if (g) return {key:g.id, group:g};
    // 名前片方一致
    g = GROUP_MATCHES.find(m=>{
      const he=TEAM_EN[m.home], ae=TEAM_EN[m.away];
      return he&&ae&&(fh.includes(he)||fa.includes(ae));
    });
    if (g) return {key:g.id, group:g};
    // キックオフ日時一致
    if (fm.Date) {
      const ko = new Date(fm.Date).getTime();
      const gm = GROUP_MATCHES.find(m=>koDate(m.date,m.time).getTime()===ko);
      if (gm) return {key:gm.id, group:gm};
      const slot = [...R32_SLOTS,...R16_SLOTS,...QF_SLOTS,...SF_SLOTS,...FIN_SLOTS]
        .find(s=>koDate(s.date,s.time).getTime()===ko);
      if (slot) return {key:"m"+slot.match, group:null};
    }
    return null;
  };

  const fetchScores = useCallback(async ()=>{
    setApiStatus("loading");
    try {
      const res = await fetch(FIFA_API, {signal: AbortSignal.timeout(10000)});
      if (!res.ok) throw new Error("HTTP "+res.status);
      const data = await res.json();
      const results = data.Results || [];
      const linkMap = {};
      const scoreMap = {};
      results.forEach(fm=>{
        const m = matchFifaResult(fm);
        if (!m) return;
        // リンク
        linkMap[m.key] = `https://www.fifa.com/en/match-centre/match/${fm.IdCompetition}/${fm.IdSeason}/${fm.IdStage}/${fm.IdMatch}`;
        // スコア: Home/AwayTeamScore が数値で入っていれば採用
        // MatchStatusの整数の意味はエンドポイントで揺れるため日時で判定する
        const hs = fm.HomeTeamScore, as_ = fm.AwayTeamScore;
        const ko = fm.Date ? new Date(fm.Date).getTime() : 0;
        const started = ko && Date.now() >= ko;          // KO時刻を過ぎた試合のみ
        const isFinal = ko && (Date.now()-ko) > 120*60*1000; // KOから2時間超で確定ロック
        if (hs!=null && as_!=null && started) {
          scoreMap[m.key] = {h:Number(hs), a:Number(as_), final:!!isFinal};
        }
      });
      if (Object.keys(linkMap).length) setFifaLinks(linkMap);
      // 確定済み/手動編集済みは上書きしない
      setScores(prev=>{
        const next = {...prev};
        Object.entries(scoreMap).forEach(([id,sc])=>{
          if (next[id]?.final || next[id]?.manual) return; // 確定 or 手動は固定
          next[id] = sc;
        });
        try {
          const keep = Object.fromEntries(
            Object.entries(next).filter(([,sc])=>sc.final||sc.manual)
          );
          localStorage.setItem("wc2026_scores", JSON.stringify(keep));
        } catch {}
        return next;
      });
      setApiStatus("ok");
      setLastFetch(new Date());
    } catch(e) {
      setApiStatus("error");
    }
  }, []);

  // 手動でスコアを設定（manualフラグで自動更新から保護）
  const setManualScore = useCallback((id, h, a)=>{
    setScores(prev=>{
      const next = {...prev};
      if (h===null && a===null) {
        // クリア → 自動取得に戻す
        delete next[id];
      } else {
        next[id] = {h:Number(h), a:Number(a), final:true, manual:true};
      }
      try {
        const keep = Object.fromEntries(
          Object.entries(next).filter(([,sc])=>sc.final||sc.manual)
        );
        localStorage.setItem("wc2026_scores", JSON.stringify(keep));
      } catch {}
      return next;
    });
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

  // スコアが更新されたら、全試合を集計して順位表を作り直す（累積）
  useEffect(()=>{
    // まっさらな初期stats
    const fresh = {};
    Object.entries(GROUPS).forEach(([k,teams])=>{ fresh[k]=makeInitialStats(teams); });

    // 全グループ試合のスコアを走査して加算
    Object.entries(scores).forEach(([id, sc])=>{
      const m = GROUP_MATCHES.find(x=>x.id===id);
      if (!m) return;
      const hv = parseInt(sc.h), av = parseInt(sc.a);
      if (isNaN(hv)||isNaN(av)) return;
      const g = TEAM_GROUP[m.home];
      if (!g || g!==TEAM_GROUP[m.away]) return; // 同一グループの試合のみ
      const arr = fresh[g];
      const hi = arr.findIndex(t=>t.name===m.home);
      const ai = arr.findIndex(t=>t.name===m.away);
      if (hi<0||ai<0) return;
      // ホーム加算
      arr[hi] = {...arr[hi],
        w: arr[hi].w + (hv>av?1:0), d: arr[hi].d + (hv===av?1:0), l: arr[hi].l + (hv<av?1:0),
        gf: arr[hi].gf + hv, ga: arr[hi].ga + av};
      // アウェイ加算
      arr[ai] = {...arr[ai],
        w: arr[ai].w + (av>hv?1:0), d: arr[ai].d + (av===hv?1:0), l: arr[ai].l + (av<hv?1:0),
        gf: arr[ai].gf + av, ga: arr[ai].ga + hv};
    });
    setGroupStats(fresh);
  },[scores]);

  // 各グループの確定済み直接対決リスト
  const h2hByGroup = useMemo(()=>{
    const map = {};
    Object.keys(GROUPS).forEach(g=>{
      map[g] = groupH2H(g, scores, GROUP_MATCHES, TEAM_GROUP);
    });
    return map;
  },[scores]);

  // 突破/敗退/1位の「確定」判定
  // 各グループの未消化試合を全パターン総当たりで展開し、
  // どの結果でも順位条件が変わらないチームを確定とみなす
  const clinchData = useMemo(()=>{
    const result = {}; // {teamName: "first"|"advance"|"out"}
    const slotTeam = {}; // {"A1":"🇲🇽 メキシコ", ...} 順位が一意に確定したスロットのみ
    Object.keys(GROUPS).forEach(g=>{
      const teams = GROUPS[g];
      // このグループの全6試合（固定対戦カード）
      const fixtures = GROUP_MATCHES.filter(m=>TEAM_GROUP[m.home]===g);
      // 既知スコアと未消化試合に分ける
      const known = [];
      const pending = [];
      fixtures.forEach(m=>{
        const sc = scores[m.id];
        if (sc && sc.h!=null && sc.a!=null) known.push({home:m.home,away:m.away,hs:Number(sc.h),as:Number(sc.a)});
        else pending.push({home:m.home,away:m.away});
      });
      // 未消化が多いと組合せ爆発するため上限を設ける
      // スコアパターンに大差(6点差等)も含め、得失点差による順位逆転を網羅する。
      // これがないと「大敗で得失点差が逆転して3位落ち」のケースを見逃し誤確定する。
      // 7パターン: 引分/小勝/中勝/大勝 とその逆。7^4=2401（残り4試合）まで許容。
      if (pending.length > 4) return;
      const outcomes = [[0,0],[1,0],[3,0],[6,0],[0,1],[0,3],[0,6]];
      const base = outcomes.length;
      const combos = Math.pow(base, pending.length);
      // 各チームが取りうる最終順位の集合
      const possibleRanks = {}; teams.forEach(t=>possibleRanks[t]=new Set());

      for (let c=0; c<combos; c++){
        // この組み合わせのスコアを構築
        const sim = [...known];
        let cc = c;
        pending.forEach(p=>{
          const [hs,as_] = outcomes[cc%base]; cc=Math.floor(cc/base);
          sim.push({home:p.home,away:p.away,hs,as:as_});
        });
        // simから各チームstatsを集計
        const st = {}; teams.forEach(t=>st[t]={name:t,w:0,d:0,l:0,gf:0,ga:0});
        sim.forEach(gm=>{
          st[gm.home].gf+=gm.hs; st[gm.home].ga+=gm.as;
          st[gm.away].gf+=gm.as; st[gm.away].ga+=gm.hs;
          if(gm.hs>gm.as){st[gm.home].w++;st[gm.away].l++;}
          else if(gm.hs<gm.as){st[gm.away].w++;st[gm.home].l++;}
          else {st[gm.home].d++;st[gm.away].d++;}
        });
        const ranked = rankGroup(teams.map(t=>st[t]), sim);
        ranked.forEach((t,idx)=>possibleRanks[t.name].add(idx+1));
      }

      // 判定: 全パターンで順位が一定範囲なら確定
      teams.forEach(t=>{
        const ranks = possibleRanks[t];
        if (ranks.size===0) return;
        const max = Math.max(...ranks), min = Math.min(...ranks);
        if (max===1) result[t]="first";          // 常に1位
        else if (max<=2) result[t]="advance";     // 常に1〜2位（突破確定）
        else if (min>=4) result[t]="out";         // 常に4位（敗退確定）
        // 3位は他グループ次第なので確定扱いにしない
        // 順位が一意に確定（取りうる順位が1つだけ）なら決勝Tスロットに反映
        if (ranks.size===1) {
          const fixedRank = min; // = max
          if (fixedRank===1) slotTeam[g+"1"] = t;
          else if (fixedRank===2) slotTeam[g+"2"] = t;
        }
      });
    });
    return { result, slotTeam };
  },[scores]);
  const clinchByGroup = clinchData.result;
  const slotTeam = clinchData.slotTeam;

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
    const gm = GROUP_MATCHES.map(m=>({...m, phase:"group", matchNo: parseInt(m.id.slice(1),10), fifaLink: fifaLinks[m.id]}));
    const r32 = R32_SLOTS.map(s=>({
      date:s.date,time:s.time,phase:"r32",tv:s.tv,matchNo:s.match,fifaLink:fifaLinks["m"+s.match],
      home:resolveSlot(s.home),
      away:s.away.startsWith("3rd_")
        ?`3位通過枠(${s.away.replace("3rd_","").split("").join("・")}組)`
        :resolveSlot(s.away),
      groupLabel:`R32 M${s.match}`,
      thirdNote:s.away.startsWith("3rd_")?s.away.replace("3rd_","").split("").join("・")+"組":null,
    }));
    const r16 = R16_SLOTS.map(s=>({date:s.date,time:s.time,phase:"r16",tv:s.tv,matchNo:s.match,fifaLink:fifaLinks["m"+s.match],
      home:s.home,away:s.away,groupLabel:`R16 M${s.match}`}));
    const qf  = QF_SLOTS.map(s=>({date:s.date,time:s.time,phase:"qf",tv:s.tv,matchNo:s.match,fifaLink:fifaLinks["m"+s.match],
      home:"TBD",away:"TBD",groupLabel:`準々決勝 M${s.match}`}));
    const sf  = SF_SLOTS.map(s=>({date:s.date,time:s.time,phase:"sf",tv:s.tv,matchNo:s.match,fifaLink:fifaLinks["m"+s.match],
      home:"TBD",away:"TBD",groupLabel:`準決勝 M${s.match}`}));
    const fin = FIN_SLOTS.map(s=>({date:s.date,time:s.time,phase:"final",tv:s.tv,matchNo:s.match,fifaLink:fifaLinks["m"+s.match],
      home:"TBD",away:"TBD",groupLabel:s.label}));
    return [...gm,...r32,...r16,...qf,...sf,...fin];
  },[fifaLinks]);

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

  // 「明日」= JST翌カレンダー日の試合
  const tomorrowMatches = useMemo(()=>{
    const t = new Date(now.getTime()+9*60*60*1000); // JST
    t.setUTCDate(t.getUTCDate()+1);
    const tomorrow = t.toISOString().slice(0,10);
    return allMatches
      .filter(m=>dispDate(m.date,m.time)===tomorrow)
      .sort((a,b)=>koDate(a.date,a.time)-koDate(b.date,b.time));
  },[allMatches,now]);

  const tweetText = useMemo(()=>{
    if (!tomorrowMatches.length) return "";
    // 日付ごとにグルーピング（基本は1日だが安全のため汎用化）
    const byDate = {};
    tomorrowMatches.forEach(m=>{
      const d = dispDate(m.date,m.time);
      (byDate[d]=byDate[d]||[]).push(m);
    });
    const blocks = Object.entries(byDate).map(([d,ms])=>{
      const header = fmtDate(d);
      const rows = ms.map(m=>{
        const t = jstDisp(m.date,m.time);
        const label = m.groupLabel||(m.group||"").replace(/\d+節$/,"");
        const tv = m.tv&&m.tv.length>0?` 📺${m.tv.join("/")}・配信DAZN`:" 📡DAZN";
        return `${t} ${m.home} vs ${m.away}（${label}）${tv}`;
      });
      return `${header}\n${rows.join("\n")}`;
    });
    return `⚽ #W杯2026 明日の試合\n\n${blocks.join("\n\n")}\n\n#FIFAWorldCup`;
  },[tomorrowMatches]);

  // 「本日」= JST当日の、スコアが確定している試合の結果
  const todayResults = useMemo(()=>{
    const today = todayJST();
    return allMatches
      .filter(m=>dispDate(m.date,m.time)===today && m.id && scores[m.id]
        && scores[m.id].h!=null && scores[m.id].a!=null)
      .sort((a,b)=>koDate(a.date,a.time)-koDate(b.date,b.time));
  },[allMatches,scores]);

  const resultTweetText = useMemo(()=>{
    if (!todayResults.length) return "";
    const today = todayJST();
    const rows = todayResults.map(m=>{
      const sc = scores[m.id];
      const label = (m.group||"").replace(/\d+節$/,"");
      // 勝者を太字代わりに🏆で示す
      const mark = sc.h>sc.a ? "◀" : sc.h<sc.a ? "▶" : "＝";
      return `${m.home} ${sc.h}-${sc.a} ${m.away}（${label}）`;
    });
    return `⚽ #W杯2026 本日の結果\n${fmtDate(today)}\n\n${rows.join("\n")}\n\n#FIFAWorldCup`;
  },[todayResults,scores]);

  const today = todayJST();

  // 順位表を canvas に描画して画像ダウンロード
  const downloadGroupImage = useCallback((groupKey)=>{
    const teams = GROUPS[groupKey];
    const stats = groupStats[groupKey];
    const rows = rankGroup(stats, h2hByGroup[groupKey]||[]);

    const W = 1000, rowH = 90, headH = 150, footH = 70;
    const H = headH + rowH*4 + footH;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");

    // 背景
    ctx.fillStyle = "#0d1117"; ctx.fillRect(0,0,W,H);
    // ヘッダー帯
    ctx.fillStyle = "#1a2e1a"; ctx.fillRect(0,0,W,headH);
    ctx.fillStyle = "#2ea043";
    ctx.font = "bold 52px 'Hiragino Sans','Meiryo',sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(`⚽ ${groupKey}組 順位表`, 40, 60);
    ctx.fillStyle = "#8b949e";
    ctx.font = "28px 'Hiragino Sans','Meiryo',sans-serif";
    ctx.fillText(`FIFA World Cup 2026 · ${fmtDate(today)}時点`, 42, 115);

    // 列ヘッダー
    const colX = { rank:50, team:120, pts:560, played:660, w:740, d:810, l:880, gd:960 };
    ctx.fillStyle = "#6e7681";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("勝点", colX.pts, headH-20);
    ctx.fillText("試", colX.played, headH-20);
    ctx.fillText("勝", colX.w, headH-20);
    ctx.fillText("分", colX.d, headH-20);
    ctx.fillText("負", colX.l, headH-20);
    ctx.fillText("差", colX.gd, headH-20);

    // 各行
    rows.forEach((t,i)=>{
      const y = headH + rowH*i + rowH/2;
      const rank = i+1;
      const advance = rank<=2;
      const third = rank===3;
      // 行背景
      ctx.fillStyle = i%2===0 ? "#161b22" : "#0f141a";
      ctx.fillRect(0, headH+rowH*i, W, rowH);
      // 進出ステータスの左帯
      ctx.fillStyle = advance ? "#2ea043" : third ? "#f0883e" : "#6e7681";
      ctx.fillRect(0, headH+rowH*i, 10, rowH);
      // 順位
      ctx.fillStyle = advance ? "#2ea043" : third ? "#f0883e" : "#6e7681";
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(rank, colX.rank, y);
      // チーム名（絵文字含む）＋確定マーク
      ctx.fillStyle = "#e6edf3";
      ctx.font = "36px 'Hiragino Sans','Meiryo',sans-serif";
      ctx.textAlign = "left";
      const cl = clinchByGroup[t.name];
      const mark = cl==="first"?" 🥇":cl==="advance"?" ✅":cl==="out"?" ❌":"";
      ctx.fillText(t.name + mark, colX.team, y);
      // 勝点（強調）
      ctx.fillStyle = advance ? "#2ea043" : third ? "#f0883e" : "#e6edf3";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(t.pts, colX.pts, y);
      // 試勝分負
      ctx.fillStyle = "#8b949e";
      ctx.font = "34px sans-serif";
      ctx.fillText(t.played, colX.played, y);
      ctx.fillText(t.w, colX.w, y);
      ctx.fillText(t.d, colX.d, y);
      ctx.fillText(t.l, colX.l, y);
      // 得失点差
      ctx.fillStyle = t.gd>0?"#2ea043":t.gd<0?"#f85149":"#8b949e";
      ctx.fillText(t.gd>0?`+${t.gd}`:`${t.gd}`, colX.gd, y);
    });

    // フッター凡例
    ctx.textAlign = "left";
    ctx.font = "24px 'Hiragino Sans','Meiryo',sans-serif";
    ctx.fillStyle = "#2ea043"; ctx.fillText("■ 1〜2位 突破", 40, H-38);
    ctx.fillStyle = "#f0883e"; ctx.fillText("■ 3位 プレーオフ圏", 280, H-38);
    ctx.fillStyle = "#6e7681"; ctx.fillText("■ 4位 敗退", 600, H-38);

    // ダウンロード
    cv.toBlob(blob=>{
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wc2026_group${groupKey}.png`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
    }, "image/png");
  },[groupStats,today,h2hByGroup,clinchByGroup]);

  // 3位チーム比較表を画像化
  const downloadThirdImage = useCallback(()=>{
    const thirds = Object.entries(groupStats).map(([g,stats])=>{
      const sorted = rankGroup(stats, h2hByGroup[g]||[]);
      return {group:g, ...sorted[2]};
    }).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);

    const W=1000, rowH=72, headH=150, footH=70;
    const H = headH + rowH*12 + footH;
    const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    const ctx=cv.getContext("2d");
    ctx.fillStyle="#0d1117"; ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#1f1a00"; ctx.fillRect(0,0,W,headH);
    ctx.fillStyle="#e6af00"; ctx.font="bold 46px 'Hiragino Sans','Meiryo',sans-serif";
    ctx.textBaseline="middle";
    ctx.fillText("🃏 3位チーム比較（上位8チーム進出）", 36, 58);
    ctx.fillStyle="#8b949e"; ctx.font="26px 'Hiragino Sans','Meiryo',sans-serif";
    ctx.fillText(`FIFA World Cup 2026 · ${fmtDate(today)}時点`, 38, 112);

    const colX={rank:48,grp:120,team:200,pts:620,played:720,gd:820,gf:920};
    ctx.fillStyle="#6e7681"; ctx.font="bold 24px sans-serif"; ctx.textAlign="center";
    ctx.fillText("勝点",colX.pts,headH-18); ctx.fillText("試",colX.played,headH-18);
    ctx.fillText("差",colX.gd,headH-18); ctx.fillText("得",colX.gf,headH-18);

    thirds.forEach((t,i)=>{
      const y=headH+rowH*i+rowH/2, rank=i+1, advance=rank<=8;
      ctx.fillStyle = i%2===0?"#161b22":"#0f141a"; ctx.fillRect(0,headH+rowH*i,W,rowH);
      // 8位と9位の境界線
      if(rank===9){ ctx.strokeStyle="#f85149"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(0,headH+rowH*i); ctx.lineTo(W,headH+rowH*i); ctx.stroke(); }
      ctx.fillStyle=advance?"#2ea043":"#f85149"; ctx.fillRect(0,headH+rowH*i,10,rowH);
      ctx.fillStyle=advance?"#2ea043":"#f85149"; ctx.font="bold 34px sans-serif"; ctx.textAlign="center";
      ctx.fillText(rank,colX.rank,y);
      ctx.fillStyle="#8b949e"; ctx.font="bold 28px sans-serif";
      ctx.fillText(t.group+"組",colX.grp,y);
      ctx.fillStyle=advance?"#e6edf3":"#8b949e"; ctx.font="30px 'Hiragino Sans','Meiryo',sans-serif"; ctx.textAlign="left";
      ctx.fillText(t.name,colX.team,y);
      ctx.fillStyle=advance?"#2ea043":"#f85149"; ctx.font="bold 38px sans-serif"; ctx.textAlign="center";
      ctx.fillText(t.pts,colX.pts,y);
      ctx.fillStyle="#8b949e"; ctx.font="30px sans-serif";
      ctx.fillText(t.played,colX.played,y);
      ctx.fillStyle=t.gd>0?"#2ea043":t.gd<0?"#f85149":"#8b949e";
      ctx.fillText(t.gd>0?`+${t.gd}`:`${t.gd}`,colX.gd,y);
      ctx.fillStyle="#8b949e"; ctx.fillText(t.gf,colX.gf,y);
    });

    ctx.textAlign="left"; ctx.font="24px 'Hiragino Sans','Meiryo',sans-serif";
    ctx.fillStyle="#2ea043"; ctx.fillText("■ 1〜8位 決勝T進出",40,H-38);
    ctx.fillStyle="#f85149"; ctx.fillText("■ 9〜12位 敗退",420,H-38);

    cv.toBlob(blob=>{
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url; a.download="wc2026_thirdplace.png"; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    },"image/png");
  },[groupStats,today,h2hByGroup]);

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
          {/* 更新ボタン＋今日ボタン（日程タブのみ表示） */}
          {tab==="schedule"&&(
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={fetchScores} disabled={apiStatus==="loading"} style={{
                background:"#21262d",color:"#8b949e",border:"1px solid #30363d",
                borderRadius:20,padding:"5px 12px",fontSize:"0.76rem",
                cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                {apiStatus==="loading"?"⏳":"🔄"} 更新
              </button>
              <button onClick={scrollToToday} style={{
                background:"#21262d",color:"#e6edf3",border:"1px solid #30363d",
                borderRadius:20,padding:"5px 14px",fontSize:"0.76rem",
                cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                📅 今日
              </button>
            </div>
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
                {ms.map((m,i)=><MatchRow key={i} m={m} now={now} scores={scores} spoiler={spoiler} onManualScore={setManualScore}/>)}
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
            {apiStatus==="loading"&&<span>⏳ FIFAから取得中...</span>}
            {apiStatus==="ok"&&lastFetch&&<span>✅ 更新: {lastFetch.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})}（自動取得失敗時はスコアをタップで手動入力可）</span>}
            {apiStatus==="error"&&<span>⚠️ 自動取得失敗。終了試合のスコアをタップで手動入力できます</span>}
          </div>

          {/* フローティングXポストボタン（スクロール追従・2種） */}
          <div style={{position:"fixed",right:16,bottom:20,zIndex:20,
            display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
            {todayResults.length>0&&(
              <button onClick={()=>{setPostMode("result");setTweetOpen(true);}} style={{
                background:"#2ea043",color:"#fff",border:"none",borderRadius:28,
                padding:"10px 16px",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",
                boxShadow:"0 4px 14px rgba(0,0,0,0.5)",
                display:"flex",alignItems:"center",gap:6}}>
                𝕏 本日の結果
                <span style={{background:"#fff",color:"#2ea043",borderRadius:"50%",
                  width:18,height:18,fontSize:"0.66rem",display:"flex",alignItems:"center",
                  justifyContent:"center",fontWeight:800}}>{todayResults.length}</span>
              </button>
            )}
            <button onClick={()=>{setPostMode("tomorrow");setTweetOpen(true);}} style={{
              background:"#1d9bf0",color:"#fff",border:"none",borderRadius:28,
              padding:"10px 16px",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",
              boxShadow:"0 4px 14px rgba(0,0,0,0.5)",
              display:"flex",alignItems:"center",gap:6}}>
              𝕏 明日の試合
              {tomorrowMatches.length>0&&<span style={{background:"#fff",color:"#1d9bf0",
                borderRadius:"50%",width:18,height:18,fontSize:"0.66rem",
                display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>
                {tomorrowMatches.length}</span>}
            </button>
          </div>

          {/* ポストモーダル */}
          {tweetOpen&&(
            <div onClick={()=>setTweetOpen(false)} style={{
              position:"fixed",inset:0,zIndex:30,background:"rgba(0,0,0,0.6)",
              display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
              <div onClick={e=>e.stopPropagation()} style={{
                background:"#161b22",border:`1px solid ${postMode==="result"?"#2ea043":"#1d9bf0"}`,borderRadius:12,
                padding:16,maxWidth:520,width:"100%",maxHeight:"82vh",overflow:"auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:"0.9rem",fontWeight:800,color:postMode==="result"?"#2ea043":"#1d9bf0"}}>
                    {postMode==="result"?"𝕏 本日の結果をポスト":"𝕏 明日の試合をポスト"}</span>
                  <button onClick={()=>setTweetOpen(false)} style={{background:"none",border:"none",
                    color:"#8b949e",fontSize:"1.2rem",cursor:"pointer",lineHeight:1}}>×</button>
                </div>
                {/* モード切替タブ */}
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  <button onClick={()=>setPostMode("tomorrow")} style={{
                    flex:1,background:postMode==="tomorrow"?"#1d9bf0":"#21262d",
                    color:postMode==="tomorrow"?"#fff":"#8b949e",border:"none",borderRadius:6,
                    padding:"6px",fontSize:"0.74rem",cursor:"pointer",fontWeight:700}}>明日の試合</button>
                  <button onClick={()=>setPostMode("result")} style={{
                    flex:1,background:postMode==="result"?"#2ea043":"#21262d",
                    color:postMode==="result"?"#fff":"#8b949e",border:"none",borderRadius:6,
                    padding:"6px",fontSize:"0.74rem",cursor:"pointer",fontWeight:700}}>本日の結果</button>
                </div>
                {(postMode==="result"?todayResults:tomorrowMatches).length===0
                  ?<div style={{color:"#8b949e",fontSize:"0.82rem"}}>
                    {postMode==="result"?"本日の確定結果はまだありません":"明日の試合はありません"}</div>
                  :<>
                    <pre style={{fontFamily:"inherit",fontSize:"0.78rem",color:"#e6edf3",
                      whiteSpace:"pre-wrap",margin:"0 0 12px",lineHeight:1.65,
                      background:"#0d1117",padding:10,borderRadius:8,border:"1px solid #21262d"}}>
                      {postMode==="result"?resultTweetText:tweetText}</pre>
                    {postMode==="result"&&(
                      <div style={{fontSize:"0.68rem",color:"#e6af00",marginBottom:10,lineHeight:1.5}}>
                        💡 順位表タブで各グループの画像を保存し、このポストに添付すると分かりやすくなります
                      </div>
                    )}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{navigator.clipboard.writeText(postMode==="result"?resultTweetText:tweetText);
                        setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{
                        background:"#21262d",color:copied?"#2ea043":"#e6edf3",
                        border:"1px solid #30363d",borderRadius:8,padding:"7px 14px",
                        fontSize:"0.78rem",cursor:"pointer",flex:1}}>{copied?"✓ コピー済":"📋 コピー"}</button>
                      <button onClick={()=>window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(postMode==="result"?resultTweetText:tweetText)}`,"_blank")} style={{
                        background:postMode==="result"?"#2ea043":"#1d9bf0",color:"#fff",border:"none",borderRadius:8,
                        padding:"7px 14px",fontSize:"0.78rem",cursor:"pointer",fontWeight:700,flex:1}}>
                        𝕏 ポストする</button>
                    </div>
                  </>}
              </div>
            </div>
          )}
        </>}

        {/* ===== 順位表タブ ===== */}
        {tab==="groups"&&<>
          <div style={{fontSize:"0.74rem",color:"#8b949e",marginBottom:10,padding:"8px 10px",
            background:"#161b22",borderRadius:8,border:"1px solid #21262d",lineHeight:1.7}}>
            <span style={{color:"#2ea043",fontWeight:700}}>1〜2位</span>：ラウンド32へ直接進出　
            <span style={{color:"#f0883e",fontWeight:700}}>3位</span>：上位<span style={{color:"#e6af00",fontWeight:700}}>8チーム</span>のみ進出<br/>
            <span style={{fontSize:"0.62rem"}}>3位ランク：①勝点 ②得失点差 ③総得点 ④フェアプレー ⑤FIFAランク</span><br/>
            <span style={{fontSize:"0.62rem"}}>同勝点は直接対決を優先（2026新ルール）／🥇1位確定 ✅突破確定 ❌敗退確定</span>
          </div>
          {Object.keys(GROUPS).map(g=>(
            <div key={g}>
              <GroupTable groupKey={g} stats={groupStats[g]} h2h={h2hByGroup[g]} clinch={clinchByGroup}/>
              <button onClick={()=>downloadGroupImage(g)} style={{
                background:"#21262d",color:"#58a6ff",border:"1px solid #1f6feb44",
                borderRadius:6,padding:"5px 12px",fontSize:"0.7rem",cursor:"pointer",
                marginTop:-4,marginBottom:12,display:"flex",alignItems:"center",gap:4}}>
                🖼 {g}組の順位表を画像で保存
              </button>
            </div>
          ))}
          <ThirdPlaceTable groupStats={groupStats} h2hByGroup={h2hByGroup}/>
          <button onClick={downloadThirdImage} style={{
            background:"#21262d",color:"#e6af00",border:"1px solid #e6af0044",
            borderRadius:6,padding:"6px 12px",fontSize:"0.72rem",cursor:"pointer",
            marginTop:8,display:"flex",alignItems:"center",gap:4}}>
            🖼 3位チーム比較表を画像で保存
          </button>
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
              {slots.map((s,i)=><BracketRow key={i} s={s} now={now} slotTeam={slotTeam}/>)}
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

/**
 * IIM Trophy System — self-hosted GitHub profile trophies on Cloudflare Workers.
 * Forked-in-spirit from ryo-ma/github-profile-trophy (MIT), rebuilt from scratch
 * in JS for CF Workers with IIM branding + exclusive trophy categories.
 *
 * GET /?username=indicaindependent[&theme=iim&columns=N&no-bg=true&no-frame=true]
 *
 * Env:
 *   GH_TOKEN  — GitHub token with read:user + repo scope (GraphQL stats)
 *
 * NOTE (curator doctrine): this worker hardcodes NOTHING about Pete's private
 * infra — it only renders public GitHub stats for whatever ?username= is passed.
 * It contains no private infrastructure details or secrets — safe to be public.
 */

const PALETTE = {
  // IIM signature: red on dark, matching the typing-SVG title (#EF4444)
  bg: "#0d1117",
  frame: "#21262d",
  primary: "#EF4444",
  text: "#e6edf3",
  sub: "#8b949e",
  trackBg: "#21262d",
  // rank accent colors
  SSS: "#EF4444", SS: "#F87171", S: "#FB923C",
  AAA: "#FBBF24", AA: "#FACC15", A: "#A3E635",
  B: "#4ADE80", C: "#38BDF8", UNKNOWN: "#6b7280",
};

const CARD_W = 110;
const CARD_H = 110;
const GAP = 10;

// ---- Rank thresholds. score -> rank + how-close-to-next progress ----
function rankFromScore(score, tiers) {
  // tiers: [{rank, min}] descending
  for (let i = 0; i < tiers.length; i++) {
    if (score >= tiers[i].min) {
      const cur = tiers[i];
      const next = tiers[i - 1]; // higher tier
      let progress;
      if (!next) progress = 1; // already maxed
      else progress = Math.min(1, (score - cur.min) / (next.min - cur.min));
      return { rank: cur.rank, progress };
    }
  }
  return { rank: "UNKNOWN", progress: 0 };
}

const COMMIT_TIERS = [
  { rank: "SSS", min: 4000 }, { rank: "SS", min: 2000 }, { rank: "S", min: 1000 },
  { rank: "AAA", min: 500 }, { rank: "AA", min: 250 }, { rank: "A", min: 100 },
  { rank: "B", min: 30 }, { rank: "C", min: 1 },
];
const REPO_TIERS = [
  { rank: "SSS", min: 100 }, { rank: "SS", min: 60 }, { rank: "S", min: 40 },
  { rank: "AAA", min: 25 }, { rank: "AA", min: 15 }, { rank: "A", min: 8 },
  { rank: "B", min: 3 }, { rank: "C", min: 1 },
];
const FOLLOWER_TIERS = [
  { rank: "SSS", min: 1000 }, { rank: "SS", min: 400 }, { rank: "S", min: 100 },
  { rank: "AAA", min: 50 }, { rank: "AA", min: 20 }, { rank: "A", min: 10 },
  { rank: "B", min: 3 }, { rank: "C", min: 1 },
];
const STAR_TIERS = [
  { rank: "SSS", min: 500 }, { rank: "SS", min: 200 }, { rank: "S", min: 80 },
  { rank: "AAA", min: 40 }, { rank: "AA", min: 15 }, { rank: "A", min: 5 },
  { rank: "B", min: 2 }, { rank: "C", min: 1 },
];
const EXP_TIERS = [ // account age in days
  { rank: "SSS", min: 3650 }, { rank: "SS", min: 2555 }, { rank: "S", min: 1825 },
  { rank: "AAA", min: 1095 }, { rank: "AA", min: 730 }, { rank: "A", min: 365 },
  { rank: "B", min: 120 }, { rank: "C", min: 1 },
];

// ---- GitHub GraphQL ----
async function fetchStats(username, token) {
  const query = `query($login:String!){
    user(login:$login){
      createdAt
      followers{totalCount}
      repositories(first:100,ownerAffiliations:OWNER,orderBy:{field:STARGAZERS,direction:DESC}){
        totalCount nodes{stargazerCount}
      }
      contributionsCollection{totalCommitContributions restrictedContributionsCount}
    }
  }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "iim-trophy-worker",
    },
    body: JSON.stringify({ query, variables: { login: username } }),
  });
  const json = await res.json();
  if (!json.data || !json.data.user) {
    throw new Error(json.errors ? json.errors[0].message : "user not found");
  }
  const u = json.data.user;
  const stars = u.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0);
  const ageDays = Math.floor((Date.now() - new Date(u.createdAt)) / 86400000);
  const commits = u.contributionsCollection.totalCommitContributions +
                  u.contributionsCollection.restrictedContributionsCount;
  return {
    commits,
    repos: u.repositories.totalCount,
    followers: u.followers.totalCount,
    stars,
    ageDays,
  };
}

// ---- Trophy definitions (standard + IIM-exclusive) ----
function buildTrophies(stats) {
  const T = [];

  // Standard
  T.push({ icon: "◆", title: "Commits", val: stats.commits,
           ...rankFromScore(stats.commits, COMMIT_TIERS) });
  T.push({ icon: "▣", title: "Repos", val: stats.repos,
           ...rankFromScore(stats.repos, REPO_TIERS) });
  T.push({ icon: "★", title: "Stars", val: stats.stars,
           ...rankFromScore(stats.stars, STAR_TIERS) });
  T.push({ icon: "◐", title: "Followers", val: stats.followers,
           ...rankFromScore(stats.followers, FOLLOWER_TIERS) });
  T.push({ icon: "⏣", title: "Experience", val: stats.ageDays + "d",
           ...rankFromScore(stats.ageDays, EXP_TIERS) });

  // ---- IIM-EXCLUSIVE TROPHIES ----
  // 🛡️ Sentinel — VPDLNY mission. Ranks on commits = tools shipped for the vulnerable.
  T.push({ icon: "🛡", title: "Sentinel", val: stats.commits,
           subtitle: "Tools for the vulnerable",
           ...rankFromScore(stats.commits, COMMIT_TIERS), iim: true });

  // ⚡ Edge Forged — Cloudflare edge builder. Ranks on repos shipped.
  T.push({ icon: "⚡", title: "Edge Forged", val: stats.repos,
           subtitle: "Built on the edge",
           ...rankFromScore(stats.repos, REPO_TIERS), iim: true });

  // 🔍 Signal Hunter — OSINT/researcher. Ranks on total activity (commits+repos*10).
  const signal = stats.commits + stats.repos * 10;
  const SIGNAL_TIERS = [
    { rank: "SSS", min: 5000 }, { rank: "SS", min: 2500 }, { rank: "S", min: 1200 },
    { rank: "AAA", min: 600 }, { rank: "AA", min: 300 }, { rank: "A", min: 120 },
    { rank: "B", min: 40 }, { rank: "C", min: 1 },
  ];
  T.push({ icon: "🔍", title: "Signal Hunter", val: signal,
           subtitle: "OSINT operative",
           ...rankFromScore(signal, SIGNAL_TIERS), iim: true });

  return T;
}

// ---- SVG render ----
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function renderCard(t, x, y, opts) {
  const color = PALETTE[t.rank] || PALETTE.primary;
  const frameStroke = opts.noFrame ? "none" : PALETTE.frame;
  const cardBg = opts.noBg ? "none" : PALETTE.bg;
  const pct = Math.round(t.progress * 100);
  const barW = 80;
  const fillW = Math.round(barW * t.progress);
  const valStr = esc(t.val);
  const sub = t.subtitle ? `<text x="${x + CARD_W/2}" y="${y + 99}" text-anchor="middle" font-size="6.5" fill="${PALETTE.sub}" font-family="'Segoe UI',sans-serif">${esc(t.subtitle)}</text>` : "";

  return `
  <g>
    <rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="6"
          fill="${cardBg}" stroke="${frameStroke}" stroke-width="1"/>
    ${t.iim ? `<rect x="${x}" y="${y}" width="${CARD_W}" height="3" rx="1.5" fill="${PALETTE.primary}"/>` : ""}
    <text x="${x + CARD_W/2}" y="${y + 24}" text-anchor="middle" font-size="11" font-weight="700"
          fill="${color}" font-family="'JetBrains Mono','Segoe UI',monospace">${esc(t.rank)}</text>
    <text x="${x + CARD_W/2}" y="${y + 52}" text-anchor="middle" font-size="22"
          fill="${color}" font-family="'Segoe UI Emoji','Segoe UI',sans-serif">${t.icon}</text>
    <text x="${x + CARD_W/2}" y="${y + 70}" text-anchor="middle" font-size="10" font-weight="600"
          fill="${PALETTE.text}" font-family="'Segoe UI',sans-serif">${esc(t.title)}</text>
    <text x="${x + CARD_W/2}" y="${y + 82}" text-anchor="middle" font-size="8.5"
          fill="${PALETTE.sub}" font-family="'JetBrains Mono',monospace">${valStr}</text>
    <rect x="${x + (CARD_W-barW)/2}" y="${y + 88}" width="${barW}" height="3" rx="1.5" fill="${PALETTE.trackBg}"/>
    <rect x="${x + (CARD_W-barW)/2}" y="${y + 88}" width="${fillW}" height="3" rx="1.5" fill="${color}"/>
    ${sub}
  </g>`;
}

function renderSVG(trophies, opts) {
  const cols = opts.columns || trophies.length;
  const rows = Math.ceil(trophies.length / cols);
  const W = cols * CARD_W + (cols - 1) * GAP + 12;
  const H = rows * CARD_H + (rows - 1) * GAP + 12;
  let cards = "";
  trophies.forEach((t, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = 6 + c * (CARD_W + GAP);
    const y = 6 + r * (CARD_H + GAP);
    cards += renderCard(t, x, y, opts);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img">
  ${cards}
</svg>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const username = url.searchParams.get("username") || "indicaindependent";
    const opts = {
      columns: parseInt(url.searchParams.get("columns") || url.searchParams.get("column") || "0") || 0,
      noBg: url.searchParams.get("no-bg") === "true",
      noFrame: url.searchParams.get("no-frame") === "true",
    };

    const headers = {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=7200, s-maxage=7200",
      "Access-Control-Allow-Origin": "*",
    };

    try {
      const stats = await fetchStats(username, env.GH_TOKEN);
      let trophies = buildTrophies(stats);
      if (!opts.columns) opts.columns = trophies.length; // single row by default
      const svg = renderSVG(trophies, opts);
      return new Response(svg, { headers });
    } catch (e) {
      const err = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="60">
        <rect width="420" height="60" rx="6" fill="${PALETTE.bg}" stroke="${PALETTE.primary}"/>
        <text x="210" y="35" text-anchor="middle" fill="${PALETTE.primary}" font-size="12"
          font-family="monospace">IIM Trophy error: ${esc(e.message).slice(0,40)}</text>
      </svg>`;
      return new Response(err, { headers: { ...headers, "Cache-Control": "no-store" }, status: 200 });
    }
  },
};

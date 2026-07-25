<div align="center">

# 🏆 IIM Trophy

**Self-hosted GitHub profile trophies — rendered at the edge on Cloudflare Workers.**

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-EF4444?style=for-the-badge)](./LICENSE)

[![IIM Trophies](https://trophy.osintnet.uk/?username=indicaindependent)](https://github.com/indicaindependent)

*Live example — rendered by this worker.*

</div>

---

## Why this exists

The popular public trophy services run on shared, free-tier deployments that
routinely hit their billing limits and start returning **`402 Payment Required`** —
so the trophies silently vanish from your README.

**IIM Trophy** is a single, dependency-free Cloudflare Worker you deploy on your
own account. It pulls live stats from GitHub's GraphQL API, computes ranks, and
renders a clean SVG at the edge with a 2-hour cache. Your trophies never go down
because of someone else's bill.

## Features

- ⚡ **Zero dependencies** — one file, runs on the Workers free tier
- 🎨 **IIM red/black theme** — sharp, dark, transparent-friendly
- 🏅 **Rank engine** — `SSS → C` with per-category progress bars
- 🛡️ **Custom trophy categories** — define your own, not just GitHub defaults
- 🚀 **Edge cached** — fast everywhere, no cold-start flicker
- 🔒 **Private by design** — renders only public stats for whatever `?username=` is passed

## Trophies

| Category | Ranks on |
|----------|----------|
| **Commits** | Commit contributions (rolling year) |
| **Repos** | Public repositories |
| **Stars** | Total stargazers across repos |
| **Followers** | Follower count |
| **Experience** | Account age |
| 🛡️ **Sentinel** | Tools shipped *(custom)* |
| ⚡ **Edge Forged** | Repos built on the edge *(custom)* |
| 🔍 **Signal Hunter** | Total research activity *(custom)* |

The three custom trophies are marked with a red accent bar and are trivial to
re-theme or replace — see `buildTrophies()` in [`src/worker.js`](./src/worker.js).

## Quick start

```bash
# 1. Clone
git clone https://github.com/indicaindependent/iim-trophy.git
cd iim-trophy

# 2. Set your GitHub token (needs read:user + repo scope)
npx wrangler secret put GH_TOKEN

# 3. Deploy
npx wrangler deploy
```

Then embed it in your profile README:

```markdown
[![Trophies](https://YOUR-WORKER-URL/?username=YOUR_USERNAME)](https://github.com/YOUR_USERNAME)
```

## Query parameters

| Param | Default | Description |
|-------|---------|-------------|
| `username` | — | GitHub username to render (required) |
| `columns` | all-in-one-row | Max trophies per row |
| `no-bg` | `false` | Transparent card backgrounds |
| `no-frame` | `false` | Remove card borders |

## Customizing

- **Add a trophy** → push a new entry in `buildTrophies()` with its own tier table.
- **Re-theme** → edit the `PALETTE` object at the top of `src/worker.js`.
- **Adjust ranks** → tune the `*_TIERS` threshold arrays.

## Credits

Inspired by [ryo-ma/github-profile-trophy](https://github.com/ryo-ma/github-profile-trophy)
(MIT). This is an independent JavaScript reimplementation for Cloudflare Workers
with a custom rank engine, theme, and trophy set — not a fork of its source.

## License

[MIT](./LICENSE)


---

## ⚡ Support the Mission

This is free, ad-free, independent infrastructure — no VC, no gov funding, no strings. If it served you, a tip keeps it alive and funds the next tool.

[![Donate via SkyGive](https://img.shields.io/badge/💜_Donate_via_SkyGive-8A5CF6?style=for-the-badge&logoColor=white)](https://donate.skygive.app/)
[![Lightning](https://img.shields.io/badge/⚡_tips@skygive.app-F7931A?style=for-the-badge&logo=lightning&logoColor=white)](https://donate.skygive.app/)

<sub>🧡 Sovereign Lightning + on-chain via SkyGive. Your sats fund uptime, not ads.</sub>

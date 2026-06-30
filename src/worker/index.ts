import { Hono } from "hono";
import { Room } from "./room";
import { createImportRoutes } from "./import";

// Re-export Room for vitest pool workers (must be a named export from main)
export { Room };

interface Env {
  ROOM: DurableObjectNamespace<Room>;
  DB: D1Database;
  KV: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  BETTER_AUTH_URL?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.get("/sitemap.xml", (c) => {
  const today = new Date().toISOString().split("T")[0];
  return c.text(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://estimate-it.app/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <lastmod>${today}</lastmod>
  </url>
  <url>
    <loc>https://estimate-it.app/what-is-planning-poker</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
  </url>
  <url>
    <loc>https://estimate-it.app/sprint-planning-guide</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
  </url>
</urlset>`, { headers: { "Content-Type": "application/xml" } });
});

const importRoutes = createImportRoutes();
app.route("/", importRoutes);

const landingPageStyles = `
  :root {
    --bg-tertiary: #0a0a0a; --bg-primary: #171717; --bg-secondary: #262626;
    --text-primary: #e5e5e5; --text-secondary: #a3a3a3; --text-muted: #737373;
    --border-subtle: #262626; --border-default: #333333;
    --accent-primary: #3b82f6; --accent-secondary: #8b5cf6;
  }
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { color-scheme: dark; }
  body { font-family: "Space Grotesk", system-ui, sans-serif; background: var(--bg-tertiary); color: var(--text-primary); line-height: 1.6; }
  .container { max-width: 720px; margin: 0 auto; padding: 80px 24px 60px; }
  h1 { font-size: 42px; font-weight: 700; letter-spacing: -1px; margin-bottom: 16px; }
  h2 { font-size: 24px; font-weight: 600; color: var(--text-secondary); margin: 40px 0 16px; }
  h3 { font-size: 18px; font-weight: 600; color: var(--text-secondary); margin: 24px 0 8px; }
  p { color: var(--text-secondary); margin-bottom: 16px; font-size: 15px; }
  .cta { display: inline-block; margin-top: 32px; padding: 14px 32px; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; transition: opacity 0.15s, transform 0.15s; }
  .cta:hover { opacity: 0.9; transform: translateY(-1px); }
  .back { display: inline-block; margin-bottom: 32px; color: var(--text-secondary); text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
  .back:hover { color: var(--text-primary); }
  @media (prefers-reduced-motion: reduce) { .cta, .back { transition: none; } }
`;

function landingPage(title: string, description: string, canonical: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="https://estimate-it.app/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="https://estimate-it.app/og-image.png" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>${landingPageStyles}</style>
</head>
<body>
  <div class="container">
    <a href="/" class="back">&larr; Back to estimate-it</a>
    ${body}
    <a href="/" class="cta">Try estimate-it free</a>
  </div>
</body>
</html>`;
}

app.get("/what-is-planning-poker", (c) =>
  c.html(landingPage(
    "What is Planning Poker? | estimate-it",
    "Learn what planning poker is, how it works, and why agile teams use it for unbiased story estimation. A complete guide to planning poker.",
    "https://estimate-it.app/what-is-planning-poker",
    `<h1>What is Planning Poker?</h1>
    <p>Planning poker (also called Scrum poker) is a consensus-based estimation technique used by agile software teams. It helps teams estimate the effort required for user stories, features, or tasks — without the bias that comes from hearing someone else's estimate first.</p>

    <h2>How Planning Poker Works</h2>
    <p>A facilitator presents a user story to the team. Each team member privately selects a card from a deck showing the Fibonacci sequence (1, 2, 3, 5, 8, 13, 21). Once everyone has chosen, all cards are revealed simultaneously.</p>
    <p>If estimates differ significantly, the team discusses why. The person who played the highest and lowest cards explains their reasoning. Then the team re-votes until they reach consensus. This process surfaces hidden complexity and assumptions early.</p>

    <h2>Benefits for Agile Teams</h2>
    <h3>Eliminates anchoring bias</h3>
    <p>Traditional estimation often starts with one person stating a number. Everyone else unconsciously anchors to that number. Planning poker prevents this by keeping votes hidden until everyone has made their own independent judgment.</p>
    <h3>Surfaces hidden complexity</h3>
    <p>When one developer estimates a story at 3 points and another estimates 13, it reveals different assumptions about the work. The discussion that follows catches edge cases, technical debt, and integration concerns before development starts.</p>
    <h3>Builds shared understanding</h3>
    <p>The estimation conversation forces the team to align on what "done" means for each story. This shared understanding reduces rework and miscommunication during the sprint.</p>

    <h2>How to Run a Planning Poker Session</h2>
    <p><strong>1. Prepare the backlog.</strong> Make sure each story has a clear description and acceptance criteria before the session.</p>
    <p><strong>2. Set up the room.</strong> Share the room code with your team. Everyone joins and gets ready to vote.</p>
    <p><strong>3. Present and estimate.</strong> Walk through each story. Everyone votes, then reveal. Discuss differences, re-vote if needed, and move to the next story.</p>
    <p><strong>4. Record the estimates.</strong> Once the team agrees on a point value, record it and move on. Keep sessions to 30-60 minutes to maintain focus.</p>`
  ))
);

app.get("/sprint-planning-guide", (c) =>
  c.html(landingPage(
    "Sprint Planning Estimation Guide | estimate-it",
    "A practical guide to sprint planning estimation — why it matters, why estimates aren't promises, techniques like planning poker and t-shirt sizing, and tips for more accurate estimates.",
    "https://estimate-it.app/sprint-planning-guide",
    `<h1>Sprint Planning Estimation Guide</h1>
    <p>Good estimation is the foundation of predictable delivery. When your team estimates well, you can commit to realistic sprint goals, identify risks early, and build trust with stakeholders. This guide covers the most effective estimation techniques and practical tips to improve your team's accuracy.</p>
    <h2>Why Estimation Matters</h2>
    <p>Estimation is not about predicting the future with precision. It is about creating a shared understanding of the work and making trade-offs visible. Teams that estimate consistently can answer questions like: How much can we deliver this sprint? Is this feature worth the investment? Where are the risks?</p>
    <p>Without estimation, teams either overcommit and burn out, or undercommit and waste capacity. Neither is sustainable.</p>
    <h2>Estimates Are Not Promises</h2>
    <p>This is the single most important thing to get right, and it is where most estimation cultures break down. An estimate is a forecast made with incomplete information. The moment estimates start being treated as deadlines — or as a scorecard for individual productivity — people stop estimating honestly and start padding, sandbagging, or gaming the numbers. The estimates get worse precisely because they are taken too seriously.</p>
    <p>A few guardrails keep estimation healthy. Don't hold individuals to their estimates as commitments — the team commits to a sprint goal, not to a number a person said out loud. Never use estimates or velocity to compare developers or teams against each other, since the numbers aren't calibrated across people and the comparison only teaches everyone to inflate. And treat a missed estimate as information rather than a failure: the interesting question is why it was off, not who was wrong.</p>
    <p>If estimates can't be wrong without consequences, they'll stop being honest — and dishonest estimates are worse than none.</p>
    <h2>Common Estimation Techniques</h2>
    <h3>Planning Poker</h3>
    <p>The most popular technique for agile teams. Each team member selects a Fibonacci card privately, then all cards are revealed at once. Differences in estimates trigger discussion about assumptions and complexity. Planning poker works because it combines independent judgment with structured conversation — the private vote prevents anchoring on whoever speaks first.</p>
    <h3>T-Shirt Sizing</h3>
    <p>A quick, relative estimation method using sizes (XS, S, M, L, XL). Best for early-stage planning or when you need a rough sense of effort without precise numbers. T-shirt sizing is fast but less granular — use it for backlog grooming, not sprint commitment.</p>
    <h3>Reference (Baseline) Stories</h3>
    <p>Not a standalone ceremony so much as a habit that makes every other technique work better. Pick a few well-understood, already-completed stories and treat them as fixed anchors — your canonical 2, your canonical 5, your canonical 8. New stories get estimated by comparison: is this more or less than our reference 5? Baselines keep the scale from drifting over time and give new team members a fast way to calibrate. If you do nothing else on this list, do this.</p>
    <p><strong>A note on prioritization tools.</strong> Techniques like dot voting — where each member places a fixed number of dots on the stories they find most valuable — are sometimes lumped in with estimation, but they measure perceived value, not effort. They're genuinely useful, just for deciding what to build rather than how big it is. Pair them with one of the estimation techniques above rather than substituting for one.</p>
    <h3>Story Points vs. Hours</h3>
    <p>Story points measure relative effort and complexity; hours measure absolute time. Many teams find points more reliable because they account for the fact that a 5-point story for one developer might take a different amount of wall-clock time for another. Points also resist the false precision of hourly estimates, which tend to imply a confidence nobody actually has.</p>
    <p>That said, this is a genuine debate, not settled doctrine. Some teams count stories instead of pointing them and get equally stable forecasts. Others argue that slicing work small and measuring cycle time directly makes estimation ceremony unnecessary altogether. For short-horizon, well-understood work, hours can be perfectly fine. Points are a strong default for most teams doing sprint-based delivery, but the right unit depends on your context.</p>
    <h2>Tips for Better Estimates</h2>
    <p><strong>Estimate as a team.</strong> Solo estimates miss perspectives. The whole team should participate — developers, testers, and anyone who touches the work.</p>
    <p><strong>Use relative sizing.</strong> Compare stories to each other rather than guessing absolute effort. "This is about twice as complex as that story" is more reliable than "this will take 6 hours." This is exactly where reference stories earn their keep.</p>
    <p><strong>Break down large stories.</strong> If a story is too big to estimate confidently, split it. As a rough heuristic, many teams treat anything beyond their reference 8 as a signal to decompose — but the exact threshold is a team convention, not a law. The real test is whether the team can estimate it with confidence; if not, slice it.</p>
    <p><strong>Calibrate your relative sizing, not your hours.</strong> After each sprint, the useful question isn't whether the points matched the time — points were never meant to track hours, so reconciling them just smuggles time-estimation back in. Instead, check whether your relative scale still holds: are 5s consistently bigger than 3s? Has a particular kind of work, like integration or cross-team dependencies, drifted out of proportion to its points? Re-anchor against your reference stories when the scale starts to slip.</p>
    <p><strong>Timebox estimation sessions.</strong> Long sessions produce fatigue and diminishing returns. Keep planning poker sessions to 30-60 minutes. If you have more stories than time, prioritize and estimate the rest next time.</p>
    <p><strong>Don't estimate bugs the same way.</strong> Bugs are unpredictable — you often can't size the work until you've found the cause. Use a simple "small/medium/large," track them separately from feature work, or reserve a fixed slice of capacity for them. Trying to assign Fibonacci points to debugging is usually misleading.</p>`
  ))
);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") === "websocket") {
      const roomId = url.pathname.replace("/ws/", "");
      if (!roomId) {
        return new Response("Missing room ID", { status: 400 });
      }
      const id = env.ROOM.idFromName(roomId);
      const stub = env.ROOM.get(id);
      return stub.fetch(request);
    }

// Handle auth routes directly (bypass Hono)
    if (url.pathname.startsWith("/api/auth/") || url.pathname.startsWith("/callback/")) {
      const { createAuth } = await import("./auth");
      const auth = createAuth(env, request.cf as IncomingRequestCfProperties, request.url);
      return auth.handler(request);
    }

    if (url.pathname.startsWith("/api/") || url.pathname === "/sitemap.xml" || url.pathname === "/what-is-planning-poker" || url.pathname === "/sprint-planning-guide") {
      return app.fetch(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

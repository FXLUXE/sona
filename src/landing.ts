// landing.ts — public marketing + auto-demo page. The no-calls acquisition engine:
// a stranger pastes their website URL, gets a live receptionist trained on it in seconds,
// then a "get this on your site" CTA into /dashboard. Self-serve, zero founder contact.
//
// DESIGN: "the concierge desk" — a boutique-hotel front desk rendered in brass on warm
// paper. The hero is the working receptionist: ring the desk bell with your URL and watch
// your assistant arrive. Fraunces (display) + Inter (body), brass as the single accent.
// The page reads like a guest's walk through the hotel: the desk, the rooms it serves, the
// ledger of what a slow desk costs, the questions guests ask, and a last ring of the bell.
//
// SECURITY: no external scripts (Google Fonts stylesheet only). `base` is our own trusted
// env, but it is still routed through esc() for attributes and JSON.stringify for script
// context as defense-in-depth — never hand-concatenate untrusted values into this markup.

function esc(s: any): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

export function landingHtml(base: string): string {
  const B = JSON.stringify(base); // safe script-context embedding of the API base
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sona — the front desk that never clocks out</title>
<meta name="description" content="Sona is an always-on receptionist for your website. Paste your URL and watch a live assistant trained on your own pages appear in seconds. No code, no calls.">
<link rel="canonical" href="${esc(base)}/">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(base)}/">
<meta property="og:title" content="Sona — the front desk that never clocks out">
<meta property="og:description" content="Paste your website and watch a live receptionist, trained on your own pages, answer visitors and capture leads in seconds. No code, no calls — set up yourself.">
<meta property="og:image" content="${esc(base)}/og-image.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Sona — the front desk that never clocks out">
<meta name="twitter:description" content="A live receptionist for your website, trained on your own pages. Try it free in seconds — no code, no calls.">
<meta name="twitter:image" content="${esc(base)}/og-image.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#11212b; --brass:#c79a4b; --brass-deep:#a87f33;
    --paper:#f6f1e9; --white:#ffffff; --sage:#3a5a50; --muted:#6b7280;
    --line:#e4dccb; --line-soft:#efe8da;
    --plate:#1a2c35;
    --display:"Fraunces",Georgia,"Times New Roman",serif;
    --body:"Inter",system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
    --shadow:0 24px 60px -28px rgba(17,33,43,.40);
    --shadow-soft:0 12px 36px -20px rgba(17,33,43,.30);
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
  #top,#pricing,#desk,#how,#compare,#cases,#services,#faq{scroll-margin-top:84px}
  body{
    margin:0; color:var(--ink); background:var(--paper);
    font-family:var(--body); line-height:1.6; font-size:16px;
    -webkit-font-smoothing:antialiased;
    background-image:radial-gradient(130% 90% at 50% -10%, rgba(199,154,75,.10), transparent 60%);
    background-size:200% 200%;
    background-position:50% 0;
    animation:ambient 22s ease-in-out infinite;
  }
  a{color:inherit}
  .wrap{max-width:1080px;margin:0 auto;padding:0 24px}

  /* ---- engraved utility label ---- */
  .eyebrow{
    font-family:var(--mono); font-size:11.5px; letter-spacing:.24em;
    text-transform:uppercase; color:var(--brass-deep); font-weight:500;
    display:inline-flex; align-items:center; gap:9px;
  }
  .eyebrow::before{content:"";width:22px;height:1px;background:var(--brass);display:inline-block}
  .eyebrow.center{justify-content:center}
  .eyebrow.center::before{display:none}

  /* ---- sticky header (condenses on scroll) ---- */
  .bar{position:sticky;top:0;z-index:50;background:rgba(246,241,233,0);transition:background .3s ease, box-shadow .3s ease, border-color .3s ease;border-bottom:1px solid transparent}
  .bar.stuck{background:rgba(246,241,233,.88);-webkit-backdrop-filter:saturate(140%) blur(10px);backdrop-filter:saturate(140%) blur(10px);box-shadow:0 10px 30px -24px rgba(17,33,43,.55);border-bottom-color:var(--line)}
  header{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
  .bar.stuck header{padding:12px 0}
  .logo{display:flex;align-items:center;gap:11px;font-family:var(--display);font-weight:600;font-size:23px;letter-spacing:-.01em;color:var(--ink)}
  .logo .bellmark{width:26px;height:26px;flex:0 0 auto;color:var(--brass)}
  .nav{display:flex;align-items:center;gap:8px}
  .nav .lnk{position:relative;font-weight:600;font-size:14.5px;text-decoration:none;padding:9px 4px;margin:0 8px;border-radius:0;color:var(--ink)}
  .nav .lnk::after{content:"";position:absolute;left:4px;right:4px;bottom:4px;height:1.5px;background:var(--brass);transform:scaleX(0);transform-origin:left;transition:transform .28s cubic-bezier(.2,.7,.3,1)}
  .nav .lnk:hover::after, .nav .lnk:focus-visible::after{transform:scaleX(1)}
  .nav .hide-sm{display:inline}
  /* the persistent CTA brightens to brass once the hero scrolls past */
  .nav .cta-head{transition:transform .25s ease, box-shadow .25s ease, background .3s ease, color .3s ease}
  .bar.stuck .nav .cta-head{background:linear-gradient(180deg,var(--brass),var(--brass-deep));color:#231706;box-shadow:0 1px 0 rgba(255,255,255,.45) inset, 0 10px 26px -12px rgba(168,127,51,.7)}

  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:11px;padding:13px 22px;font-family:var(--body);font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;line-height:1;transition:transform .15s ease, box-shadow .15s ease, background .15s ease}
  .btn-primary{background:var(--ink);color:var(--paper);box-shadow:0 1px 0 rgba(255,255,255,.04) inset, var(--shadow-soft)}
  .btn-primary:hover{transform:translateY(-1px);background:#0c1a22;box-shadow:0 1px 0 rgba(255,255,255,.04) inset, 0 14px 32px -14px rgba(17,33,43,.55)}
  .btn-primary:active{transform:translateY(1px) scale(.99)}
  .btn-brass{position:relative;overflow:hidden;background:linear-gradient(180deg,var(--brass),var(--brass-deep));color:#231706;box-shadow:0 1px 0 rgba(255,255,255,.45) inset, var(--shadow-soft)}
  .btn-brass:hover{transform:translateY(-1px);box-shadow:0 1px 0 rgba(255,255,255,.45) inset, 0 12px 30px -10px rgba(168,127,51,.7)}
  .btn-brass:active{transform:translateY(1px) scale(.99)}
  /* sheen sweep on brass buttons */
  .btn-brass::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-18deg);transition:none}
  .btn-brass:hover::after{animation:sheen .9s ease}
  .btn-ghost{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--line)}
  .btn-ghost:hover{transform:translateY(-1px);box-shadow:inset 0 0 0 1.5px var(--brass)}
  .btn-sm{padding:10px 16px;font-size:14px;border-radius:10px}
  .btn:focus-visible, .nav .lnk:focus-visible, #url:focus-visible, .qa summary:focus-visible, .tab:focus-visible{outline:3px solid var(--brass);outline-offset:3px}

  /* ---- hero ---- */
  .hero{padding:40px 0 8px;display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center}
  .hero h1{
    font-family:var(--display); font-optical-sizing:auto; font-weight:500;
    font-size:clamp(40px,5.6vw,68px); line-height:1.02; letter-spacing:-.02em;
    margin:18px 0 0; color:var(--ink);
  }
  .hero h1 em{font-style:italic;font-weight:400;color:var(--brass-deep)}
  .hero .lede{font-size:clamp(17px,1.7vw,19px);color:#3f4a50;max-width:30em;margin:20px 0 0}
  .hero .cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px;align-items:center}
  .reassure{font-family:var(--mono);font-size:12px;letter-spacing:.04em;color:var(--muted);margin-top:18px}
  .reassure b{color:var(--sage);font-weight:600}

  /* ---- the desk (signature) ---- */
  .desk{position:relative}
  .desk-card{
    background:var(--white); border:1px solid var(--line);
    border-radius:20px; padding:26px 26px 28px; box-shadow:var(--shadow);
    position:relative;
    /* The card breathes with a gentle float, but stops the moment a guest is
       being helped — a still desk while the receptionist works keeps the
       preview from re-compositing every frame (no flicker). */
    animation:float 7s ease-in-out infinite;
  }
  /* once the demo is running or shown, hold the card perfectly still so the
     live preview never fights the float transform */
  .desk.busy .desk-card{animation:none;transform:none}
  .desk-card::before{content:"";position:absolute;inset:0;border-radius:20px;border:1px solid rgba(199,154,75,.18);pointer-events:none}
  /* brass nameplate */
  .plate{
    display:flex;align-items:center;gap:14px;
    background:linear-gradient(180deg,#22343d,var(--plate));
    border-radius:13px;padding:13px 16px;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.06), 0 6px 16px -10px rgba(17,33,43,.7);
  }
  .plate .bell{width:34px;height:34px;flex:0 0 auto;color:var(--brass);transform-origin:50% 18%;animation:idlebell 6.5s ease-in-out infinite}
  .plate .pl-txt{display:flex;flex-direction:column;gap:1px}
  .plate .pl-name{font-family:var(--display);font-weight:500;font-size:16px;color:#f3ead8;letter-spacing:.01em}
  .plate .pl-role{font-family:var(--mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--brass)}
  .plate .status-dot{margin-left:auto;display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#bfcbc4}
  .plate .status-dot i{width:7px;height:7px;border-radius:50%;background:var(--sage);box-shadow:0 0 0 0 rgba(58,90,80,.6);animation:pulse 2.6s ease-out infinite}

  .desk-h{margin:22px 0 2px;font-family:var(--display);font-weight:500;font-size:21px;letter-spacing:-.01em}
  .desk-sub{margin:0 0 16px;color:var(--muted);font-size:14.5px}

  /* register line — the URL input styled as a guest-book entry */
  .register{display:flex;gap:10px;flex-wrap:wrap}
  .reg-field{
    flex:1;min-width:200px;position:relative;display:flex;align-items:center;
    background:var(--paper);border:1px solid var(--line);border-radius:12px;
    padding-left:13px;transition:border-color .15s ease, box-shadow .15s ease;
  }
  .reg-field:focus-within{border-color:var(--brass);box-shadow:0 0 0 4px rgba(199,154,75,.16)}
  .reg-field .at{font-family:var(--mono);font-size:13px;color:var(--brass-deep);user-select:none}
  #url{
    flex:1;min-width:0;border:0;background:transparent;outline:0;
    padding:14px 12px 14px 8px;font-family:var(--body);font-size:16px;color:var(--ink);
  }
  #url::placeholder{color:#aba291}
  #go{white-space:nowrap}
  #go .ring-ic{width:17px;height:17px}

  #status{margin-top:14px;font-size:14px;font-family:var(--mono);letter-spacing:.02em;color:var(--muted);min-height:20px}
  #status[data-state="working"]{color:var(--brass-deep)}
  #status[data-state="done"]{color:var(--sage)}
  #status[data-state="error"]{color:#a1462f}

  /* The live demo opens as a near-fullscreen modal so the receptionist is shown BIG — nothing
     cut off, no cramped iframe in the hero column. The chat scrolls inside the demo itself. */
  #result{position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;padding:24px}
  #result.show{display:flex}
  .result-backdrop{position:absolute;inset:0;background:rgba(17,33,43,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
  .result-card{position:relative;width:min(1120px,94vw);height:min(880px,88vh);background:var(--white);border-radius:16px;box-shadow:var(--shadow-soft);display:flex;flex-direction:column;overflow:hidden;isolation:isolate;contain:layout paint}
  .result-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:9px;padding:12px 16px;font-family:var(--mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--brass-deep);border-bottom:1px solid var(--line)}
  .result-x{background:none;border:0;font-size:24px;line-height:1;cursor:pointer;color:var(--ink);opacity:.55;padding:0 4px}
  .result-x:hover{opacity:1}
  #result iframe{flex:1 1 auto;display:block;width:100%;height:auto;border:0;background:var(--white)}
  .result-cta{flex:0 0 auto;padding:12px 16px;border-top:1px solid var(--line);text-align:center}
  @media (max-width:560px){ #result{padding:0} .result-card{width:100vw;height:100dvh;border-radius:0} }

  /* ---- trust marquee: the rooms the desk serves ---- */
  .trust{padding:46px 0 0}
  .trust .cred{text-align:center;color:var(--muted);font-size:14.5px;max-width:40em;margin:12px auto 0}
  .trust .cred b{color:var(--ink);font-weight:600}
  .marquee{margin-top:26px;position:relative;overflow:hidden;
    -webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);
    mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
  .marquee-track{display:flex;width:max-content;gap:14px;animation:slide 34s linear infinite}
  .vert{display:inline-flex;align-items:center;gap:9px;white-space:nowrap;
    background:var(--white);border:1px solid var(--line);border-radius:999px;
    padding:10px 17px;font-size:14px;font-weight:500;color:#3f4a50}
  .vert svg{width:17px;height:17px;color:var(--brass-deep);flex:0 0 auto}

  /* ---- stat band: honest, generic framing ---- */
  .stats{padding:64px 0 0}
  .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:18px;overflow:hidden}
  .stat{background:var(--paper);padding:30px 22px;text-align:center}
  .stat .num{font-family:var(--display);font-weight:500;font-size:clamp(34px,4.4vw,52px);letter-spacing:-.02em;line-height:1;color:var(--ink)}
  .stat .num .u{color:var(--brass-deep)}
  .stat .lbl{margin-top:9px;font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}

  /* ---- section heading shell ---- */
  .sec{padding:78px 0 0}
  .sec-head{max-width:36em}
  .sec-head.center{margin:0 auto;text-align:center}
  .sec-head h2{font-family:var(--display);font-weight:500;font-size:clamp(26px,3.4vw,38px);letter-spacing:-.02em;margin:14px 0 0;line-height:1.1}
  .sec-head p{color:var(--muted);font-size:15px;margin:12px 0 0}
  .sec-head.center p{margin-left:auto;margin-right:auto}

  /* ---- how it works: a numbered stepper with a brass line ---- */
  .steps{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin-top:38px}
  .steps::before{content:"";position:absolute;top:26px;left:14%;right:14%;height:2px;
    background:repeating-linear-gradient(90deg,var(--brass) 0 8px,transparent 8px 16px);opacity:.5}
  .step{position:relative;text-align:center;padding:0 6px}
  .step .dot{position:relative;z-index:1;width:52px;height:52px;margin:0 auto;border-radius:50%;
    background:var(--white);border:1.5px solid var(--brass);display:grid;place-items:center;
    font-family:var(--display);font-weight:600;font-size:21px;color:var(--brass-deep);
    box-shadow:0 10px 24px -16px rgba(168,127,51,.7)}
  .step h3{margin:18px 0 6px;font-family:var(--display);font-weight:500;font-size:19px;letter-spacing:-.01em}
  .step p{margin:0;color:#54606a;font-size:14.5px;line-height:1.55}
  .how-cta{margin-top:36px;text-align:center}

  /* ---- loss-aversion: the ledger ---- */
  .ledger{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:36px}
  .col{border-radius:18px;padding:28px 26px;border:1px solid var(--line)}
  .col.cold{background:var(--white)}
  .col.warm{background:linear-gradient(180deg,#fffdf8,var(--white));border-color:var(--brass);box-shadow:0 22px 50px -30px rgba(168,127,51,.5)}
  .col .tag{font-family:var(--mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;font-weight:500}
  .col.cold .tag{color:var(--muted)}
  .col.warm .tag{color:var(--brass-deep)}
  .col h3{margin:9px 0 16px;font-family:var(--display);font-weight:500;font-size:21px;letter-spacing:-.01em}
  .col ul{list-style:none;margin:0;padding:0}
  .col li{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-top:1px solid var(--line-soft);color:#54606a;font-size:14.5px;line-height:1.5}
  .col li:first-child{border-top:0}
  .col li .ic{flex:0 0 auto;width:18px;height:18px;margin-top:1px}
  .col.cold .ic{color:#b06a4e}
  .col.warm .ic{color:var(--sage)}
  .ledger-cta{margin-top:30px;text-align:center}

  /* ---- use cases: tabs ---- */
  .cases-panel{margin-top:34px;background:var(--white);border:1px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:var(--shadow-soft)}
  .tabs{display:flex;flex-wrap:wrap;gap:0;border-bottom:1px solid var(--line);background:var(--paper)}
  .tab{flex:1;min-width:120px;border:0;background:transparent;cursor:pointer;font-family:var(--body);
    font-weight:600;font-size:14.5px;color:var(--muted);padding:16px 12px;position:relative;
    transition:color .2s ease, background .2s ease}
  .tab:hover{color:var(--ink)}
  .tab[aria-selected="true"]{color:var(--ink);background:var(--white)}
  .tab[aria-selected="true"]::after{content:"";position:absolute;left:18%;right:18%;bottom:-1px;height:2.5px;
    background:linear-gradient(90deg,var(--brass),var(--brass-deep));border-radius:2px}
  .panel{padding:30px 30px 32px;display:none}
  .panel.on{display:block;animation:panelIn .45s cubic-bezier(.2,.7,.3,1) both}
  .panel .q-label{font-family:var(--mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--brass-deep)}
  .panel .ask{font-family:var(--display);font-weight:500;font-size:clamp(19px,2.3vw,25px);letter-spacing:-.01em;margin:11px 0 0;line-height:1.18}
  .panel .ans{margin:16px 0 0;color:#54606a;font-size:15px;line-height:1.6;max-width:42em}
  .panel .ans b{color:var(--ink);font-weight:600}

  /* ---- features as desk services ---- */
  .feats{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:1px;margin:34px 0 0;background:var(--line);border:1px solid var(--line);border-radius:18px;overflow:hidden}
  .feat{background:var(--paper);padding:26px 24px;transition:background .3s ease, transform .3s ease}
  .feat:hover{background:var(--white);transform:translateY(-3px)}
  .feat:hover .no{color:var(--brass)}
  .feat .no{font-family:var(--mono);font-size:11px;letter-spacing:.18em;color:var(--brass-deep)}
  .feat h3{margin:14px 0 6px;font-family:var(--display);font-weight:500;font-size:18px;letter-spacing:-.01em}
  .feat p{margin:0;color:#54606a;font-size:14.5px;line-height:1.55}

  /* ---- FAQ accordion (details/summary — works with no JS) ---- */
  .faq-list{margin-top:30px;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--white)}
  .qa{border-top:1px solid var(--line)}
  .qa:first-child{border-top:0}
  .qa summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;
    padding:20px 24px;font-family:var(--display);font-weight:500;font-size:17.5px;letter-spacing:-.01em;color:var(--ink)}
  .qa summary::-webkit-details-marker{display:none}
  .qa summary .pm{flex:0 0 auto;width:22px;height:22px;position:relative;transition:transform .3s ease}
  .qa summary .pm::before,.qa summary .pm::after{content:"";position:absolute;background:var(--brass-deep);border-radius:2px}
  .qa summary .pm::before{top:50%;left:2px;right:2px;height:2px;transform:translateY(-50%)}
  .qa summary .pm::after{left:50%;top:2px;bottom:2px;width:2px;transform:translateX(-50%);transition:transform .3s ease, opacity .3s ease}
  .qa[open] summary .pm::after{transform:translateX(-50%) scaleY(0);opacity:0}
  .qa .body{padding:0 24px;overflow:hidden;max-height:0;transition:max-height .35s ease}
  .qa[open] .body{max-height:340px}
  .qa .body p{margin:0 0 22px;color:#54606a;font-size:14.5px;line-height:1.6;max-width:54em}
  .qa[open] summary{color:var(--brass-deep)}

  /* ---- pricing ---- */
  .pricing{padding:78px 0 0;text-align:center}
  .pricing h2{font-family:var(--display);font-weight:500;font-size:clamp(26px,3.4vw,38px);letter-spacing:-.02em;margin:14px 0 6px}
  .pricing .note{color:var(--muted);font-size:14.5px;margin:0 auto;max-width:34em}
  .tiers{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:38px;text-align:left}
  .tier{background:var(--white);border:1px solid var(--line);border-radius:16px;padding:26px 24px;display:flex;flex-direction:column;transition:transform .3s cubic-bezier(.2,.7,.3,1), box-shadow .3s ease, border-color .3s ease}
  .tier:hover{transform:translateY(-6px);border-color:var(--brass);box-shadow:0 22px 48px -28px rgba(168,127,51,.5)}
  .tier.pop{border-color:var(--brass);box-shadow:0 18px 44px -26px rgba(168,127,51,.55);position:relative}
  .tier.pop:hover{transform:translateY(-6px);box-shadow:0 26px 54px -26px rgba(168,127,51,.62)}
  .tier.pop::after{content:"Most chosen";position:absolute;top:-11px;left:24px;background:linear-gradient(180deg,var(--brass),var(--brass-deep));color:#231706;font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;padding:4px 11px;border-radius:999px}
  .tier h3{margin:0;font-family:var(--mono);font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:var(--brass-deep);font-weight:500}
  .tier .price{font-family:var(--display);font-weight:500;font-size:40px;margin:10px 0 2px;letter-spacing:-.02em;line-height:1}
  .tier .price small{font-family:var(--body);font-size:14px;font-weight:500;color:var(--muted);letter-spacing:0}
  .tier ul{list-style:none;margin:16px 0 0;padding:0;color:#54606a;font-size:14px;flex:1}
  .tier li{margin:9px 0;padding-left:22px;position:relative}
  .tier li::before{content:"";position:absolute;left:2px;top:8px;width:7px;height:7px;border-radius:50%;background:var(--brass);opacity:.55}
  .tier .pick{margin-top:20px}
  .tier .pick .btn{width:100%}
  .pricing .guarantee{margin:28px auto 0;color:var(--muted);font-size:13.5px;max-width:40em;font-family:var(--mono);letter-spacing:.02em}
  .pricing .guarantee b{color:var(--sage);font-weight:600}
  .pricing .cta-row{margin-top:24px}
  /* ---- compare-all-features matrix ---- */
  .compare{max-width:760px;margin:34px auto 0;text-align:left;border:1px solid var(--line);border-radius:14px;background:var(--white);overflow:hidden}
  .compare>summary{cursor:pointer;list-style:none;padding:16px 22px;font-family:var(--mono);font-size:13px;letter-spacing:.04em;color:var(--brass-deep);display:flex;align-items:center;justify-content:space-between}
  .compare>summary::-webkit-details-marker{display:none}
  .compare>summary .pm{width:11px;height:11px;border-right:2px solid var(--brass);border-bottom:2px solid var(--brass);transform:rotate(45deg);transition:transform .25s ease}
  .compare[open]>summary .pm{transform:rotate(-135deg)}
  .cmp-wrap{overflow-x:auto}
  .cmp{width:100%;border-collapse:collapse;font-size:13.5px}
  .cmp th,.cmp td{padding:11px 14px;border-top:1px solid var(--line);text-align:center;white-space:nowrap}
  .cmp thead th{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--brass-deep);border-top:0}
  .cmp th.pop{color:#231706;background:linear-gradient(180deg,rgba(199,154,75,.18),rgba(199,154,75,.08))}
  .cmp tbody td:first-child,.cmp thead th:first-child{text-align:left;color:#3a444c;white-space:normal}
  .cmp tbody td{color:#54606a}
  .cmp-soon{margin:0;padding:14px 22px;font-size:12.5px;color:var(--muted);font-family:var(--mono);letter-spacing:.02em;border-top:1px solid var(--line)}
  .cmp-soon b{color:var(--sage)}

  /* ---- final CTA band: the last ring of the bell ---- */
  .closer{margin-top:88px;padding:64px 0 70px;background:linear-gradient(180deg,#142530,var(--plate));color:#eef2f0;position:relative;overflow:hidden}
  .closer::before{content:"";position:absolute;inset:0;background:radial-gradient(120% 80% at 50% -20%, rgba(199,154,75,.20), transparent 60%);pointer-events:none}
  .closer .inner{position:relative;text-align:center;max-width:40em;margin:0 auto}
  .closer .bell-big{width:56px;height:56px;color:var(--brass);margin:0 auto;display:block;transform-origin:50% 18%;animation:idlebell 6.5s ease-in-out infinite}
  .closer h2{font-family:var(--display);font-weight:500;font-size:clamp(28px,4vw,44px);letter-spacing:-.02em;line-height:1.06;margin:18px 0 0;color:#fbf7ee}
  .closer h2 em{font-style:italic;font-weight:400;color:var(--brass)}
  .closer p{color:#bccac4;font-size:16px;margin:16px auto 0;max-width:30em}
  .closer .register{justify-content:center;margin-top:30px}
  .closer-cta{margin-top:30px;display:flex;justify-content:center}
  .closer .reg-field{background:rgba(255,255,255,.06);border-color:rgba(199,154,75,.4);max-width:340px}
  .closer .reg-field .at{color:var(--brass)}
  .closer #url2{color:#fbf7ee}
  .closer #url2::placeholder{color:#8fa39c}
  .closer .alt{margin-top:18px;font-family:var(--mono);font-size:12.5px;letter-spacing:.04em;color:#9fb1aa}
  .closer .alt a{color:var(--brass);text-decoration:none;font-weight:600;border-bottom:1px solid rgba(199,154,75,.5);padding-bottom:1px}
  .closer .alt a:hover{border-bottom-color:var(--brass)}

  /* ---- footer ---- */
  footer{border-top:1px solid var(--line);padding:42px 0 38px;color:var(--muted);font-size:13px}
  footer .top{display:flex;flex-wrap:wrap;gap:30px;justify-content:space-between;align-items:flex-start}
  footer .fmark{display:flex;align-items:center;gap:9px;font-family:var(--display);font-weight:500;font-size:18px;color:var(--ink)}
  footer .fmark svg{width:21px;height:21px;color:var(--brass)}
  footer .brandline{margin:12px 0 0;max-width:22em;line-height:1.55}
  footer .cols{display:flex;gap:54px;flex-wrap:wrap}
  footer .col-h{font-family:var(--mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--brass-deep);margin-bottom:12px}
  footer .col-l{display:flex;flex-direction:column;gap:9px}
  footer .col-l a{text-decoration:none;color:#54606a;font-size:14px;font-weight:500}
  footer .col-l a:hover{color:var(--ink)}
  footer .legal{margin-top:34px;padding-top:20px;border-top:1px solid var(--line-soft);display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center}

  /* ---- exit-intent nudge: a quiet card when a guest moves to leave ---- */
  .nudge{position:fixed;inset:0;z-index:90;display:none;align-items:center;justify-content:center;padding:24px;
    background:rgba(17,33,43,.42);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}
  .nudge.open{display:flex}
  .nudge-card{position:relative;width:100%;max-width:430px;background:var(--white);border:1px solid var(--line);
    border-radius:18px;padding:30px 30px 26px;box-shadow:var(--shadow);text-align:center}
  .nudge.open .nudge-card{animation:nudgeIn .4s cubic-bezier(.2,.7,.3,1) both}
  .nudge .nbell{width:42px;height:42px;color:var(--brass);margin:0 auto 4px;display:block}
  .nudge h3{font-family:var(--display);font-weight:500;font-size:24px;letter-spacing:-.01em;margin:8px 0 0;color:var(--ink)}
  .nudge p{color:#54606a;font-size:15px;line-height:1.55;margin:10px auto 0;max-width:30em}
  .nudge .nudge-row{display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap}
  .nudge .x{position:absolute;top:12px;right:12px;width:32px;height:32px;border:0;background:transparent;border-radius:8px;
    cursor:pointer;color:var(--muted);display:grid;place-items:center;line-height:0}
  .nudge .x:hover{background:var(--paper);color:var(--ink)}
  .nudge .x svg{width:18px;height:18px}
  .nudge .x:focus-visible{outline:3px solid var(--brass);outline-offset:2px}
  @keyframes nudgeIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}

  /* ---- ambient + signature keyframes ---- */
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(58,90,80,.55)}70%{box-shadow:0 0 0 8px rgba(58,90,80,0)}100%{box-shadow:0 0 0 0 rgba(58,90,80,0)}}
  @keyframes ring{0%{transform:rotate(0)}15%{transform:rotate(16deg)}30%{transform:rotate(-13deg)}45%{transform:rotate(9deg)}60%{transform:rotate(-6deg)}75%{transform:rotate(3deg)}100%{transform:rotate(0)}}
  /* idle bell: mostly still, a faint nudge every cycle so the desk feels alive */
  @keyframes idlebell{0%,86%,100%{transform:rotate(0)}90%{transform:rotate(7deg)}94%{transform:rotate(-5deg)}97%{transform:rotate(2deg)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  @keyframes ambient{0%,100%{background-position:50% 0}50%{background-position:50% 18%}}
  @keyframes sheen{0%{left:-60%}100%{left:130%}}
  @keyframes shimmer{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35) drop-shadow(0 0 5px rgba(199,154,75,.55))}}
  @keyframes slide{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  @keyframes panelIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .logo .bellmark{animation:shimmer 5s ease-in-out infinite}
  .bell.is-ringing{animation:ring .85s ease-in-out!important}

  /* ---- entrance choreography ---- */
  /* page-load: hero + nav stagger. scroll-reveal: .reveal toggled by IntersectionObserver. */
  .reveal{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.2,.7,.3,1), transform .7s cubic-bezier(.2,.7,.3,1)}
  .reveal.in{opacity:1;transform:none}
  .feats .feat.reveal{transform:translateY(26px) scale(.98)}
  .feats .feat.reveal.in{transform:none}

  .pl-load .nav .lnk, .pl-load .nav .btn{opacity:0;transform:translateY(-8px);animation:navIn .55s cubic-bezier(.2,.7,.3,1) forwards}
  .pl-load .nav > *:nth-child(1){animation-delay:.15s}
  .pl-load .nav > *:nth-child(2){animation-delay:.24s}
  .pl-load .nav > *:nth-child(3){animation-delay:.33s}
  @keyframes navIn{to{opacity:1;transform:none}}

  .pl-load .hero > div > *{opacity:0;transform:translateY(22px);animation:heroIn .8s cubic-bezier(.2,.7,.3,1) forwards}
  .pl-load .hero > div > .eyebrow{animation-delay:.20s}
  .pl-load .hero > div > h1{animation-delay:.30s}
  .pl-load .hero > div > .lede{animation-delay:.44s}
  .pl-load .hero > div > .cta-row{animation-delay:.58s}
  .pl-load .hero > div > .reassure{animation-delay:.70s}
  .pl-load .hero .desk{opacity:0;transform:translateY(30px) scale(.97);animation:deskIn .9s cubic-bezier(.2,.7,.3,1) .5s forwards}
  @keyframes heroIn{to{opacity:1;transform:none}}
  @keyframes deskIn{to{opacity:1;transform:none}}

  /* demo result: choreographed reveal when the live receptionist arrives */
  #result.show{animation:resultIn .7s cubic-bezier(.2,.7,.3,1) both}
  #result.show iframe{animation:frameIn .8s cubic-bezier(.2,.7,.3,1) .12s both}
  #result.show .result-cta{animation:heroIn .6s ease .34s both}
  @keyframes resultIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  @keyframes frameIn{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}

  @media (max-width:880px){
    .hero{grid-template-columns:1fr;gap:30px;padding:24px 0 0}
    .hero .desk{order:2}
    .nav .hide-sm{display:none}
    .stat-grid{grid-template-columns:repeat(2,1fr)}
    .steps{grid-template-columns:1fr;gap:30px}
    .steps::before{display:none}
    .ledger{grid-template-columns:1fr}
    .tiers{grid-template-columns:repeat(2,1fr)}
  }
  @media (max-width:520px){
    .tiers{grid-template-columns:1fr}
  }
  /* accessibility floor: silence all non-essential motion */
  @media (prefers-reduced-motion:reduce){
    *,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
    .btn:hover{transform:none}
    .reveal{opacity:1!important;transform:none!important}
    .pl-load .nav .lnk,.pl-load .nav .btn,.pl-load .hero > div > *,.pl-load .hero .desk{opacity:1!important;transform:none!important}
    .panel.on{animation:none!important}
    .qa .body{transition:none!important}
    .nudge.open .nudge-card{animation:none!important}
  }
</style>
</head>
<body>
<div class="bar" id="bar">
  <div class="wrap">
    <header>
      <a class="logo" href="#top" style="text-decoration:none">
        <svg class="bellmark" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.2c.6 0 1 .4 1 1v.7a6 6 0 0 1 4.6 5.8v3.1l1.3 2.1c.3.5 0 1.1-.6 1.1H5.7c-.6 0-.9-.6-.6-1.1L6.4 14v-3.1A6 6 0 0 1 11 5.1v-.7c0-.6.4-1 1-1Z" fill="currentColor"/><path d="M9.6 19a2.4 2.4 0 0 0 4.8 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        Sona
      </a>
      <nav class="nav">
        <a href="#how" class="lnk hide-sm">How it works</a>
        <a href="#pricing" class="lnk">Pricing</a>
        <a href="#faq" class="lnk hide-sm">FAQ</a>
        <a href="${esc(base)}/dashboard" class="lnk hide-sm">Sign in</a>
        <a href="${esc(base)}/dashboard" class="btn btn-primary btn-sm cta-head">Create free account</a>
      </nav>
    </header>
  </div>
</div>

<div class="wrap" id="top">
  <section class="hero">
    <div>
      <span class="eyebrow">Always at the desk</span>
      <h1>The front desk<br>that never <em>clocks out</em>.</h1>
      <p class="lede">Sona greets every visitor on your website, answers from your own pages, and takes their details — whether they turn up at 2pm or 2am. Built for salons, clinics, studios, trades — any business that runs on appointments.</p>
      <div class="cta-row">
        <a href="#desk" class="btn btn-brass">Ring the desk
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        <a href="${esc(base)}/dashboard" class="btn btn-primary">Create your free account</a>
      </div>
      <p class="reassure"><b>No card.</b> No code. No calls — set up entirely on your own.</p>
    </div>

    <div class="desk" id="desk">
      <div class="desk-card">
        <div class="plate">
          <svg class="bell" id="bell" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.2c.6 0 1 .4 1 1v.7a6 6 0 0 1 4.6 5.8v3.1l1.3 2.1c.3.5 0 1.1-.6 1.1H5.7c-.6 0-.9-.6-.6-1.1L6.4 14v-3.1A6 6 0 0 1 11 5.1v-.7c0-.6.4-1 1-1Z" fill="currentColor"/><path d="M9.6 19a2.4 2.4 0 0 0 4.8 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          <div class="pl-txt">
            <span class="pl-name">Sona</span>
            <span class="pl-role">Receptionist</span>
          </div>
          <span class="status-dot"><i></i>On duty</span>
        </div>

        <h2 class="desk-h">Meet your receptionist — free, no signup</h2>
        <p class="desk-sub">Paste your website. Sona reads it and starts answering in seconds.</p>

        <div class="register">
          <label class="reg-field" for="url">
            <span class="at">https://</span>
            <input id="url" type="url" placeholder="yourbusiness.com" autocomplete="off" inputmode="url" aria-label="Your website address">
          </label>
          <button class="btn btn-brass" id="go">
            <svg class="ring-ic" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.2c.6 0 1 .4 1 1v.7a6 6 0 0 1 4.6 5.8v3.1l1.3 2.1c.3.5 0 1.1-.6 1.1H5.7c-.6 0-.9-.6-.6-1.1L6.4 14v-3.1A6 6 0 0 1 11 5.1v-.7c0-.6.4-1 1-1Z" fill="currentColor"/></svg>
            Ring the desk
          </button>
        </div>
        <div id="status" aria-live="polite"></div>

        <div id="result" role="dialog" aria-modal="true" aria-label="Your live receptionist preview">
          <div class="result-backdrop" id="resultBackdrop"></div>
          <div class="result-card">
            <div class="result-head">Your live receptionist
              <button type="button" id="resultClose" class="result-x" aria-label="Close preview">&times;</button>
            </div>
            <iframe id="frame" title="Your live Sona receptionist preview"></iframe>
            <div class="result-cta">
              <a class="btn btn-primary" id="resultCta" href="${esc(base)}/dashboard">Put this on my site →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="trust" aria-label="Who Sona is built for">
    <p class="cred reveal">Made for the places where a missed message is a missed booking — salons, clinics, studios, trades, and anyone else who lives by the calendar. <b>Sona answers only from your own pages</b>, so every reply sounds like you, not a robot reading a script.</p>
    <div class="marquee reveal" aria-hidden="true">
      <div class="marquee-track">
        <span class="vert"><svg viewBox="0 0 24 24" fill="none"><path d="M4 21V8l8-4 8 4v13" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 21v-6h6v6" stroke="currentColor" stroke-width="1.6"/></svg>Salons</span>
        <span class="vert"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v18M3 12h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>Clinics</span>
        <span class="vert"><svg viewBox="0 0 24 24" fill="none"><path d="M12 4c3 0 5 2 5 5 0 4-5 11-5 11S7 13 7 9c0-3 2-5 5-5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>Dental</span>
        <span class="vert"><svg viewBox="0 0 24 24" fill="none"><path d="M3 7l4-2 5 2 5-2 4 2v12l-4 2-5-2-5 2-4-2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>Trades</span>
        <span class="vert"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Studios</span>
        <span class="vert"><svg viewBox="0 0 24 24" fill="none"><path d="M5 21V5a2 2 0 0 1 2-2h7l5 5v13" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>Law firms</span>
        <span class="vert"><svg viewBox="0 0 24 24" fill="none"><path d="M6 4v16M18 4v16M6 9h12M6 15h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Fitness</span>
        <span class="vert"><svg viewBox="0 0 24 24" fill="none"><path d="M3 13l2-5h14l2 5v5H3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.5" fill="currentColor"/><circle cx="17" cy="18" r="1.5" fill="currentColor"/></svg>Auto shops</span>
        <span class="vert"><svg viewBox="0 0 24 24" fill="none"><path d="M3 11l9-7 9 7v9H3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>Real estate</span>
        <span class="vert"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Spas</span>
        <span class="vert" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 21V8l8-4 8 4v13" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 21v-6h6v6" stroke="currentColor" stroke-width="1.6"/></svg>Salons</span>
        <span class="vert" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v18M3 12h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>Clinics</span>
        <span class="vert" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 4c3 0 5 2 5 5 0 4-5 11-5 11S7 13 7 9c0-3 2-5 5-5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>Dental</span>
        <span class="vert" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M3 7l4-2 5 2 5-2 4 2v12l-4 2-5-2-5 2-4-2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>Trades</span>
        <span class="vert" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Studios</span>
      </div>
    </div>
  </section>

  <section class="stats" aria-label="What an always-on desk means">
    <div class="stat-grid">
      <div class="stat reveal"><div class="num" data-count="2" data-prefix="&lt; " data-suffix="s">&lt; <span class="u">2s</span></div><div class="lbl">Typical answer</div></div>
      <div class="stat reveal"><div class="num" data-count="24" data-suffix="/7"><span class="u">24/7</span></div><div class="lbl">On duty</div></div>
      <div class="stat reveal"><div class="num" data-count="0"><span class="u">0</span></div><div class="lbl">Missed after-hours visitors</div></div>
      <div class="stat reveal"><div class="num" data-count="0" data-prefix="$">$<span class="u">0</span></div><div class="lbl">To try it</div></div>
    </div>
  </section>

  <section class="sec" id="how">
    <div class="sec-head center reveal">
      <span class="eyebrow center">Set up in minutes</span>
      <h2>Three steps to a desk that never sleeps.</h2>
      <p>No code, no plugins, no call with us. You do it yourself in a few minutes.</p>
    </div>
    <div class="steps">
      <div class="step reveal">
        <div class="dot">1</div>
        <h3>Paste your URL</h3>
        <p>Drop in your website address. That is the only thing Sona needs to get started.</p>
      </div>
      <div class="step reveal">
        <div class="dot">2</div>
        <h3>Sona reads your pages</h3>
        <p>She studies your services, hours, and prices — like a new hire reading the binder — and learns to answer the way you would.</p>
      </div>
      <div class="step reveal">
        <div class="dot">3</div>
        <h3>It answers &amp; captures leads</h3>
        <p>Add one line to your site. Sona greets visitors and takes their details, day and night.</p>
      </div>
    </div>
    <div class="how-cta reveal">
      <a href="#desk" class="btn btn-brass">Try it on your site
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
    </div>
  </section>

  <section class="sec" id="compare">
    <div class="sec-head reveal">
      <span class="eyebrow">The cost of a desk that clocks out</span>
      <h2>Most visitors arrive when no one is at the desk.</h2>
      <p>Evenings, weekends, lunch breaks, the second line. When a question goes unanswered, people rarely ask twice — they book the business that answered first.</p>
    </div>
    <div class="ledger">
      <div class="col cold reveal">
        <span class="tag">Front desk, 9 to 5</span>
        <h3>Closes when you do</h3>
        <ul>
          <li><svg class="ic" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>After-hours questions sit unread until morning.</li>
          <li><svg class="ic" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>A busy phone line sends callers to a competitor.</li>
          <li><svg class="ic" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>Repeat questions eat the time you meant for clients.</li>
          <li><svg class="ic" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>A new hire costs a salary and weeks of training.</li>
        </ul>
      </div>
      <div class="col warm reveal">
        <span class="tag">Front desk, with Sona</span>
        <h3>Open whenever they are</h3>
        <ul>
          <li><svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Every visitor gets a real answer in seconds, any hour.</li>
          <li><svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>It captures the lead and pings you the moment it does.</li>
          <li><svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Routine questions are handled, so your day stays yours.</li>
          <li><svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Live in minutes for the price of a few coffees a month.</li>
        </ul>
      </div>
    </div>
    <div class="ledger-cta reveal">
      <a href="${esc(base)}/dashboard" class="btn btn-primary">Start free — no card</a>
    </div>
  </section>

  <section class="sec" id="cases">
    <div class="sec-head center reveal">
      <span class="eyebrow center">In your words</span>
      <h2>The questions your visitors actually ask.</h2>
      <p>These are just examples — Sona works for any business people message before they buy. Pick one close to yours and see how it answers, always from your own pages.</p>
    </div>
    <div class="cases-panel reveal">
      <div class="tabs" role="tablist" aria-label="Example businesses">
        <button class="tab" role="tab" id="tab-salon" aria-controls="p-salon" aria-selected="true">Salon</button>
        <button class="tab" role="tab" id="tab-dental" aria-controls="p-dental" aria-selected="false">Dental</button>
        <button class="tab" role="tab" id="tab-trades" aria-controls="p-trades" aria-selected="false">Trades</button>
        <button class="tab" role="tab" id="tab-clinic" aria-controls="p-clinic" aria-selected="false">Clinic</button>
      </div>
      <div class="panel on" id="p-salon" role="tabpanel" aria-labelledby="tab-salon">
        <div class="q-label">A visitor asks</div>
        <p class="ask">"Do you have any openings for a cut and color this Saturday?"</p>
        <p class="ans">Sona checks your hours and services, offers the slots you list as available, and <b>takes their name and number</b> so you can confirm — even if they asked at 11pm.</p>
      </div>
      <div class="panel" id="p-dental" role="tabpanel" aria-labelledby="tab-dental" hidden>
        <div class="q-label">A visitor asks</div>
        <p class="ask">"Do you take my insurance, and how much is a check-up?"</p>
        <p class="ans">Sona answers from the plans and pricing on your site, explains what a first visit includes, and <b>invites them to leave details</b> for the front desk to follow up.</p>
      </div>
      <div class="panel" id="p-trades" role="tabpanel" aria-labelledby="tab-trades" hidden>
        <div class="q-label">A visitor asks</div>
        <p class="ask">"Can you quote a boiler service, and do you cover my area?"</p>
        <p class="ans">Sona confirms your service area, explains what a typical job involves, and <b>captures the address and contact</b> so you can send an exact quote in the morning.</p>
      </div>
      <div class="panel" id="p-clinic" role="tabpanel" aria-labelledby="tab-clinic" hidden>
        <div class="q-label">A visitor asks</div>
        <p class="ask">"What are your opening hours, and can I book a consultation?"</p>
        <p class="ans">Sona shares your hours straight from your pages, walks them through how booking works, and <b>collects their request</b> the moment they are ready.</p>
      </div>
    </div>
  </section>

  <section class="sec" id="services">
    <div class="sec-head reveal">
      <span class="eyebrow">What the desk handles</span>
      <h2>Everything a great receptionist does — without the salary.</h2>
    </div>
    <div class="feats">
      <div class="feat reveal">
        <div class="no">Greets</div>
        <h3>Answers from your pages</h3>
        <p>Point Sona at your site. It reads your services, hours, and prices, then replies in plain language — grounded in your words, never invented.</p>
      </div>
      <div class="feat reveal">
        <div class="no">Books</div>
        <h3>Takes every lead</h3>
        <p>Visitors leave an email or pick a time. You get a note by email or text the moment they do, so no one slips away after hours.</p>
      </div>
      <div class="feat reveal">
        <div class="no">Matches</div>
        <h3>Dressed for your brand</h3>
        <p>Sona borrows your logo and colors straight from your site, so the desk on your page looks like it has always belonged there.</p>
      </div>
      <div class="feat reveal">
        <div class="no">Protects</div>
        <h3>Discreet by default</h3>
        <p>It speaks only from your content. Export or delete visitor data anytime. You run the whole thing yourself — no calls, ever.</p>
      </div>
    </div>
  </section>

  <section class="sec" id="faq">
    <div class="sec-head center reveal">
      <span class="eyebrow center">Before you ask</span>
      <h2>The questions we hear most.</h2>
    </div>
    <div class="faq-list reveal">
      <details class="qa" open>
        <summary>Do I need to code?<span class="pm" aria-hidden="true"></span></summary>
        <div class="body"><p>No. You paste your website address, and Sona does the reading. To go live, you add a single line to your site — copy, paste, done. If you can change your site's footer, you can install Sona.</p></div>
      </details>
      <details class="qa">
        <summary>How fast is it to set up?<span class="pm" aria-hidden="true"></span></summary>
        <div class="body"><p>Minutes. The demo above trains a working receptionist on your pages in seconds. Putting it live on your own site takes a few minutes more — no scheduling, no onboarding call.</p></div>
      </details>
      <details class="qa">
        <summary>Where do the answers come from?<span class="pm" aria-hidden="true"></span></summary>
        <div class="body"><p>Only your own pages. Sona reads the site you give it and answers from that content, so replies match your real services, hours, and prices instead of guessing.</p></div>
      </details>
      <details class="qa">
        <summary>What if it doesn't know an answer?<span class="pm" aria-hidden="true"></span></summary>
        <div class="body"><p>It says so plainly rather than inventing one, and offers to take the visitor's details so you can follow up. You would rather capture the lead than risk a wrong answer — so would we.</p></div>
      </details>
      <details class="qa">
        <summary>Is my data private?<span class="pm" aria-hidden="true"></span></summary>
        <div class="body"><p>Yes. Sona only uses the pages you point it at, and you can export or delete visitor data anytime from your dashboard. You stay in control of everything it collects.</p></div>
      </details>
      <details class="qa">
        <summary>Can I cancel?<span class="pm" aria-hidden="true"></span></summary>
        <div class="body"><p>Anytime, from your dashboard. The 14-day trial needs no card, and paid plans are month to month — no contracts and nothing to phone us about.</p></div>
      </details>
    </div>
  </section>

  <section class="pricing" id="pricing">
    <span class="eyebrow reveal center">Pick a desk</span>
    <h2 class="reveal">Plain pricing, paid monthly.</h2>
    <p class="note reveal">Start free for 14 days — no card to try, cancel whenever you like. <b>Save 20% paid yearly.</b></p>
    <div class="tiers">
      <div class="tier reveal">
        <h3>Trial</h3>
        <div class="price">£0<small> / 14 days</small></div>
        <ul><li>100 conversations</li><li>Answers from your own pages</li><li>Lead capture &amp; email alerts</li></ul>
        <div class="pick"><a class="btn btn-ghost btn-sm" href="${esc(base)}/dashboard">Create your free account</a></div>
      </div>
      <div class="tier reveal">
        <h3>Starter</h3>
        <div class="price">£19<small> / mo</small></div>
        <ul><li>250 conversations / mo</li><li>Email &amp; SMS lead alerts</li><li>Download leads (CSV)</li></ul>
        <div class="pick"><a class="btn btn-ghost btn-sm" href="${esc(base)}/dashboard">Choose Starter</a></div>
      </div>
      <div class="tier pop reveal">
        <h3>Pro</h3>
        <div class="price">£39<small> / mo</small></div>
        <ul><li>1,000 conversations / mo</li><li>In-chat booking calendar</li><li>Remove “Powered by Sona”</li><li>Full colour &amp; logo theming</li></ul>
        <div class="pick"><a class="btn btn-brass btn-sm" href="${esc(base)}/dashboard">Choose Pro</a></div>
      </div>
      <div class="tier reveal">
        <h3>Business</h3>
        <div class="price">£79<small> / mo</small></div>
        <ul><li>3,000 conversations / mo</li><li>Everything in Pro</li><li>Priority support</li></ul>
        <div class="pick"><a class="btn btn-ghost btn-sm" href="${esc(base)}/dashboard">Choose Business</a></div>
      </div>
    </div>

    <details class="compare reveal">
      <summary>Compare every feature<span class="pm" aria-hidden="true"></span></summary>
      <div class="cmp-wrap">
      <table class="cmp">
        <thead><tr><th>Feature</th><th>Trial</th><th>Starter</th><th class="pop">Pro</th><th>Business</th></tr></thead>
        <tbody>
          <tr><td>Conversations / month</td><td>100</td><td>250</td><td>1,000</td><td>3,000</td></tr>
          <tr><td>Answers from your own pages</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td>Capture visitor leads</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td>Email alert on new lead</td><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td>SMS alert on new lead</td><td>—</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td>Download leads (CSV)</td><td>—</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td>Colour &amp; logo theming</td><td>Basic</td><td>Basic</td><td>Full</td><td>Full</td></tr>
          <tr><td>In-chat booking calendar</td><td>—</td><td>—</td><td>✓</td><td>✓</td></tr>
          <tr><td>Remove “Powered by Sona”</td><td>—</td><td>—</td><td>✓</td><td>✓</td></tr>
          <tr><td>Priority support</td><td>—</td><td>—</td><td>—</td><td>✓</td></tr>
        </tbody>
      </table>
      </div>
      <p class="cmp-soon">More on the way for Pro &amp; Business — analytics, calendar sync, integrations and multi-site. <b>Coming soon.</b></p>
    </details>

    <p class="guarantee reveal">Set it up in minutes. <b>No card to try, cancel anytime.</b> Every plan answers only from your own pages.</p>
    <div class="cta-row reveal" style="text-align:center">
      <a class="btn btn-brass" href="${esc(base)}/dashboard">Create your free account →</a>
    </div>
  </section>
</div>

<section class="closer" id="closer">
  <div class="wrap">
    <div class="inner">
      <svg class="bell-big" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.2c.6 0 1 .4 1 1v.7a6 6 0 0 1 4.6 5.8v3.1l1.3 2.1c.3.5 0 1.1-.6 1.1H5.7c-.6 0-.9-.6-.6-1.1L6.4 14v-3.1A6 6 0 0 1 11 5.1v-.7c0-.6.4-1 1-1Z" fill="currentColor"/><path d="M9.6 19a2.4 2.4 0 0 0 4.8 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      <h2>Ring the bell once.<br>Your desk stays <em>open after that</em>.</h2>
      <p>Meet your receptionist in seconds — free, no signup, no card.</p>
      <div class="closer-cta">
        <a class="btn btn-brass" href="#desk">
          <svg class="ring-ic" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.2c.6 0 1 .4 1 1v.7a6 6 0 0 1 4.6 5.8v3.1l1.3 2.1c.3.5 0 1.1-.6 1.1H5.7c-.6 0-.9-.6-.6-1.1L6.4 14v-3.1A6 6 0 0 1 11 5.1v-.7c0-.6.4-1 1-1Z" fill="currentColor"/></svg>
          Paste your site &amp; see it free
        </a>
      </div>
      <p class="alt">Prefer to set it up properly? <a href="${esc(base)}/dashboard">Start free in the dashboard →</a></p>
    </div>
  </div>
</section>

<footer>
  <div class="wrap">
    <div class="top">
      <div>
        <div class="fmark">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.2c.6 0 1 .4 1 1v.7a6 6 0 0 1 4.6 5.8v3.1l1.3 2.1c.3.5 0 1.1-.6 1.1H5.7c-.6 0-.9-.6-.6-1.1L6.4 14v-3.1A6 6 0 0 1 11 5.1v-.7c0-.6.4-1 1-1Z" fill="currentColor"/></svg>
          Sona
        </div>
        <p class="brandline">The always-on front desk for local-service businesses. Set up yourself in minutes — no calls, ever.</p>
      </div>
      <div class="cols">
        <div>
          <div class="col-h">Product</div>
          <div class="col-l">
            <a href="#how">How it works</a>
            <a href="#cases">Use cases</a>
            <a href="#services">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
        <div>
          <div class="col-h">Get started</div>
          <div class="col-l">
            <a href="#desk">Try the demo</a>
            <a href="${esc(base)}/dashboard">Start free</a>
            <a href="${esc(base)}/dashboard">Sign in</a>
          </div>
        </div>
        <div>
          <div class="col-h">Legal</div>
          <div class="col-l">
            <a href="${esc(base)}/privacy">Privacy</a>
            <a href="${esc(base)}/terms">Terms</a>
          </div>
        </div>
      </div>
    </div>
    <div class="legal">
      <span>© 2026 Sona. Always at the desk.</span>
      <span><a href="${esc(base)}/privacy" style="text-decoration:none;color:inherit">Privacy</a> · <a href="${esc(base)}/terms" style="text-decoration:none;color:inherit">Terms</a> · Answers only from your own pages.</span>
    </div>
  </div>
</footer>

<div class="nudge" id="nudge" role="dialog" aria-modal="true" aria-labelledby="nudge-h" aria-describedby="nudge-p" hidden>
  <div class="nudge-card">
    <button class="x" id="nudge-x" type="button" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
    <svg class="nbell" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.2c.6 0 1 .4 1 1v.7a6 6 0 0 1 4.6 5.8v3.1l1.3 2.1c.3.5 0 1.1-.6 1.1H5.7c-.6 0-.9-.6-.6-1.1L6.4 14v-3.1A6 6 0 0 1 11 5.1v-.7c0-.6.4-1 1-1Z" fill="currentColor"/><path d="M9.6 19a2.4 2.4 0 0 0 4.8 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    <h3 id="nudge-h">Before you go —</h3>
    <p id="nudge-p">It takes about ten seconds to see Sona answer for your own business. Paste your site and watch your receptionist arrive.</p>
    <div class="nudge-row">
      <a class="btn btn-brass" href="#desk" id="nudge-go">See it on your site
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
      <button class="btn btn-ghost" type="button" id="nudge-no">Maybe later</button>
    </div>
  </div>
</div>

<script>
(function(){
  var B=${B};
  var url=document.getElementById('url');
  var status=document.getElementById('status'), result=document.getElementById('result'), frame=document.getElementById('frame');
  // The modal lives inside the hero's .desk-card, which has a transform (its float animation). A
  // transformed ancestor becomes the containing block for position:fixed, so the modal would size to
  // the card (~460px) instead of the viewport — rendering as a narrow panel overlapping the nav.
  // Reparent it to <body> so inset:0 means the full screen and it centres properly.
  if(result && result.parentElement!==document.body) document.body.appendChild(result);
  // Open/close the big demo modal. closeDemo clears the iframe so the live widget is fully torn
  // down between runs (prevents the re-run crash) and unlocks page scroll.
  function openDemo(src){ frame.src=src; result.classList.add('show'); document.body.style.overflow='hidden'; var c=document.getElementById('resultClose'); if(c)c.focus(); }
  function closeDemo(){ result.classList.remove('show'); try{frame.src='about:blank';}catch(e){} document.body.style.overflow=''; }
  var bell=document.getElementById('bell');
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // page-load choreography: arm the staggered hero/nav entrance, then disarm
  if(!reduce){
    document.documentElement.classList.add('pl-load');
    setTimeout(function(){ document.documentElement.classList.remove('pl-load'); }, 2600);
  }

  // sticky header: condense + brighten the persistent CTA once the hero scrolls past
  var bar=document.getElementById('bar');
  function onScroll(){ if(window.scrollY>120){ bar.classList.add('stuck'); } else { bar.classList.remove('stuck'); } }
  onScroll(); window.addEventListener('scroll',onScroll,{passive:true});

  // scroll-triggered reveals; staggered within each group
  var revs=[].slice.call(document.querySelectorAll('.reveal'));
  function countUp(el){
    var target=parseFloat(el.getAttribute('data-count'));
    var pre=el.getAttribute('data-prefix')||'', suf=el.getAttribute('data-suffix')||'';
    if(isNaN(target)){ return; }
    // build with safe DOM nodes (no innerHTML) — a prefix text node + a brass-accented value span
    el.textContent='';
    var u=document.createElement('span'); u.className='u';
    el.appendChild(document.createTextNode(pre));
    el.appendChild(u);
    function paint(val,withSuffix){ u.textContent=val+(withSuffix?suf:''); }
    if(reduce){ paint(target,true); return; }
    var start=null, dur=900;
    function frameStep(ts){
      if(start===null) start=ts;
      var p=Math.min(1,(ts-start)/dur);
      var eased=1-Math.pow(1-p,3);
      paint(Math.round(target*eased),p>=1);
      if(p<1){ requestAnimationFrame(frameStep); }
    }
    requestAnimationFrame(frameStep);
  }
  function reveal(el){
    el.classList.add('in');
    var num=el.querySelector?el.querySelector('.num[data-count]'):null;
    if(el.classList.contains('stat') && num){ countUp(num); }
  }
  if(reduce || !('IntersectionObserver' in window)){
    revs.forEach(reveal);
  } else {
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        var el=e.target, sibs=el.parentNode?[].slice.call(el.parentNode.children).filter(function(n){return n.classList&&n.classList.contains('reveal');}):[el];
        var i=Math.max(0,sibs.indexOf(el));
        el.style.transitionDelay=(i*90)+'ms';
        reveal(el);
        io.unobserve(el);
      });
    },{threshold:.16,rootMargin:'0px 0px -8% 0px'});
    revs.forEach(function(el){ io.observe(el); });
  }

  // use-case tabs: switch panels, manage aria + keyboard
  var tabs=[].slice.call(document.querySelectorAll('.tab'));
  function selectTab(tab){
    tabs.forEach(function(t){
      var on=(t===tab);
      t.setAttribute('aria-selected',on?'true':'false');
      var panel=document.getElementById(t.getAttribute('aria-controls'));
      if(panel){ if(on){ panel.hidden=false; panel.classList.add('on'); } else { panel.hidden=true; panel.classList.remove('on'); } }
    });
  }
  tabs.forEach(function(tab,idx){
    tab.addEventListener('click',function(){ selectTab(tab); });
    tab.addEventListener('keydown',function(e){
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
        e.preventDefault();
        var next=tabs[(idx+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];
        next.focus(); selectTab(next);
      }
    });
  });

  var desk=document.getElementById('desk');
  var busy=false;
  function setStatus(msg,state){ status.textContent=msg; if(state){status.setAttribute('data-state',state);}else{status.removeAttribute('data-state');} }
  function ring(){ if(!bell) return; bell.classList.remove('is-ringing'); void bell.offsetWidth; bell.classList.add('is-ringing'); }
  function setBusy(on){ busy=on; if(desk){ desk.classList.toggle('busy',on); } }
  function runWith(u){
    if(busy) return; // guard against double-rings restarting animations mid-flight
    u=(u||'').trim();
    // Send what they typed — the server forgives typos/missing protocol (htps://, .cmo, bare domain).
    // Only block the obviously-not-a-URL case here so they get instant feedback.
    if(!u || u.indexOf('.')<1){
      setStatus('Enter your website address, like yourbusiness.com','error');
      if(desk){ desk.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'}); }
      url.focus(); return;
    }
    ring();
    setBusy(true);
    go.disabled=true; if(go2)go2.disabled=true;
    // tear the previous preview down cleanly (clears the iframe so re-running on a new/same URL
    // before a refresh can't crash the live widget) before building the next.
    closeDemo();
    setStatus('Reading your site and waking your receptionist…','working');
    fetch(B+'/api/demo',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:u})})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};}).catch(function(){return {ok:r.ok,j:null};});})
      .then(function(res){
        go.disabled=false; if(go2)go2.disabled=false; setBusy(false);
        if(!res.ok || !res.j || !res.j.demoUrl){
          setStatus((res.j&&res.j.error)||'We could not reach that site just now. Check the address and ring again.','error');
          return;
        }
        setStatus('Your receptionist is on duty. Ask it anything — bottom-right of the preview.','done');
        // Carry the tested demo into signup: "Put this on my site" now claims THIS demo (copies its
        // knowledge into the new account) instead of dropping it and rebuilding from scratch.
        var rc=document.getElementById('resultCta');
        if(rc&&res.j.slug){ rc.href=B+'/dashboard?from='+encodeURIComponent(res.j.slug); }
        // preview mounts in an overlay — leave the desk UNLOCKED so a second site can be tried
        // without a refresh (the stray re-lock here was the re-generate bug).
        openDemo(res.j.demoUrl);
      })
      .catch(function(){ go.disabled=false; if(go2)go2.disabled=false; setBusy(false); setStatus('Something interrupted the connection. Please ring again.','error'); });
  }
  var go=document.getElementById('go'), go2=document.getElementById('go2'), url2=document.getElementById('url2');
  go.addEventListener('click',function(){ runWith(url.value); });
  url.addEventListener('keydown',function(e){ if(e.key==='Enter') runWith(url.value); });
  var resultClose=document.getElementById('resultClose'), resultBackdrop=document.getElementById('resultBackdrop');
  if(resultClose) resultClose.addEventListener('click',closeDemo);
  if(resultBackdrop) resultBackdrop.addEventListener('click',closeDemo);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && result.classList.contains('show')) closeDemo(); });
  if(go2){ go2.addEventListener('click',function(){ runWith(url2.value); }); }
  if(url2){ url2.addEventListener('keydown',function(e){ if(e.key==='Enter') runWith(url2.value); }); }

  // exit-intent nudge — desktop only, once per session, fully keyboard-accessible
  (function(){
    var nudge=document.getElementById('nudge');
    if(!nudge) return;
    var card=nudge.querySelector('.nudge-card');
    var closeX=document.getElementById('nudge-x'), later=document.getElementById('nudge-no'), goLink=document.getElementById('nudge-go');
    var lastFocus=null, shown=false;
    var coarse=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;
    var narrow=window.matchMedia&&window.matchMedia('(max-width: 880px)').matches;
    function seen(){ try{ return sessionStorage.getItem('sona_nudge')==='1'; }catch(e){ return false; } }
    function mark(){ try{ sessionStorage.setItem('sona_nudge','1'); }catch(e){} }
    function focusable(){ return [].slice.call(nudge.querySelectorAll('a[href],button:not([disabled])')); }
    function open(){
      if(shown||seen()) return; shown=true; mark();
      lastFocus=document.activeElement;
      nudge.hidden=false; nudge.classList.add('open');
      (goLink||card).focus();
    }
    function close(){
      nudge.classList.remove('open'); nudge.hidden=true;
      if(lastFocus&&lastFocus.focus){ lastFocus.focus(); }
    }
    if(closeX) closeX.addEventListener('click',close);
    if(later) later.addEventListener('click',close);
    if(goLink) goLink.addEventListener('click',close);
    nudge.addEventListener('click',function(e){ if(e.target===nudge) close(); });
    // Esc on document so it works even if focus escapes the modal (screen readers, etc.)
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape' && nudge.classList.contains('open')){ e.preventDefault(); close(); }
    });
    nudge.addEventListener('keydown',function(e){
      if(e.key==='Tab'){
        var f=focusable(); if(!f.length) return;
        var first=f[0], last=f[f.length-1];
        if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
      }
    });
    if(!coarse && !narrow){
      // desktop: named so it self-removes after firing — prevents any chance of double-fire
      var onExit=function(e){
        if(shown||seen()) return;
        if(!e.relatedTarget && e.clientY<=4){ document.removeEventListener('mouseout',onExit); open(); }
      };
      document.addEventListener('mouseout',onExit);
    } else {
      // touch/narrow: a gentler scroll-depth trigger near the foot of the page
      var onScrollNudge=function(){
        if(shown||seen()) return;
        var sc=window.scrollY+window.innerHeight;
        if(sc > document.body.scrollHeight*0.82){ open(); window.removeEventListener('scroll',onScrollNudge); }
      };
      window.addEventListener('scroll',onScrollNudge,{passive:true});
    }
  })();
})();
</script>
</body>
</html>`;
}

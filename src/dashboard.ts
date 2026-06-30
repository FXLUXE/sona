// dashboard.ts — self-contained admin SPA served at /dashboard.
// Supabase magic-link auth in the browser; all data reads hit the JWT-guarded
// /api/t/:tenant/* endpoints. No build step — plain HTML + a CDN supabase-js.
//
// Security helpers preserved verbatim from the original:
//   - esc()      HTML-escapes every API/DB value before it touches innerHTML
//   - safeHref() only emits http(s) links (blocks javascript:/data: in page_url)
//   - the supabase-js CDN <script> keeps its exact src/integrity/crossorigin
// The whole UI is built with single-quoted string concatenation (not a nested
// template literal) so backticks and ${...} never collide with the outer literal.
export function dashboardHtml(base: string): string {
  const B = JSON.stringify(base);
  return `<!doctype html><html lang=en><head><meta charset=utf8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>Sona — Your AI receptionist</title>
<style>
  /* Global top loading bar — driven by every api() call so any data pull shows progress. */
  #nprog{position:fixed;top:0;left:0;height:2px;width:100%;background:linear-gradient(90deg,#b07f33 0%,#e8c882 45%,#c79a4b 100%);background-size:200% 100%;transform:scaleX(0);transform-origin:0 50%;transition:transform .35s ease,opacity .45s ease;z-index:9999;opacity:0}
  @keyframes npShim{from{background-position:200% 0}to{background-position:-200% 0}}
  #nprog.go{opacity:.6;animation:npShim 1.8s linear infinite}
  .spin{display:inline-block;width:15px;height:15px;border:2px solid rgba(0,0,0,.15);border-top-color:var(--brass,#c79a4b);border-radius:50%;animation:spin .7s linear infinite;vertical-align:-2px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion:reduce){.spin{animation:none}#nprog{transition:opacity .3s ease}#nprog.go{animation:none!important}}
  :root{
    /* concierge desk palette — ink, brass, warm paper, sage, muted */
    --ink:#11212b;--ink-soft:#2d3f48;--mut:#6b7280;--faint:#9aa3ac;
    --line:#e3dccf;--line-2:#ece6da;--paper:#f6f1e9;--card:#ffffff;
    --accent:#c79a4b;--accent-2:#b07f33;--accent-weak:#f4ecdb;--accent-ink:#8a6420;
    --gold:#3a5a50;--gold-weak:#e4ece8;--rose:#b3403d;--rose-weak:#f6e3e1;--amber:#9a6b1f;--amber-weak:#f6ecd7;
    --grad:linear-gradient(135deg,#c79a4b 0%,#b07f33 100%);
    --shadow:0 1px 2px rgba(17,33,43,.05),0 8px 24px -12px rgba(17,33,43,.18);
    --shadow-lg:0 24px 60px -24px rgba(17,33,43,.30);
    --r:16px;--r-sm:11px;--r-lg:22px;
    --sp:8px;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink);background:var(--paper);line-height:1.5;-webkit-font-smoothing:antialiased}
  a{color:var(--accent);text-decoration:none}
  a:hover{text-decoration:underline}
  button{font:inherit;cursor:pointer;color:inherit}
  h1,h2,h3,p{margin:0}
  ::selection{background:#ddd9ff}
  @media (prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;transition-duration:.001ms!important}}

  /* ---- focus + a11y ---- */
  :focus-visible{outline:3px solid #bcb6ff;outline-offset:2px;border-radius:6px}
  .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}

  /* ---- type scale ---- */
  .eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent-ink)}
  .display{font-size:clamp(28px,4vw,40px);font-weight:800;letter-spacing:-.02em;line-height:1.05}
  .h-title{font-size:20px;font-weight:750;letter-spacing:-.01em}
  .h-sec{font-size:15px;font-weight:700;letter-spacing:-.01em}
  .sub{color:var(--mut);font-size:14px}
  .tiny{font-size:12px;color:var(--mut)}

  /* ---- buttons ---- */
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;
    background:var(--grad);color:#fff;border:0;border-radius:var(--r-sm);
    padding:11px 18px;font-weight:650;font-size:14px;box-shadow:0 6px 16px -8px rgba(79,70,229,.7);
    transition:transform .12s ease,box-shadow .12s ease,opacity .12s ease}
  .btn:hover{transform:translateY(-1px);box-shadow:0 10px 22px -8px rgba(79,70,229,.7)}
  .btn:active{transform:translateY(0)}
  .btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line);box-shadow:none}
  .btn.ghost:hover{background:var(--paper);border-color:#d6d9e8}
  .btn.sm{padding:8px 13px;font-size:13px}
  .btn.block{width:100%}
  .btn:disabled{opacity:.55;cursor:default;transform:none;box-shadow:none}
  .link-btn{background:none;border:0;color:var(--accent);font-weight:600;padding:0}
  .link-btn:hover{text-decoration:underline}

  /* ---- inputs ---- */
  label.field{display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:0 0 6px}
  .hint{font-size:12px;color:var(--mut);margin:5px 0 0}
  input,select,textarea{width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:var(--r-sm);
    font:inherit;font-size:14px;background:#fff;color:var(--ink);outline:0;transition:border-color .12s,box-shadow .12s}
  input:focus,select:focus,textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-weak)}
  textarea{resize:vertical;min-height:84px;line-height:1.55}
  input[type=checkbox]{width:auto;accent-color:var(--accent)}
  select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23717689' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 13px center;padding-right:34px}
  .check{display:flex;gap:10px;align-items:flex-start;padding:13px;border:1px solid var(--line);border-radius:var(--r-sm);background:#fff;cursor:pointer}
  .check input{margin-top:2px}
  .check .ct{font-size:13px}.check .ct b{font-weight:650}

  /* ---- cards / surfaces ---- */
  .card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow)}
  .pad{padding:22px}
  @media(min-width:640px){.pad{padding:26px}}
  .center{min-height:100vh;display:grid;place-items:center;padding:20px}

  /* ---- app shell ---- */
  .app{display:grid;grid-template-columns:1fr;min-height:100vh}
  @media(min-width:900px){.app{grid-template-columns:248px 1fr}}
  .side{background:#fff;border-right:1px solid var(--line);padding:16px;display:flex;flex-direction:column;gap:14px}
  @media(max-width:899px){.side{border-right:0;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}}
  .logo{display:flex;align-items:center;gap:10px;padding:6px 6px 2px}
  .logo .mark{width:30px;height:30px;border-radius:9px;background:var(--grad);display:grid;place-items:center;color:#fff;font-weight:800;font-size:16px;box-shadow:0 4px 12px -4px rgba(79,70,229,.7)}
  .logo .wm{font-weight:800;letter-spacing:-.02em;font-size:18px}
  .tswitch{position:relative}
  .tswitch select{font-weight:600;background-color:var(--paper);border-color:var(--line-2)}
  .navlist{display:flex;flex-direction:column;gap:2px}
  @media(max-width:899px){.navlist{flex-direction:row;overflow-x:auto;gap:4px;padding-bottom:2px;-webkit-overflow-scrolling:touch}}
  .nav{display:flex;align-items:center;gap:11px;padding:10px 11px;border-radius:10px;border:0;background:none;
    color:var(--ink-soft);font-size:14px;font-weight:550;text-align:left;width:100%;white-space:nowrap;transition:background .12s,color .12s}
  .nav:hover{background:var(--paper)}
  .nav.on{background:var(--accent-weak);color:var(--accent-ink);font-weight:700}
  .nav svg{flex:0 0 auto}
  .nav .badge{margin-left:auto;background:var(--rose-weak);color:var(--rose);font-size:11px;font-weight:700;padding:1px 7px;border-radius:999px}
  @media(max-width:899px){.nav .badge{margin-left:6px}}
  .side-foot{margin-top:auto;display:flex;flex-direction:column;gap:6px;padding-top:6px}
  @media(max-width:899px){.side-foot{display:none}}
  .legal{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;padding:4px 6px 0;font-size:12px;color:var(--faint)}
  .legal a{color:var(--mut);font-weight:550}
  .legal a:hover{color:var(--ink-soft)}
  .legal .sep{color:var(--line)}
  .main{padding:20px;max-width:1080px;width:100%}
  @media(min-width:640px){.main{padding:30px 32px}}
  .page-head{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:flex-end;margin-bottom:20px}
  .mobile-foot{display:flex;gap:8px;margin-top:24px}
  @media(min-width:900px){.mobile-foot{display:none}}

  /* ---- live status dot (signature) ---- */
  .live{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:650;color:var(--gold)}
  .dot{width:8px;height:8px;border-radius:50%;background:var(--gold);position:relative}
  .dot::after{content:"";position:absolute;inset:-4px;border-radius:50%;background:var(--gold);opacity:.35;animation:pulse 2s ease-out infinite}
  @keyframes pulse{0%{transform:scale(.6);opacity:.5}100%{transform:scale(1.9);opacity:0}}

  /* ---- ROI hero ---- */
  .hero{position:relative;overflow:hidden;background:var(--grad);color:#fff;border-radius:var(--r-lg);padding:26px;box-shadow:var(--shadow-lg)}
  .hero::before{content:"";position:absolute;right:-60px;top:-60px;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,.12)}
  .hero::after{content:"";position:absolute;right:30px;bottom:-80px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.08)}
  .hero .eyebrow{color:rgba(255,255,255,.85)}
  .hero .big{font-size:clamp(34px,6vw,52px);font-weight:850;letter-spacing:-.03em;line-height:1;margin:8px 0 4px}
  .hero .cap{color:rgba(255,255,255,.85);font-size:14px;max-width:46ch;position:relative}

  /* ---- stat grid ---- */
  .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px}
  @media(min-width:720px){.stats{grid-template-columns:repeat(3,1fr)}}
  .stat{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:16px 17px}
  .stat .n{font-size:25px;font-weight:800;letter-spacing:-.02em}
  .stat .l{color:var(--mut);font-size:12.5px;margin-top:2px;display:flex;align-items:center;gap:6px}
  .stat .l svg{opacity:.7}
  .stat.good .n{color:var(--gold)}

  /* ---- tables ---- */
  .tbl-wrap{overflow-x:auto;border-radius:var(--r)}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;padding:13px 14px;border-bottom:1px solid var(--line-2);vertical-align:top}
  thead th{color:var(--mut);font-weight:650;font-size:11px;text-transform:uppercase;letter-spacing:.06em;background:var(--paper);white-space:nowrap}
  tbody tr:last-child td{border-bottom:0}
  tbody tr:hover{background:#fafbff}
  .pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}
  .pill.hot{background:var(--rose-weak);color:var(--rose)}
  .pill.warm{background:var(--amber-weak);color:var(--amber)}
  .pill.cold{background:var(--accent-weak);color:var(--accent-ink)}

  /* ---- preview frame ---- */
  .preview{position:relative;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:var(--paper);box-shadow:var(--shadow)}
  .preview .bar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);background:#fff}
  .preview .bar .dots{display:flex;gap:5px}
  .preview .bar .dots i{width:9px;height:9px;border-radius:50%;background:#e2e4ee;display:inline-block}
  .preview .bar .u{flex:1;font-size:12px;color:var(--mut);background:var(--paper);border-radius:7px;padding:5px 10px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .preview iframe{display:block;width:100%;height:min(74vh,780px);border:0;background:#fff}

  /* ---- embed code ---- */
  .embed{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.6;
    background:#1a1d29;color:#d7d9ec;border-radius:var(--r-sm);padding:14px 16px;word-break:break-all;position:relative}
  .embed .tok{color:#a5b4ff}

  /* ---- empty states ---- */
  .empty{text-align:center;padding:38px 20px;color:var(--mut)}
  .empty .ico{width:52px;height:52px;border-radius:14px;background:var(--accent-weak);color:var(--accent);display:grid;place-items:center;margin:0 auto 14px}
  .empty h3{font-size:16px;color:var(--ink);font-weight:700;margin-bottom:4px}
  .empty p{font-size:14px;max-width:38ch;margin:0 auto}

  /* ---- messages ---- */
  .msg{font-size:13px;margin-top:10px;min-height:18px}
  .msg.err{color:var(--rose)}.msg.ok{color:var(--gold)}.msg.info{color:var(--mut)}
  .banner{display:flex;gap:10px;align-items:flex-start;padding:13px 15px;border-radius:var(--r-sm);font-size:13.5px;margin-bottom:16px}
  .banner.tip{background:var(--accent-weak);color:var(--accent-ink)}
  .banner svg{flex:0 0 auto;margin-top:1px}

  /* ---- wizard ---- */
  .wiz{width:min(560px,100%)}
  .wiz.wide{width:min(980px,100%)}
  .rail{display:flex;align-items:center;gap:0;margin:0 auto 26px;max-width:380px}
  .rail .step{display:flex;flex-direction:column;align-items:center;gap:6px;flex:0 0 auto}
  .rail .num{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700;
    background:#fff;border:2px solid var(--line);color:var(--faint)}
  .rail .step.on .num{background:var(--grad);border-color:transparent;color:#fff;box-shadow:0 4px 12px -4px rgba(79,70,229,.7)}
  .rail .step.done .num{background:var(--gold);border-color:transparent;color:#fff}
  .rail .lbl{font-size:11px;font-weight:650;color:var(--faint)}
  .rail .step.on .lbl,.rail .step.done .lbl{color:var(--ink-soft)}
  .rail .bar{flex:1;height:2px;background:var(--line);margin:0 6px;margin-bottom:18px;border-radius:2px;transition:background .3s}
  .rail .bar.fill{background:var(--gold)}
  .prog{height:6px;background:var(--line-2);border-radius:999px;overflow:hidden;margin:14px 0}
  .prog i{display:block;height:100%;background:var(--grad);width:0;transition:width .5s ease}
  .steps-list{display:flex;flex-direction:column;gap:8px;margin:14px 0}
  .steps-list .it{display:flex;gap:10px;align-items:center;font-size:13.5px;color:var(--mut)}
  .steps-list .it.on{color:var(--ink);font-weight:600}
  .steps-list .it.done{color:var(--gold)}
  .spin{width:15px;height:15px;border:2px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:sp .7s linear infinite;flex:0 0 auto}
  @keyframes sp{to{transform:rotate(360deg)}}
  .tick{width:16px;height:16px;flex:0 0 auto;color:var(--gold)}

  .grid2{display:grid;grid-template-columns:1fr;gap:14px}
  @media(min-width:560px){.grid2{grid-template-columns:1fr 1fr}}
  .stack>*+*{margin-top:14px}
  .row{display:flex;gap:10px;align-items:center}
  .divider{height:1px;background:var(--line-2);margin:22px 0}

  /* ---- motion: coordinated, brass-toned, reduced-motion-safe ---- */
  /* view transition: content slides + fades in when a tab loads */
  @keyframes viewIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .view-in{animation:viewIn .34s cubic-bezier(.2,.7,.3,1) both}
  /* entrance stagger for cards / rows / list items */
  @keyframes riseIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  .stagger>*{animation:riseIn .4s cubic-bezier(.2,.7,.3,1) both}
  .stagger>*:nth-child(1){animation-delay:.02s}
  .stagger>*:nth-child(2){animation-delay:.07s}
  .stagger>*:nth-child(3){animation-delay:.12s}
  .stagger>*:nth-child(4){animation-delay:.17s}
  .stagger>*:nth-child(5){animation-delay:.22s}
  .stagger>*:nth-child(6){animation-delay:.27s}
  tbody.stagger tr{animation:riseIn .36s cubic-bezier(.2,.7,.3,1) both}
  tbody.stagger tr:nth-child(1){animation-delay:.03s}
  tbody.stagger tr:nth-child(2){animation-delay:.06s}
  tbody.stagger tr:nth-child(3){animation-delay:.09s}
  tbody.stagger tr:nth-child(4){animation-delay:.12s}
  tbody.stagger tr:nth-child(5){animation-delay:.15s}
  tbody.stagger tr:nth-child(6){animation-delay:.18s}
  tbody.stagger tr:nth-child(7){animation-delay:.21s}
  tbody.stagger tr:nth-child(8){animation-delay:.24s}
  /* hover micro-interactions (additive to existing button rules) */
  .card{transition:transform .16s ease,box-shadow .16s ease}
  .card.lift:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg)}
  .nav{transition:background .12s,color .12s,transform .12s}
  .nav:hover{transform:translateX(2px)}
  tbody tr{transition:background .14s ease}

  /* ---- usage meters (billing) ---- */
  .meter{margin:0 0 4px}
  .meter .mlab{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;margin-bottom:6px}
  .meter .mlab b{font-weight:700;color:var(--ink)}
  .meter .mlab .mv{font-size:12.5px;color:var(--mut);font-variant-numeric:tabular-nums}
  .meter .track{height:9px;border-radius:999px;background:var(--line-2);overflow:hidden}
  .meter .fill{height:100%;border-radius:999px;background:var(--grad);width:0;transition:width 1s cubic-bezier(.2,.7,.3,1)}
  .meter .fill.over{background:linear-gradient(135deg,var(--rose) 0%,#922f2d 100%)}

  /* ---- plan cards (billing) ---- */
  .plans{display:grid;grid-template-columns:1fr;gap:14px;margin-top:16px}
  @media(min-width:760px){.plans{grid-template-columns:repeat(3,1fr)}}
  .plan{display:flex;flex-direction:column;gap:4px;position:relative}
  .plan.current{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-weak),var(--shadow)}
  .plan .pname{font-size:15px;font-weight:750;letter-spacing:-.01em}
  .plan .price{font-size:30px;font-weight:800;letter-spacing:-.02em;margin:2px 0}
  .plan .price span{font-size:14px;font-weight:600;color:var(--mut)}
  .plan ul{list-style:none;margin:12px 0 16px;padding:0;display:flex;flex-direction:column;gap:9px}
  .plan li{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;color:var(--ink-soft)}
  .plan li svg{flex:0 0 auto;color:var(--gold);margin-top:1px}
  .plan .top{margin-top:auto}
  .tag{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:var(--accent-weak);color:var(--accent-ink)}

  /* ---- billing cycle toggle ---- */
  .cycle{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px}
  .seg{display:inline-flex;padding:3px;background:var(--paper);border:1px solid var(--line);border-radius:999px}
  .seg button{border:0;background:none;padding:9px 18px;border-radius:999px;font-size:13px;font-weight:650;color:var(--ink-soft);transition:background .14s,color .14s,box-shadow .14s}
  .seg button.on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(17,33,43,.12)}
  .seg button:hover:not(.on){color:var(--ink-soft)}
  .save-note{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:650;color:var(--gold)}
  @media (prefers-reduced-motion:reduce){.seg button{transition:none!important}}

  /* ---- transcript modal ---- */
  @keyframes ovIn{from{opacity:0}to{opacity:1}}
  @keyframes sheetIn{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}
  .ov{position:fixed;inset:0;z-index:60;background:rgba(17,33,43,.46);display:grid;place-items:center;padding:18px;animation:ovIn .2s ease both}
  .sheet{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--shadow-lg);width:min(560px,100%);max-height:84vh;display:flex;flex-direction:column;animation:sheetIn .3s cubic-bezier(.2,.7,.3,1) both}
  .sheet .sh-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid var(--line-2)}
  .sheet .sh-x{width:32px;height:32px;border-radius:9px;border:1px solid var(--line);background:#fff;display:grid;place-items:center;font-size:17px;line-height:1;color:var(--mut)}
  .sheet .sh-x:hover{background:var(--paper)}
  .sheet .sh-body{padding:18px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
  .turn{display:flex;flex-direction:column;gap:3px;max-width:84%}
  .turn .who{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--faint)}
  .turn .bub{padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
  .turn.user{align-self:flex-end;align-items:flex-end}
  .turn.user .bub{background:var(--accent-weak);color:var(--ink);border-bottom-right-radius:5px}
  .turn.asst{align-self:flex-start}
  .turn.asst .bub{background:var(--paper);color:var(--ink-soft);border:1px solid var(--line-2);border-bottom-left-radius:5px}
  .turn .ts{font-size:11px;color:var(--faint)}
  tbody tr.clickable{cursor:pointer}

  /* ---- skeleton shimmer ---- */
  @keyframes shim{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}
  .skel{border-radius:8px;background:var(--line-2);background-image:linear-gradient(90deg,var(--line-2) 0,var(--line) 40px,var(--line-2) 80px);background-size:200px 100%;background-repeat:no-repeat;animation:shim 1.2s ease-in-out infinite}
  .skel-row{height:13px;margin:9px 0}

  /* ---- toast ---- */
  @keyframes toastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
  .toast{display:flex;gap:10px;align-items:flex-start;padding:13px 15px;border-radius:var(--r-sm);font-size:13.5px;margin-bottom:16px;animation:toastIn .34s cubic-bezier(.2,.7,.3,1) both}
  .toast.ok{background:var(--gold-weak);color:var(--gold)}
  .toast.warn{background:var(--amber-weak);color:var(--amber)}
  .toast svg{flex:0 0 auto;margin-top:1px}

  /* reduced motion: disable all non-essential motion, keep meters instant */
  @media (prefers-reduced-motion:reduce){
    .view-in,.stagger>*,tbody.stagger tr,.ov,.sheet,.toast,.skel{animation:none!important}
    .meter .fill{transition:none!important}
    .nav:hover,.card.lift:hover{transform:none!important}
  }

  /* ---- mobile: table headers + billing plan cards ---- */
  @media(max-width:560px){
    thead th{font-size:12px;letter-spacing:.03em}
    .plan .price{font-size:24px}
    .seg button{padding:8px 12px;font-size:12.5px}
  }

  /* ---- mobile: outreach find row — stack inputs full-width on phones ---- */
  @media(max-width:600px){
    #ofind-row{flex-direction:column}
    #ofind-row>label,#ofind-row>button{width:100%!important;min-width:0!important;flex:none!important}
    #ofind-kw{width:100%!important}
  }
</style></head><body>
<div id=nprog></div>
<div id=app class=center><div class="card pad"><p class=sub><span class=spin></span> Loading your dashboard…</p></div></div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js" integrity="sha384-GFr3yTh5lJznCbZfpTtXnwboFsxqtTQoeTZCRHhE0579KrRmlCzen5AA8ohaB5ug" crossorigin="anonymous"></script>
<script>
const BASE=${B};
const app=document.getElementById('app');
let sb,session,tenants=[],active=null,gapCount=0,isAdmin=false;

/* ---- security helpers (unchanged contract) ---- */
const esc=s=>(s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Only render http(s) links — blocks javascript:/data: stored in page_url from the widget.
const safeHref=u=>/^https?:\\/\\//i.test(u||'')?esc(u):'';
const fmt=d=>{try{return new Date(d).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}catch(e){return d}};
const money=n=>'£'+Number(n||0).toLocaleString();
const num=n=>Number(n||0).toLocaleString();

// Global loading bar, ref-counted so concurrent fetches share one bar. The bar creeps toward
// 90% while requests are in flight, then snaps to 100% and fades when the last one finishes.
var _load=0,_lt=null;
function startLoad(){
  _load++;var b=document.getElementById('nprog');if(!b)return;
  b.classList.add('go');
  if(_lt)return; // already creeping
  var cur=0.18;b.style.transform='scaleX('+cur+')';
  _lt=setInterval(function(){cur+=(0.9-cur)*0.12;b.style.transform='scaleX('+cur.toFixed(3)+')'},280);
}
function stopLoad(){
  _load=Math.max(0,_load-1);if(_load>0)return;
  var b=document.getElementById('nprog');if(!b)return;
  if(_lt){clearInterval(_lt);_lt=null}
  b.style.transform='scaleX(1)';
  setTimeout(function(){if(_load===0){b.classList.remove('go');b.style.transform='scaleX(0)'}},300);
}
async function api(path,opts){
  startLoad();
  try{
    const h=Object.assign({'content-type':'application/json'},opts&&opts.headers);
    if(session)h.authorization='Bearer '+session.access_token;
    const r=await fetch(BASE+path,Object.assign({},opts,{headers:h}));
    if(!r.ok){
      let e='',body=null;try{body=await r.json();e=body.error}catch(x){}
      const err=new Error(e||friendlyHttp(r.status));
      err.status=r.status;err.body=body||{};err.upgrade=!!(body&&body.upgrade);
      throw err;
    }
    return r.json();
  }finally{ stopLoad(); }
}
function friendlyHttp(code){
  if(code===401||code===403)return 'Your session expired. Please sign in again.';
  if(code===404)return 'We could not find that. Try refreshing.';
  if(code>=500)return 'Something went wrong on our side. Please try again in a moment.';
  return 'Something went wrong. Please try again.';
}

/* small inline icon set (no external requests) */
const ico={
  home:'<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  leads:'<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx=9 cy=7 r=4/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
  chat:'<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5Z"/></svg>',
  gaps:'<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><circle cx=12 cy=12 r=9/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 2.5"/><path d="M12 17h.01"/></svg>',
  preview:'<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx=12 cy=12 r=3/></svg>',
  gaps:'<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M9.5 9a2.5 2.5 0 1 1 3 2.45c-.6.15-1 .7-1 1.3V14"/><circle cx=12 cy=17.5 r=.6 fill=currentColor stroke=none/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>',
  install:'<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="m7 8-4 4 4 4"/><path d="m17 8 4 4-4 4"/><path d="m14 4-4 16"/></svg>',
  set:'<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><circle cx=12 cy=12 r=3/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></svg>',
  money:'<svg width=14 height=14 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  bell:'<svg width=14 height=14 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg>',
  cal:'<svg width=14 height=14 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><rect x=3 y=4 width=18 height=18 rx=2/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  bolt:'<svg width=14 height=14 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"/></svg>',
  doc:'<svg width=14 height=14 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>',
  tick:'<svg class=tick viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=2.4 stroke-linecap=round stroke-linejoin=round><path d="M20 6 9 17l-5-5"/></svg>',
  spark:'<svg width=22 height=22 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>',
  info:'<svg width=16 height=16 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><circle cx=12 cy=12 r=9/><path d="M12 16v-4M12 8h.01"/></svg>',
  bill:'<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><rect x=2 y=5 width=20 height=14 rx=2/><path d="M2 10h20"/></svg>',
  book:'<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><rect x=3 y=4 width=18 height=18 rx=2/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>',
  star:'<svg width=14 height=14 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M12 3.5 14.6 9l6 .5-4.6 3.9L17.5 19 12 15.8 6.5 19l1.5-5.6L3.4 9.5 9.4 9 12 3.5Z"/></svg>',
  feedback:'<svg width=18 height=18 viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.3a2 2 0 0 0 2-1.7l1.4-9a2 2 0 0 0-2-2.3H14Z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>'
};

/* ===== boot / auth ===== */
async function boot(){
  let cfg;
  try{cfg=await (await fetch(BASE+'/api/config')).json()}catch(e){cfg={}}
  if(!cfg.supabaseAnonKey){
    app.className='center';
    app.innerHTML='<div class="card pad" style="max-width:420px"><div class=eyebrow>Setup needed</div>'+
      '<h1 class=h-title style="margin:6px 0 8px">Almost there</h1>'+
      '<p class=sub>Sign-in is not switched on yet. Add your Supabase keys to the server, then reload this page.</p></div>';
    return;
  }
  sb=supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  // Handle the magic-link return. supabase-js auto-reads an implicit (#access_token) link, but
  // a PKCE (?code=) link needs an explicit exchange. Either way, surface any error param so a
  // failed return shows a reason on the login screen instead of silently looping back to it.
  try{
    var qp=new URLSearchParams(location.search),hp=new URLSearchParams(location.hash.replace(/^#/,''));
    var err=qp.get('error_description')||qp.get('error')||hp.get('error_description')||hp.get('error');
    if(qp.get('code')){try{await sb.auth.exchangeCodeForSession(qp.get('code'));history.replaceState({},'',location.pathname);}catch(e){err=err||(e&&e.message);}}
    if(err)window.__authErr=decodeURIComponent(String(err).replace(/[+]/g,' '));
  }catch(e){}
  const {data}=await sb.auth.getSession();session=data.session;
  // supabase-js reads the implicit (#access_token) hash into the session, but leaves it in the URL —
  // strip it so a refresh/share doesn't carry the token and the URL stays clean.
  if(/access_token|refresh_token/.test(location.hash)){try{history.replaceState({},'',location.pathname);}catch(e){}}
  sb.auth.onAuthStateChange((e,s)=>{
    var was=!!session; session=s;
    // Only re-render on a real sign-in/out — NOT on TOKEN_REFRESHED or window-focus re-fires, which
    // otherwise rebuild the whole dashboard (losing your place) every time you switch windows.
    if(e==='SIGNED_OUT'||((!!s)!==was)) render();
  });
  render();
}
function render(){session?dash():login()}

function login(){
  app.className='center';
  app.innerHTML=''+
  '<div class="card pad wiz" style="max-width:400px;text-align:center">'+
    '<div class=logo style="justify-content:center;margin-bottom:6px"><span class=mark>S</span><span class=wm>Sona</span></div>'+
    '<h1 class=h-title style="margin:8px 0 6px">Welcome to Sona</h1>'+
    '<p class=sub style="margin-bottom:18px">Pop in your email and we\\'ll send you a 6-digit sign-in code. No password to remember.</p>'+
    '<label class=field for=em style="text-align:left">Email address</label>'+
    '<input id=em type=email placeholder="you@yourbusiness.com" autocomplete=email inputmode=email>'+
    '<div style="height:12px"></div>'+
    '<button class="btn block" id=go>Email me a sign-in code</button>'+
    '<p id=msg class=msg></p>'+
    '<div id=codebox style="display:none;margin-top:14px;border-top:1px solid var(--line,#e4dccb);padding-top:14px">'+
      '<label class=field for=code style="text-align:left">Enter the code from your email</label>'+
      '<input id=code inputmode=numeric autocomplete="one-time-code" placeholder="123456" maxlength=8>'+
      '<div style="height:10px"></div>'+
      '<button class="btn block ghost" id=verify>Sign in with code</button>'+
      '<p class=sub style="font-size:12px;margin-top:10px;line-height:1.5">In Safari or Chrome you can also tap the link in the email. If you opened this from the Instagram, Facebook or LinkedIn app, use the code above — the link can open a different browser and won\\'t sign you in.</p>'+
    '</div>'+
  '</div>';
  const go=document.getElementById('go'),em=document.getElementById('em'),msg=document.getElementById('msg');
  // If the magic-link return carried an error (expired link, or a redirect URL not in the
  // Supabase allow-list), say so — otherwise a failed sign-in just silently shows this form.
  if(window.__authErr){msg.className='msg err';msg.textContent='Sign-in link problem: '+window.__authErr;window.__authErr=null;}
  go.onclick=async()=>{
    const email=em.value.trim();
    if(!email||email.indexOf('@')<1){msg.className='msg err';msg.textContent='Please enter a valid email address.';em.focus();return}
    go.disabled=true;go.textContent='Sending…';msg.className='msg';msg.textContent='';
    const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});
    if(error){var em2=((error&&error.message)||'')+'';var rl=(error&&error.status===429)||/rate|429|only.*request|seconds|too many/i.test(em2);msg.className='msg err';msg.textContent=rl?'Too many sign-in attempts — please wait a few minutes, then try again.':'We couldn\\'t send that code. Double-check the address and try again.';go.disabled=false;go.textContent='Email me a sign-in code'}
    else{msg.className='msg ok';msg.textContent='Sent! Enter the 6-digit code from your email below.';go.textContent='Code sent ✓';document.getElementById('codebox').style.display='block';document.getElementById('code').focus()}
  };
  // Code path: verifies the OTP token directly, with NO redirect — works even when the magic
  // link's redirect URL isn't in the Supabase allow-list. On success onAuthStateChange renders.
  const verify=document.getElementById('verify'),code=document.getElementById('code');
  verify.onclick=async()=>{
    const token=code.value.trim();
    if(!/^[0-9]{6,8}$/.test(token)){msg.className='msg err';msg.textContent='Enter the code from your email.';code.focus();return}
    verify.disabled=true;verify.textContent='Checking…';msg.className='msg';msg.textContent='';
    const {error}=await sb.auth.verifyOtp({email:em.value.trim(),token,type:'email'});
    if(error){msg.className='msg err';msg.textContent='That code didn\\'t work — it may have expired. Send a fresh code and try again.';verify.disabled=false;verify.textContent='Sign in with code'}
  };
  code.addEventListener('keydown',e=>{if(e.key==='Enter')verify.click()});
  em.addEventListener('keydown',e=>{if(e.key==='Enter')go.click()});
  em.focus();
}

/* ===== top-level dashboard load ===== */
async function dash(){
  // SECURITY: fail-closed — never render a populated dashboard without a valid session.
  // render() already gates this (session?dash():login()), but the retry setTimeout below
  // calls dash() directly, bypassing render(), so we re-check here too.
  if(!session){login();return;}
  app.className='center';
  app.innerHTML='<div class="card pad"><p class=sub>Loading your assistant…</p></div>';
  var me;
  try{ me=await api('/api/me/tenants'); }
  catch(e){
    // The magic-link landing tab can fire this BEFORE the session token is attached → a transient
    // 401. Treating that as "no account" wrongly dropped returning users into the signup wizard.
    // Retry briefly (onAuthStateChange also re-renders once the session settles); NEVER fall through
    // to wizard() on an error — only on a SUCCESSFUL empty result below.
    if(!session){dash._tries=0;login();return;}  // session gone while retrying — go to login
    dash._tries=(dash._tries||0)+1;
    if(dash._tries<6){ setTimeout(dash,600); return; }
    dash._tries=0;
    app.innerHTML='<div class="card pad" style="text-align:center"><p class=sub>We could not load your account just now.</p><button class=btn onclick="location.reload()">Try again</button></div>';
    return;
  }
  dash._tries=0;
  isAdmin=!!(me&&me.isAdmin);
  tenants=((me&&me.tenants)||[]).filter(t=>/^[a-z0-9-]{2,40}$/.test(t.tenant));
  // Arriving from "Get this on my site": ?from=<demo slug> means copy that tested demo into this
  // account once, then land straight on its dashboard — no wizard, no rebuild. Guarded so the
  // magic-link retry loop / re-renders can't promote twice. On failure (demo expired or already
  // taken) we strip the param and fall through to the normal flow (wizard if they have no tenants).
  // Admin/founder users skip the promote flow entirely — they already have their own tenants and
  // should never accidentally clone a demo into their account (which would make the admin dashboard
  // appear to show a stranger's business data alongside the Outreach tab).
  var fromSlug=new URLSearchParams(location.search).get('from');
  if(fromSlug&&!isAdmin&&/^demo-[a-z0-9-]{1,40}$/.test(fromSlug)&&dash._promoted!==fromSlug){
    dash._promoted=fromSlug;
    if(!tenants.some(function(t){return t.tenant===fromSlug})){
      app.innerHTML='<div class="card pad" style="text-align:center"><p class=sub>Setting up your assistant…</p></div>';
      try{
        var pr=await api('/api/me/promote',{method:'POST',body:JSON.stringify({from:fromSlug})});
        if(pr&&pr.tenant){
          active=pr.tenant;
          me=await api('/api/me/tenants');
          tenants=((me&&me.tenants)||[]).filter(t=>/^[a-z0-9-]{2,40}$/.test(t.tenant));
        }
      }catch(e){ /* demo expired/taken — fall through to the normal flow below */ }
    }
  }
  // Strip ?from= from the URL regardless — applies to promoted users and to admin users who
  // skipped the promote block above (keeps the address bar clean in both cases).
  if(fromSlug)try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
  if(!tenants.length){return wizard();}
  active=active&&tenants.find(t=>t.tenant===active)?active:tenants[0].tenant;
  // land on Billing if returning from a Stripe checkout/portal redirect
  const qp=new URLSearchParams(location.search).get('billing');
  var tabIds=TABS.map(function(x){return x[0]});var hTab=location.hash.slice(1);var startTab=qp==='success'||qp==='cancel'?'billing':(tabIds.indexOf(hTab)>=0&&(hTab!=='outreach'||isAdmin)?hTab:'overview');
  shell(startTab);
}

/* slug derivation from a website URL (no slug ever shown to the user) */
function slugFromUrl(url){
  let s=(url||'').trim().toLowerCase();
  s=s.replace(/^https?:\\/\\//,'').replace(/^www\\./,'');
  s=s.split(/[\\/?#]/)[0];                 // host only
  s=s.replace(/\\.[a-z.]+$/,'');           // drop TLD(s)
  s=s.replace(/[^a-z0-9-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  if(s.length<2)s=(s+'-bot').replace(/^-/,'');
  if(s.length<2)s='my-assistant';
  return s.slice(0,40).replace(/-$/,'');
}
function normUrl(url){
  let u=(url||'').trim();
  if(!u)return '';
  if(!/^https?:\\/\\//i.test(u))u='https://'+u;
  return u;
}

/* ===== first-run guided wizard ===== */
let wizState={step:1,slug:null,url:'',name:''};
function wizard(){
  app.className='center';
  wizStep1();
}
function railHtml(step){
  const labels=['Your website','Meet your bot','Go live'];
  let h='<div class=rail>';
  for(let i=1;i<=3;i++){
    const cls=i<step?'done':i===step?'on':'';
    h+='<div class="step '+cls+'"><div class=num>'+(i<step?'✓':i)+'</div><div class=lbl>'+labels[i-1]+'</div></div>';
    if(i<3)h+='<div class="bar'+(i<step?' fill':'')+'"></div>';
  }
  return h+'</div>';
}
function wizShell(step,inner,wide){
  app.innerHTML=''+
  '<div class="card pad wiz'+(wide?' wide':'')+'">'+
    '<div class=logo style="justify-content:center;margin-bottom:18px"><span class=mark>S</span><span class=wm>Sona</span></div>'+
    railHtml(step)+inner+
  '</div>';
}
function wizStep1(){
  wizState.step=1;
  wizShell(1,''+
    '<div style="text-align:center">'+
      '<div class=eyebrow>Step 1 of 3</div>'+
      '<h1 class=h-title style="margin:8px 0 6px">What\\'s your website?</h1>'+
      '<p class=sub style="margin-bottom:18px">Drop in your address and Sona reads your site to learn about your business — your services, hours, prices, the lot. Takes about a minute.</p>'+
    '</div>'+
    '<label class=field for=wurl>Your website address</label>'+
    '<input id=wurl type=url inputmode=url placeholder="yourbusiness.com" value="'+esc(wizState.url)+'" autocomplete=url>'+
    '<p class=hint>No website yet? You can add your details by hand later — just enter any address to start.</p>'+
    '<div style="height:14px"></div>'+
    '<label class=field for=wname>Business name <span style="color:var(--faint);font-weight:500">(optional)</span></label>'+
    '<input id=wname type=text placeholder="Your business name" value="'+esc(wizState.name||'')+'" autocomplete=organization>'+
    '<p class=hint>We\\'ll try to read it from your site — set it here to be sure it\\'s right.</p>'+
    '<div style="height:16px"></div>'+
    '<button class="btn block" id=wgo>Build my assistant →</button>'+
    '<p id=wmsg class=msg></p>');
  const inp=document.getElementById('wurl');
  document.getElementById('wgo').onclick=()=>wizBuild();
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')wizBuild()});
  inp.focus();
}
async function wizBuild(){
  const raw=document.getElementById('wurl').value;
  const msg=document.getElementById('wmsg');
  const url=normUrl(raw);
  if(!url||url.indexOf('.')<0){msg.className='msg err';msg.textContent='Please enter your website address, like yourbusiness.com';return}
  wizState.url=url;
  var nameEl=document.getElementById('wname');wizState.name=nameEl?nameEl.value.trim():'';
  let slug=slugFromUrl(url);
  // claim slug, retrying with -2,-3,... on 409
  wizShell(1,''+
    '<div style="text-align:center"><div class=eyebrow>Setting things up</div>'+
    '<h1 class=h-title style="margin:8px 0 4px">Creating your assistant…</h1></div>'+
    '<div class=prog><i id=pbar style="width:18%"></i></div>'+
    '<div class=steps-list>'+
      '<div class=it id=s_claim><span class=spin></span> Reserving your assistant</div>'+
      '<div class=it id=s_read><span class=spin style="visibility:hidden"></span> Reading your website</div>'+
      '<div class=it id=s_brand><span class=spin style="visibility:hidden"></span> Matching your brand</div>'+
    '</div>'+
    '<p id=wmsg2 class=msg></p>');
  const setDone=id=>{const el=document.getElementById(id);if(el){el.className='it done';el.querySelector('.spin').outerHTML=ico.tick}};
  const setOn=id=>{const el=document.getElementById(id);if(el){el.className='it on';el.querySelector('.spin').style.visibility='visible'}};
  const bar=document.getElementById('pbar');
  try{
    let claimed=null,attempt=0,base=slug;
    while(!claimed){
      const tryslug=attempt===0?base:(base.slice(0,38).replace(/-$/,'')+'-'+(attempt+1));
      try{
        const r=await api('/api/me/claim',{method:'POST',body:JSON.stringify({slug:tryslug,name:wizState.name||undefined})});
        claimed=(r.tenant&&r.tenant.slug)||tryslug;
      }catch(e){
        if(/409|taken|exist/i.test(e.message)&&attempt<8){attempt++;continue}
        throw e;
      }
    }
    wizState.slug=claimed;
    setDone('s_claim');setOn('s_read');bar.style.width='45%';
    // ingest the site (auto-branding happens server-side here). Capture the chunk count + any failure
    // so we never silently advance to a preview with an empty "I'm not sure" bot.
    let ingestChunks=0,ingestFailed=false;
    try{
      const ir=await api('/api/t/'+encodeURIComponent(claimed)+'/ingest',{method:'POST',body:JSON.stringify({url:wizState.url})});
      ingestChunks=(ir&&typeof ir.chunks==='number')?ir.chunks:0;
    }catch(e){ingestFailed=true}
    setDone('s_read');setOn('s_brand');bar.style.width='80%';
    await new Promise(r=>setTimeout(r,500));
    setDone('s_brand');bar.style.width='100%';
    await new Promise(r=>setTimeout(r,350));
    if(ingestFailed||ingestChunks===0){wizTrouble(ingestFailed);return}
    wizStep2();
  }catch(e){
    const m=document.getElementById('wmsg2')||document.getElementById('wmsg');
    if(m){m.className='msg err';m.textContent=e.message}
    const b=document.createElement('button');b.className='btn ghost block';b.style.marginTop='14px';b.textContent='Try again';
    b.onclick=wizStep1;(document.querySelector('.wiz')||app).appendChild(b);
  }
}
// Ingest failed or came back empty — be honest, don't drop them into a dead "I'm not sure" preview.
// Offer a real retry, a manual route (Settings: hours/phone/services), or proceed with eyes open.
function wizTrouble(failed){
  wizState.step=1;
  wizShell(1,''+
    '<div style="text-align:center">'+
      '<div class=eyebrow style="color:var(--rose)">Couldn\\'t read your site</div>'+
      '<h1 class=h-title style="margin:8px 0 6px">'+(failed?'We couldn\\'t reach that website':'We didn\\'t find much to learn from')+'</h1>'+
      '<p class=sub style="margin-bottom:18px">'+(failed?'The address might be mistyped, or the site blocked our reader. Check it and try again — or add your details by hand and you\\'re still good to go.':'Your assistant is set up, but that page had little it could answer from. Try a fuller page (like your home page), or add your key details by hand.')+'</p>'+
    '</div>'+
    '<button class="btn block" id=wretry>Try a different address →</button>'+
    '<div style="height:10px"></div>'+
    '<button class="btn ghost block" id=wmanual>Add my details by hand</button>'+
    '<div style="height:10px"></div>'+
    '<button class="btn ghost block" id=wanyway>Continue anyway</button>');
  document.getElementById('wretry').onclick=wizStep1;
  document.getElementById('wmanual').onclick=async function(){active=wizState.slug;location.hash='settings';await dash()};
  document.getElementById('wanyway').onclick=wizStep2;
}
function wizStep2(){
  wizState.step=2;
  const src=BASE+'/demo/'+encodeURIComponent(wizState.slug);
  wizShell(2,''+
    '<div style="text-align:center">'+
      '<div class=eyebrow>Step 2 of 3</div>'+
      '<h1 class=h-title style="margin:8px 0 6px">Say hello to your assistant</h1>'+
      '<p class=sub style="margin-bottom:16px">This is the real thing, trained on your site. Go on — ask it about your prices, hours, or services.</p>'+
    '</div>'+
    '<div class=preview><div class=bar><span class=dots><i></i><i></i><i></i></span><span class=u>Live preview</span></div>'+
      '<iframe src="'+esc(src)+'" title="Live preview of your assistant" loading=lazy></iframe></div>'+
    '<div class=row style="margin-top:16px;gap:10px">'+
      '<button class="btn ghost" id=wback>Back</button>'+
      '<button class="btn" id=wnext style="flex:1">Looks good — finish setup →</button>'+
    '</div>',true);
  document.getElementById('wback').onclick=wizStep1;
  document.getElementById('wnext').onclick=wizStep3;
}
function wizStep3(){
  wizState.step=3;
  const embed='<script src="'+BASE+'/widget.js?tenant='+wizState.slug+'"><\\/script>';
  const embedHtml='&lt;script src="<span class=tok>'+esc(BASE+'/widget.js?tenant='+wizState.slug)+'</span>"&gt;&lt;/script&gt;';
  wizShell(3,''+
    '<div style="text-align:center">'+
      '<div class=tick style="width:46px;height:46px;margin:0 auto 10px;color:var(--gold)">'+ico.tick+'</div>'+
      '<div class=eyebrow style="color:var(--gold)">You\\'re live</div>'+
      '<h1 class=h-title style="margin:8px 0 6px">Your assistant is ready</h1>'+
      '<p class=sub style="margin-bottom:18px">Add it to your website by pasting this one line just before the closing <code>&lt;/body&gt;</code> tag. Or send it to whoever manages your site.</p>'+
    '</div>'+
    '<div class=embed id=emb>'+embedHtml+'</div>'+
    '<div class=row style="margin-top:12px">'+
      '<button class="btn ghost" id=wcopy style="flex:1">Copy the code</button>'+
      '<button class="btn" id=wdone style="flex:1">Go to my dashboard →</button>'+
    '</div>'+
    '<p id=wcmsg class="msg info" style="text-align:center">Tip: your assistant works on the preview straight away.</p>');
  document.getElementById('wcopy').onclick=()=>{
    navigator.clipboard.writeText(embed).then(()=>{const b=document.getElementById('wcopy');b.textContent='Copied ✓';setTimeout(()=>b.textContent='Copy the code',1600)}).catch(()=>{const b=document.getElementById('wcopy');b.textContent='Copy failed — select manually';setTimeout(()=>b.textContent='Copy the code',2500)});
  };
  document.getElementById('wdone').onclick=async()=>{active=wizState.slug;await dash()};
}

/* ===== main app shell (sidebar + content) ===== */
const TABS=[
  ['overview','Overview',ico.home],
  ['leads','Leads',ico.leads],
  ['convos','Conversations',ico.chat],
  ['bookings','Bookings',ico.book],
  ['outreach','Outreach',ico.chat],
  ['gaps','Content gaps',ico.gaps],
  ['preview','Preview',ico.preview],
  ['feedback','Feedback',ico.feedback],
  ['billing','Billing',ico.bill],
  ['sources','Install',ico.install],
  ['settings','Settings',ico.set]
];
function shell(tab){
  app.className='';
  const tname=t=>esc((t.tenants&&t.tenants.name)||t.tenant);
  const opts=tenants.map(t=>'<option value="'+esc(t.tenant)+'"'+(t.tenant===active?' selected':'')+'>'+tname(t)+'</option>').join('');
  const navItems=TABS.filter(([k])=>k!=='outreach'||isAdmin).map(([k,l,svg])=>{
    const badge=(k==='gaps'&&gapCount>0)?'<span class=badge>'+gapCount+'</span>':'';
    return '<button class="nav" data-tab="'+k+'" role=tab aria-selected=false>'+svg+'<span>'+l+'</span>'+badge+'</button>';
  }).join('');
  app.innerHTML=''+
  '<div class=app>'+
    '<aside class=side aria-label="Main navigation">'+
      '<div class=logo><span class=mark>S</span><span class=wm>Sona</span></div>'+
      (tenants.length>1?
        '<div class=tswitch><label class=sr for=tsel>Choose business</label><select id=tsel>'+opts+'</select></div>'
        :'<div class=live style="padding:2px 6px"><span class=dot></span> Assistant live</div>')+
      '<nav class=navlist role=tablist>'+navItems+'</nav>'+
      '<div class=side-foot>'+
        '<button class="btn ghost sm" id=newbot>+ Add another business</button>'+
        '<button class="btn ghost sm" id=out>Sign out</button>'+
        '<div class=legal>'+
          '<a href="'+safeHref(BASE+'/privacy')+'" target=_blank rel=noopener>Privacy</a>'+
          '<span class=sep>·</span>'+
          '<a href="'+safeHref(BASE+'/terms')+'" target=_blank rel=noopener>Terms</a>'+
        '</div>'+
      '</div>'+
    '</aside>'+
    '<main class=main id=main></main>'+
  '</div>';
  const sel=document.getElementById('tsel');
  if(sel)sel.onchange=()=>{active=sel.value;shell('overview')};
  document.getElementById('out').onclick=()=>sb.auth.signOut();
  document.getElementById('newbot').onclick=()=>{wizState={step:1,slug:null,url:'',name:''};wizard()};
  app.querySelectorAll('.nav').forEach(b=>b.onclick=()=>loadTab(b.dataset.tab));
  loadTab(tab||'overview');
  refreshGapBadge();
}
function setActiveNav(tab){
  app.querySelectorAll('.nav').forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false')});
}
async function refreshGapBadge(){
  try{const g=await api('/api/t/'+encodeURIComponent(active)+'/gaps');const n=g.filter(x=>!x.resolved).length;
    if(n!==gapCount){gapCount=n;app.querySelectorAll('.nav[data-tab=gaps]').forEach(b=>{
      const old=b.querySelector('.badge');if(old)old.remove();
      if(n>0){const s=document.createElement('span');s.className='badge';s.textContent=n;b.appendChild(s)}})}
  }catch(e){}
}

async function loadTab(tab){
  setActiveNav(tab);
  location.hash=tab;
  const main=document.getElementById('main');
  main.innerHTML='<div class="card pad"><p class=sub>Loading…</p></div>';
  window.scrollTo({top:0,behavior:'instant'in document.documentElement.style?'instant':'auto'});
  try{
    if(tab==='overview')return await renderOverview(main);
    if(tab==='leads')return renderLeads(main,await api('/api/t/'+encodeURIComponent(active)+'/leads'));
    if(tab==='convos')return renderConvos(main,await api('/api/t/'+encodeURIComponent(active)+'/convos'));
    if(tab==='bookings')return renderBookings(main,await api('/api/t/'+encodeURIComponent(active)+'/bookings'));
    if(tab==='outreach')return await renderOutreach(main);
    if(tab==='gaps')return renderGaps(main,await api('/api/t/'+encodeURIComponent(active)+'/gaps'));
    if(tab==='preview')return renderPreview(main);
    if(tab==='billing')return await renderBilling(main);
    if(tab==='feedback')return await renderFeedback(main);
    if(tab==='sources')return renderSources(main);
    if(tab==='settings')return await renderSettings(main);
  }catch(e){
    main.innerHTML='<div class="card pad"><div class=empty><div class=ico>'+ico.info+'</div>'+
      '<h3>We hit a snag</h3><p>'+esc(e.message)+'</p>'+
      '<div style="height:14px"></div><button class="btn ghost sm" id=retry>Try again</button></div></div>';
    document.getElementById('retry').onclick=()=>loadTab(tab);
  }
}
function pageHead(title,sub,right){
  return '<div class=page-head><div><h1 class=display style="font-size:24px">'+esc(title)+'</h1>'+
    (sub?'<p class=sub style="margin-top:4px">'+esc(sub)+'</p>':'')+'</div>'+(right||'')+'</div>';
}
function mobileFoot(){
  return '<div class=mobile-foot style="flex-direction:column;align-items:stretch;gap:8px">'+
      '<div class=row style="gap:8px"><button class="btn ghost sm" id=mnew style="flex:1">+ Add business</button><button class="btn ghost sm" id=mout style="flex:1">Sign out</button></div>'+
      '<div class="legal" style="justify-content:center">'+
        '<a href="'+safeHref(BASE+'/privacy')+'" target=_blank rel=noopener>Privacy</a>'+
        '<span class=sep>·</span>'+
        '<a href="'+safeHref(BASE+'/terms')+'" target=_blank rel=noopener>Terms</a>'+
      '</div>'+
    '</div>';
}
function wireMobileFoot(){
  const n=document.getElementById('mnew'),o=document.getElementById('mout');
  if(n)n.onclick=()=>{wizState={step:1,slug:null,url:'',name:''};wizard()};
  if(o)o.onclick=()=>sb.auth.signOut();
}

/* ----- Overview ----- */
async function renderOverview(main){
  const s=await api('/api/t/'+encodeURIComponent(active)+'/stats');
  const pipeline=Number(s.estimatedPipeline||0);
  // count-up stat: data-cu holds the target; animated after render
  const stat=(n,l,svg,good,cu)=>'<div class="stat'+(good?' good':'')+'"><div class=n'+(cu!=null?' data-cu="'+cu+'"'+(cu&&!Number.isInteger(cu)?'':'')+'"':'')+'>'+n+'</div><div class=l>'+(svg||'')+l+'</div></div>';
  const csat=s.csat;
  const csatVal=(csat==null?'—':num(csat)+'%');
  const csatSub=(csat==null?'No ratings yet':num(s.feedbackCount||0)+' rated');
  main.innerHTML=''+
    pageHead('Overview','Here\\'s what your assistant has been doing for you.',
      '<div class=live><span class=dot></span> Assistant live</div>')+
    '<section class="hero view-in">'+
      '<div class=eyebrow>Potential business captured</div>'+
      '<div class=big data-cu="'+pipeline+'" data-money=1>'+money(pipeline)+'</div>'+
      '<p class=cap>A rough estimate of what the leads your assistant caught could be worth — visitors it turned into potential customers while you were busy.</p>'+
    '</section>'+
    '<div class="stats stagger">'+
      stat(num(s.leads),'New leads',ico.leads,true,Number(s.leads||0))+
      stat(num(s.bookings),'Bookings',ico.cal,false,Number(s.bookings||0))+
      stat(num(s.delivered||0),'Alerts sent to you',ico.bell,false,Number(s.delivered||0))+
      stat(num(s.conversations30d),'Chats (last 30 days)',ico.chat,false,Number(s.conversations30d||0))+
      '<div class="stat good"><div class=n>'+csatVal+'</div><div class=l>'+ico.star+'Helpful answers</div>'+
        '<div class=tiny style="margin-top:4px">'+esc(csatSub)+'</div></div>'+
      stat(num(s.sources),'Pages learned',ico.doc,false,Number(s.sources||0))+
      stat(num(s.unanswered),'Questions to answer',ico.gaps,false,Number(s.unanswered||0))+
    '</div>'+
    ((Number(s.unanswered)>0)?
      '<div class=card style="margin-top:16px"><div class=pad style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:space-between">'+
        '<div><div class=h-sec>Make your assistant smarter</div>'+
        '<p class=sub style="margin-top:3px">There are '+num(s.unanswered)+' question(s) your assistant couldn\\'t answer. Adding a page that covers them helps it close more leads.</p></div>'+
        '<button class="btn sm" id=goGaps>See the questions</button></div></div>'
      :'')+
    mobileFoot();
  const gg=document.getElementById('goGaps');if(gg)gg.onclick=()=>loadTab('gaps');
  countUp(main);
  wireMobileFoot();
}

/* animated count-up for [data-cu] numbers (respects reduced motion) */
function countUp(scope){
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  scope.querySelectorAll('[data-cu]').forEach(el=>{
    const target=Number(el.dataset.cu||0),isMoney=el.dataset.money==='1';
    if(reduce||!isFinite(target)||target<=0)return;
    const dur=900,t0=performance.now();
    const paint=v=>{el.textContent=isMoney?money(Math.round(v)):num(Math.round(v))};
    paint(0);
    const tick=now=>{
      const p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);
      paint(target*e);
      if(p<1)requestAnimationFrame(tick);else paint(target);
    };
    requestAnimationFrame(tick);
  });
}

/* ----- Leads ----- */
function scorePill(n){
  const v=(n==null?null:Number(n));
  const c=v>=70?'hot':v>=40?'warm':'cold';
  const lbl=v>=70?'Hot':v>=40?'Warm':'Cold';
  return '<span class="pill '+c+'">'+lbl+(v==null?'':' · '+v)+'</span>';
}
function renderLeads(main,rows){
  let body;
  if(!rows.length){
    body='<div class=empty><div class=ico>'+ico.leads+'</div><h3>No leads yet</h3>'+
      '<p>When someone shares their details with your assistant, they\\'ll show up here — newest first, with a hot/warm/cold rating.</p></div>';
  }else{
    body='<div class=tbl-wrap><table><thead><tr><th>When</th><th>Contact</th><th>Interest</th><th>What they asked</th></tr></thead><tbody class=stagger>'+
      rows.map(r=>'<tr>'+
        '<td class=tiny>'+esc(fmt(r.captured_at))+'</td>'+
        '<td><div style="font-weight:650">'+esc(r.name||'Someone')+'</div>'+
          '<div class=tiny>'+esc(r.email||r.phone||'No contact left')+'</div></td>'+
        '<td>'+scorePill(r.score)+'</td>'+
        '<td>'+esc(r.question||'—')+'</td></tr>').join('')+'</tbody></table></div>';
  }
  const tools=rows.length?'<div style="display:flex;justify-content:flex-end;margin:0 0 12px"><button class="btn ghost" id=dlLeads>⬇ Download CSV</button></div>':'';
  main.innerHTML=pageHead('Leads','People your assistant captured for you.')+tools+
    '<div class="card view-in">'+(rows.length?body:'<div class=pad>'+body+'</div>')+'</div>'+mobileFoot();
  const dl=document.getElementById('dlLeads');
  if(dl)dl.onclick=downloadLeads;
  wireMobileFoot();
}

// Fetch leads.csv WITH the auth header (a plain link can't send it), then save the file.
async function downloadLeads(){
  try{
    const h={}; if(session)h.authorization='Bearer '+session.access_token;
    const r=await fetch(BASE+'/api/t/'+encodeURIComponent(active)+'/leads.csv',{headers:h});
    if(!r.ok)throw new Error('download failed');
    const blob=await r.blob();
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=active+'-leads.csv';document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
  }catch(e){const btn=document.getElementById('dlLeads');if(btn){const ot=btn.textContent;btn.textContent='Download failed — try again';setTimeout(()=>{btn.textContent=ot},2500)}}
}

/* ----- Outreach: find prospects → build demos → track to signup ----- */
var OSTAGES=['found','built','ready','sent','opened','replied','signed','skipped'];
async function renderOutreach(main){
  main.innerHTML=pageHead('Outreach','Find local businesses, build each a live demo from their own site, then send them the link.')+
    '<div class="card pad" style="margin-bottom:14px">'+
      '<div class=h-sec>Find prospects</div>'+
      '<p class=hint>Free lookup via OpenStreetMap — local businesses that list their own website. No account, no cost.</p>'+
      '<div id=ofind-row style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin-top:6px">'+
        '<label style="flex:2;min-width:170px">Business type<br><input id=ofind-v list=ofind-types autocomplete=off placeholder="e.g. salons, dentists, coffee shop" style="width:100%;padding:9px 11px;border:1px solid var(--line,#e4dccb);border-radius:10px;font:inherit"><datalist id=ofind-types></datalist></label>'+
        '<label style="flex:2;min-width:190px;position:relative">Location<br><input id=ofind-a autocomplete=off placeholder="Start typing a town or city…" style="width:100%;padding:9px 11px;border:1px solid var(--line,#e4dccb);border-radius:10px;font:inherit"><div id=ofind-ac style="display:none;position:absolute;z-index:30;left:0;right:0;top:100%;background:#fff;border:1px solid var(--line,#e4dccb);border-radius:10px;margin-top:4px;max-height:230px;overflow:auto;box-shadow:0 8px 24px rgba(0,0,0,.12)"></div></label>'+
        '<label style="width:118px">Within<br><select id=ofind-r style="width:100%;padding:9px 11px;border:1px solid var(--line,#e4dccb);border-radius:10px;font:inherit"><option value=2>2 miles</option><option value=5 selected>5 miles</option><option value=10>10 miles</option><option value=25>25 miles</option><option value=50>50 miles</option></select></label>'+
        '<label style="width:78px">Max<br><input id=ofind-n type=number value=25 min=1 max=50 style="width:100%;padding:9px 11px;border:1px solid var(--line,#e4dccb);border-radius:10px;font:inherit"></label>'+
        '<button class="btn ghost" id=ofind-presets type=button>UK cities ▾</button>'+
        '<button class="btn" id=ofind-btn>Find</button>'+
      '</div>'+
      '<div id=ofind-preset-list style="display:none;flex-wrap:wrap;gap:6px;margin-top:8px"></div>'+
      '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;align-items:center">'+
        '<label class=sub style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type=checkbox id=ofind-email> Only show ones with a contact email</label>'+
        '<label class=sub style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type=checkbox id=ofind-hidebuilt> Hide ones already built</label>'+
        '<label class=sub style="display:flex;align-items:center;gap:6px">Name contains <input id=ofind-kw placeholder="(optional)" style="padding:6px 9px;border:1px solid var(--line,#e4dccb);border-radius:8px;font:inherit;width:120px"></label>'+
      '</div>'+
      '<span id=ofind-msg class=sub style="display:block;margin-top:8px"></span>'+
    '</div>'+
    '<div class="card pad" style="margin-bottom:14px">'+
      '<div class=h-sec>Build demos</div>'+
      '<p class=hint>Build live demos for everyone found, or paste extra website addresses (one per line). A few seconds each.</p>'+
      '<textarea id=obuild rows=2 placeholder="examplesalon.co.uk\\nanothershop.com" style="width:100%;border:1px solid var(--line,#e4dccb);border-radius:10px;padding:11px 13px;font:inherit;font-size:15px;outline:0;resize:vertical"></textarea>'+
      '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id=obtn-all>Build all found</button><button class="btn ghost" id=obtn>Build pasted</button><span id=omsg class=sub style="margin-left:4px;align-self:center"></span></div>'+
    '</div>'+
    '<div id=ofunnel style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"></div>'+
    '<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><button class="btn ghost sm" id=oclr-btn>Clear all</button></div>'+
    '<div id=olist class="card view-in"><div class=pad><p class=sub>Loading pipeline…</p></div></div>'+mobileFoot();
  wireMobileFoot();
  // Populate verticals.
  // Business-type presets (datalist — value is the key, label is friendly; free text also allowed).
  try{var v=await api('/api/outreach/verticals');var dl=document.getElementById('ofind-types');if(dl)dl.innerHTML=(v.verticals||[]).map(function(x){return '<option value="'+esc(x.key)+'">'+esc(x.label)+'</option>'}).join('')}catch(e){}
  var ofConfirmed=null; // {lat,lon,name} once the owner picks/confirms a place
  var ofCities=['London','Birmingham','Manchester','Leeds','Glasgow','Sheffield','Liverpool','Bristol','Newcastle upon Tyne','Nottingham','Leicester','Cardiff','Edinburgh','Belfast','Brighton','Southampton','Plymouth','Coventry','Kingston upon Hull','Stoke-on-Trent','Wolverhampton','Reading','Derby','Aberdeen','Norwich'];
  var ofPL=document.getElementById('ofind-preset-list');
  if(ofPL)ofPL.innerHTML=ofCities.map(function(c){return '<button type=button class="btn ghost sm" data-city="'+esc(c)+'" style="margin:0">'+esc(c)+'</button>'}).join('');
  // Geocode a place → either show a pick-list, or auto-confirm the top hit (presets / Find fallback).
  async function ofGeocode(q,autopick){
    var ac=document.getElementById('ofind-ac'),m=document.getElementById('ofind-msg');
    try{var r=await api('/api/outreach/geocode?q='+encodeURIComponent(q));var places=r.places||[];
      if(autopick){if(places.length){ofConfirmed={lat:places[0].lat,lon:places[0].lon,name:places[0].name};document.getElementById('ofind-a').value=places[0].name;m.innerHTML='<span style="color:var(--gold)">📍 '+esc(places[0].display)+'</span>';}ac.style.display='none';return;}
      if(!places.length){ac.style.display='none';return;}
      ac.__places=places;
      ac.innerHTML=places.map(function(p,i){return '<div class=ofac-row data-i="'+i+'" style="padding:9px 11px;cursor:pointer;border-bottom:1px solid var(--line,#f0e9da)"><b style="font-size:14px">'+esc(p.name)+'</b><span class=sub style="display:block;font-size:12px">'+esc(p.display)+'</span></div>'}).join('');
      ac.style.display='block';
    }catch(e){ac.style.display='none';}
  }
  document.getElementById('ofind-presets').onclick=function(){var pl=document.getElementById('ofind-preset-list');pl.style.display=pl.style.display==='none'?'flex':'none';};
  if(ofPL)ofPL.onclick=async function(e){var btn=e.target.closest('[data-city]');if(!btn)return;document.getElementById('ofind-a').value=btn.dataset.city;ofPL.style.display='none';await ofGeocode(btn.dataset.city,true);};
  var ofAcTimer=null;
  document.getElementById('ofind-a').oninput=function(){var q=this.value.trim();ofConfirmed=null;if(ofAcTimer)clearTimeout(ofAcTimer);if(q.length<2){document.getElementById('ofind-ac').style.display='none';return;}ofAcTimer=setTimeout(function(){ofGeocode(q,false);},350);};
  document.getElementById('ofind-ac').onclick=function(e){var row=e.target.closest('.ofac-row');if(!row)return;var p=(this.__places||[])[+row.dataset.i];if(!p)return;ofConfirmed={lat:p.lat,lon:p.lon,name:p.name};document.getElementById('ofind-a').value=p.name;this.style.display='none';document.getElementById('ofind-msg').innerHTML='<span style="color:var(--gold)">📍 '+esc(p.display)+'</span>';};
  document.getElementById('ofind-btn').onclick=async()=>{
    var b=document.getElementById('ofind-btn'),m=document.getElementById('ofind-msg');
    var type=document.getElementById('ofind-v').value.trim();
    var area=document.getElementById('ofind-a').value.trim();
    var limit=+document.getElementById('ofind-n').value||25;
    var radiusMiles=+document.getElementById('ofind-r').value||5;
    var requireEmail=document.getElementById('ofind-email').checked;
    var hideBuilt=document.getElementById('ofind-hidebuilt').checked;
    var nameKeyword=document.getElementById('ofind-kw').value.trim();
    if(!type){m.textContent='Enter a business type first.';return}
    if(!area){m.textContent='Enter a location first.';return}
    // Typed a place but didn't pick from the list? Confirm the top match now.
    if(!ofConfirmed){m.innerHTML='<span class=spin></span> Finding that location…';await ofGeocode(area,true);}
    if(!ofConfirmed){m.textContent='Could not find that location — try a nearby town or city.';return}
    b.disabled=true;m.innerHTML='<span class=spin></span> Searching OpenStreetMap…';
    try{var r=await api('/api/outreach/find',{method:'POST',body:JSON.stringify({type:type,area:ofConfirmed.name,lat:ofConfirmed.lat,lon:ofConfirmed.lon,radiusMiles:radiusMiles,limit:limit,requireEmail:requireEmail,hideBuilt:hideBuilt,nameKeyword:nameKeyword})});
      var fc=r.found||0,extra='';
      if(requireEmail&&r.skippedNoEmail)extra=' ('+r.skippedNoEmail+' skipped — no contactable email)';
      if(r.skippedChain)extra+=' ('+r.skippedChain+' national chains/franchises filtered out)';
      if(fc===0)m.innerHTML='<b>No matches here.</b> Try a wider radius, a bigger nearby town, or turn off the email filter.'+extra;
      else m.innerHTML='<b style="color:var(--gold)">Found '+fc+' businesses'+(requireEmail?' with an email':'')+'.</b> Scroll down to build their demos.'+extra;
      await loadOutreachList();
      var ol=document.getElementById('olist');if(ol&&fc)ol.scrollIntoView({behavior:'smooth',block:'start'});
    }
    catch(e){m.textContent='Could not search — '+e.message}
    b.disabled=false;
  };
  document.getElementById('obtn').onclick=async()=>{
    var urls=document.getElementById('obuild').value.trim();if(!urls)return;
    var b=document.getElementById('obtn'),m=document.getElementById('omsg');
    b.disabled=true;m.textContent='Building… a few seconds each.';
    try{var r=await api('/api/outreach/build',{method:'POST',body:JSON.stringify({urls:urls})});m.textContent='Built '+((r&&r.built&&r.built.length)||0)+' demo(s).';document.getElementById('obuild').value='';await loadOutreachList();}
    catch(e){m.textContent='Could not build — '+e.message}
    b.disabled=false;
  };
  document.getElementById('obtn-all').onclick=async()=>{
    var b=document.getElementById('obtn-all'),m=document.getElementById('omsg');
    var slugs=(window.__oprospects||[]).filter(function(p){return p.stage==='found'}).map(function(p){return p.slug});
    if(!slugs.length){m.textContent='Nothing new to build — find some prospects first.';return}
    b.disabled=true;var done=0,total=slugs.length;
    m.innerHTML='<span class=spin></span> Building 0 of '+total+'…';
    for(var i=0;i<slugs.length;i++){
      try{await api('/api/outreach/build',{method:'POST',body:JSON.stringify({slugs:[slugs[i]]})})}catch(e){}
      done++;m.innerHTML='<span class=spin></span> Building '+done+' of '+total+'…';
    }
    m.textContent='Built '+done+' of '+total+' demo(s).';
    await loadOutreachList();
    b.disabled=false;
  };
  var oclrbtn=document.getElementById('oclr-btn');
  if(oclrbtn)oclrbtn.onclick=async function(){
    if(!window.confirm('Delete all prospects? This cannot be undone.'))return;
    oclrbtn.disabled=true;
    try{await api('/api/outreach/clear',{method:'POST',body:'{}'});await loadOutreachList();}
    catch(e){var om=document.getElementById('omsg');if(om){om.textContent='Could not clear: '+(e.message||'error')}}
    oclrbtn.disabled=false;
  };
  await loadOutreachList();
}
async function loadOutreachList(){
  var box=document.getElementById('olist');if(!box)return;
  var rows=[],fun={};
  try{rows=await api('/api/outreach/list');fun=await api('/api/outreach/funnel')}catch(e){box.innerHTML='<div class=pad><p class=sub>Could not load pipeline.</p></div>';return}
  window.__oprospects=rows;
  var fb=document.getElementById('ofunnel');
  if(fb)fb.innerHTML=['total'].concat(OSTAGES).map(function(k){return '<div class="card pad" style="flex:1;min-width:84px;text-align:center"><div style="font-size:22px;font-weight:750">'+(fun[k]||0)+'</div><div class=sub style="text-transform:capitalize">'+esc(k)+'</div></div>'}).join('');
  if(!rows.length){box.innerHTML='<div class=pad><div class=empty><div class=ico>'+ico.chat+'</div><h3>No prospects yet</h3><p>Find local businesses above, or paste a website to build a demo, then track each one through to signup.</p></div></div>';return}
  var foundCount=rows.filter(function(r){return r.stage==='found'}).length;
  var ctaHtml=foundCount>0?
    '<div class="pad" style="background:var(--accent-weak);border-bottom:2px solid var(--accent,#c79a4b)">'+
      '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
        '<div style="flex:1"><div style="font-weight:750;font-size:15px;color:var(--accent-ink)">'+foundCount+' businesses ready for a demo</div>'+
          '<p style="margin:3px 0 0;font-size:13px;color:var(--ink-soft)">Build a live personalised demo for each one — a few seconds per site.</p></div>'+
        '<button class="btn" id=obld-cta>Build '+foundCount+' demos &rarr;</button>'+
      '</div>'+
    '</div>':'';
  var verticals=['All'].concat(rows.map(function(r){return r.industry||''}).filter(function(v,i,a){return v!==''&&a.indexOf(v)===i}));
  var filterBar='<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line,#e4dccb)">'+
    '<label for=ofilter style="font-size:13px;color:var(--mut)">Vertical:</label>'+
    '<select id=ofilter style="border:1px solid var(--line,#e4dccb);border-radius:7px;padding:4px 8px;font-size:13px">'+
    verticals.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>'}).join('')+
    '</select></div>';
  box.innerHTML=ctaHtml+filterBar+'<div class=tbl-wrap><table><thead><tr><th>Business</th><th>Area</th><th>Demo</th><th>Email</th><th>Copy</th><th>Stage</th><th></th></tr></thead><tbody class=stagger>'+
    rows.map(function(d){
      var qa=d.qa||{};
      var demoCell=d.demoUrl&&d.chunks!=null?
        ('<a href="'+safeHref(d.demoUrl)+'" target=_blank rel=noopener>Open &#8599;</a> <span class=sub>('+(d.chunks||0)+(qa.demoOk?'':' &#9888; thin')+')</span>'):
        ('<button class="btn sm orow-build" data-slug="'+esc(d.slug)+'">Build &rarr;</button>');
      var emailInput='<input class=oemail type=email data-slug="'+esc(d.slug)+'" value="'+esc(d.email||'')+'" placeholder="no email — add one" style="min-width:140px;font-size:13px;padding:6px 9px;border:1px solid var(--line,#e4dccb);border-radius:7px;width:100%;max-width:200px">';
      var emailCell=emailInput+(d.email&&!qa.emailValid?'<br><span class=tiny style="color:var(--amber)">&#9888; may be invalid</span>':'');
      var copy=d.subject?('<button class="btn ghost sm copyo" data-s="'+esc(d.subject)+'" data-b="'+esc(d.body)+'">Email</button> <button class="btn ghost sm copyl" data-l="'+esc(d.linkedin)+'">LinkedIn</button>'):'<span class=sub>&mdash;</span>';
      var stagesel='<select class=ostage data-slug="'+esc(d.slug)+'">'+OSTAGES.map(function(s){return '<option value="'+s+'"'+(d.stage===s?' selected':'')+'>'+s+'</option>'}).join('')+'</select>';
      var delBtn='<button class="btn ghost sm odel-btn" data-slug="'+esc(d.slug)+'" title="Delete" style="color:var(--rose);padding:3px 7px">&#10005;</button>';
      return '<tr data-industry="'+esc(d.industry||'')+'">'+
        '<td style="font-weight:650">'+esc(d.business)+'<br><span class=sub>'+esc(d.industry||'')+'</span>'+
          (d.chatbot?'<br><span class=tiny style="color:var(--mut)">already has '+esc(d.chatbot)+' chat &mdash; skipped</span>':'')+
          (d.redirectHost?'<br><span class=tiny style="color:var(--amber)">&#9888; redirects to '+esc(d.redirectHost)+'</span>':'')+
          (d.notes?'<br><span style="color:#b4451f;font-size:12px;font-weight:600">'+esc(d.notes)+'</span>':'')+
        '</td>'+
        '<td>'+esc(d.area||'')+'</td>'+
        '<td>'+demoCell+'</td>'+
        '<td>'+emailCell+'</td>'+
        '<td>'+copy+'</td>'+
        '<td>'+stagesel+'</td>'+
        '<td>'+delBtn+'</td>'+
      '</tr>';
    }).join('')+'</tbody></table></div>';
  if(foundCount>0){var obldcta=document.getElementById('obld-cta');if(obldcta)obldcta.onclick=function(){var btn=document.getElementById('obtn-all');if(btn)btn.click()}}
  // Vertical filter — client-side show/hide.
  var ofilt=document.getElementById('ofilter');
  if(ofilt)ofilt.onchange=function(){
    var v=ofilt.value;
    box.querySelectorAll('tbody tr').forEach(function(tr){tr.style.display=(v==='All'||tr.dataset.industry===v)?'':'none';});
  };
  // Per-row Build button — surface errors instead of failing silently.
  box.querySelectorAll('.orow-build').forEach(function(btn){btn.onclick=async function(){
    btn.disabled=true;btn.textContent='Building…';
    var cell=btn.parentNode;
    try{await api('/api/outreach/build',{method:'POST',body:JSON.stringify({slugs:[btn.dataset.slug]})});await loadOutreachList();}
    catch(e){
      btn.disabled=false;btn.textContent='Build →';
      if(cell){var em=document.createElement('span');em.style.cssText='display:block;color:var(--rose);font-size:12px;margin-top:3px';em.textContent=e.message||'Build failed';cell.appendChild(em);setTimeout(function(){if(em.parentNode)em.parentNode.removeChild(em)},4000);}
    }
  }});
  // Per-row Delete button.
  box.querySelectorAll('.odel-btn').forEach(function(btn){btn.onclick=async function(){
    if(!window.confirm('Delete this prospect?'))return;
    btn.disabled=true;
    try{await api('/api/outreach/delete',{method:'POST',body:JSON.stringify({slug:btn.dataset.slug})});await loadOutreachList();}
    catch(e){btn.disabled=false;var dc=btn.parentNode;if(dc){var de=document.createElement('span');de.style.cssText='display:block;color:var(--rose);font-size:12px;margin-top:3px';de.textContent='Could not delete: '+(e.message||'error');dc.appendChild(de);setTimeout(function(){if(de.parentNode)de.parentNode.removeChild(de)},3000);}}
  }});
  box.querySelectorAll('.oemail').forEach(function(inp){inp.addEventListener('change',async function(){
    var slug=inp.dataset.slug,email=inp.value.trim();
    try{
      await api('/api/outreach/stage',{method:'POST',body:JSON.stringify({slug:slug,email:email})});
      var ok=document.createElement('span');ok.className='tiny';ok.style.color='var(--gold)';ok.textContent=' ✓ saved';
      if(inp.nextSibling)inp.parentNode.insertBefore(ok,inp.nextSibling);else inp.parentNode.appendChild(ok);
      setTimeout(function(){if(ok.parentNode)ok.parentNode.removeChild(ok)},1500);
    }catch(e){
      var ek=document.createElement('span');ek.className='tiny';ek.style.color='var(--rose)';ek.textContent=' ✗ '+(e.message||'save failed');
      if(inp.nextSibling)inp.parentNode.insertBefore(ek,inp.nextSibling);else inp.parentNode.appendChild(ek);
      setTimeout(function(){if(ek.parentNode)ek.parentNode.removeChild(ek)},3000);
    }
  })});
  box.querySelectorAll('.copyo').forEach(function(btn){btn.onclick=function(){
    var txt='Subject: '+btn.dataset.s+'\\n\\n'+btn.dataset.b;
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){btn.textContent='Copied ✓';setTimeout(function(){btn.textContent='Email'},1600)}).catch(function(){btn.textContent='Copy failed'});
  }});
  box.querySelectorAll('.copyl').forEach(function(btn){btn.onclick=function(){
    (navigator.clipboard?navigator.clipboard.writeText(btn.dataset.l):Promise.reject()).then(function(){btn.textContent='Copied ✓';setTimeout(function(){btn.textContent='LinkedIn'},1600)}).catch(function(){btn.textContent='Copy failed'});
  }});
  box.querySelectorAll('.ostage').forEach(function(sel){sel.onchange=async function(){
    try{await api('/api/outreach/stage',{method:'POST',body:JSON.stringify({slug:sel.dataset.slug,stage:sel.value})});await loadOutreachList();}catch(e){}
  }});
}

/* ----- Conversations ----- */
function renderConvos(main,rows){
  let body;
  if(!rows.length){
    body='<div class=empty><div class=ico>'+ico.chat+'</div><h3>No conversations yet</h3>'+
      '<p>Once visitors start chatting with your assistant on your website, you\\'ll see each conversation listed here.</p></div>';
  }else{
    body='<div class=tbl-wrap><table><thead><tr><th>When</th><th>Visitor</th><th>Page they were on</th><th></th></tr></thead><tbody class=stagger>'+
      rows.map((r,i)=>'<tr class=clickable data-cv="'+i+'" tabindex=0 role=button aria-label="Open transcript">'+
        '<td class=tiny>'+esc(fmt(r.created_at))+'</td>'+
        '<td class=tiny>Visitor '+esc((r.session_id||'—').slice(0,6))+'</td>'+
        '<td>'+(safeHref(r.page_url)?'<a href="'+safeHref(r.page_url)+'" target=_blank rel=noopener>'+esc(r.page_url)+'</a>':esc(r.page_url||'—'))+'</td>'+
        '<td class=tiny style="text-align:right;color:var(--accent-ink);font-weight:650">View transcript →</td>'+
        '</tr>').join('')+'</tbody></table></div>';
  }
  main.innerHTML=pageHead('Conversations','Every chat your assistant has handled. Open one to read the full transcript.')+
    '<div class="card view-in">'+(rows.length?body:'<div class=pad>'+body+'</div>')+'</div>'+mobileFoot();
  if(rows.length){
    const open=r=>{if(r&&r.id)openTranscript(r.id);};
    main.querySelectorAll('tr.clickable').forEach(tr=>{
      const r=rows[Number(tr.dataset.cv)];
      tr.onclick=()=>open(r);
      tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(r)}});
    });
  }
  wireMobileFoot();
}

/* transcript drill-down (modal) */
async function openTranscript(id){
  const ov=document.createElement('div');ov.className='ov';
  ov.innerHTML='<div class=sheet role=dialog aria-modal=true aria-label="Conversation transcript">'+
    '<div class=sh-head><div class=h-sec>Conversation transcript</div>'+
      '<button class=sh-x id=trx aria-label="Close transcript">×</button></div>'+
    '<div class=sh-body id=trbody>'+
      '<div class=skel><div class="skel-row" style="width:62%"></div></div>'+
      '<div class=skel><div class="skel-row" style="width:80%"></div></div>'+
      '<div class=skel><div class="skel-row" style="width:48%"></div></div></div>'+
  '</div>';
  document.body.appendChild(ov);
  const close=()=>{ov.remove();document.removeEventListener('keydown',onKey)};
  const onKey=e=>{if(e.key==='Escape')close()};
  document.addEventListener('keydown',onKey);
  ov.addEventListener('mousedown',e=>{if(e.target===ov)close()});
  ov.querySelector('#trx').onclick=close;
  ov.querySelector('#trx').focus();
  const bodyEl=ov.querySelector('#trbody');
  try{
    const msgs=await api('/api/t/'+encodeURIComponent(active)+'/convos/'+encodeURIComponent(id)+'/messages');
    if(!msgs||!msgs.length){
      bodyEl.innerHTML='<div class=empty style="padding:24px 10px"><h3>No messages</h3><p>This conversation has no recorded turns.</p></div>';
      return;
    }
    bodyEl.innerHTML='<div class=stagger>'+msgs.map(m=>{
      const asst=m.role==='assistant';
      return '<div class="turn '+(asst?'asst':'user')+'">'+
        '<span class=who>'+(asst?'Assistant':'Visitor')+'</span>'+
        '<div class=bub>'+esc(m.content||'')+'</div>'+
        (m.created_at?'<span class=ts>'+esc(fmt(m.created_at))+'</span>':'')+
      '</div>';
    }).join('')+'</div>';
  }catch(e){
    bodyEl.innerHTML='<div class=empty style="padding:24px 10px"><div class=ico>'+ico.info+'</div><h3>Couldn\\'t load it</h3><p>'+esc(e.message)+'</p></div>';
  }
}

/* ----- Bookings ----- */
function renderBookings(main,rows){
  let body;
  if(!rows.length){
    body='<div class=empty><div class=ico>'+ico.book+'</div><h3>No bookings yet</h3>'+
      '<p>No bookings yet — they\\'ll show here as visitors book calls.</p></div>';
  }else{
    body='<div class=tbl-wrap><table><thead><tr><th>Name</th><th>Email</th><th>When</th><th>Source</th></tr></thead><tbody class=stagger>'+
      rows.map(r=>'<tr>'+
        '<td><div style="font-weight:650">'+esc(r.name||'Someone')+'</div>'+
          '<div class=tiny>'+esc(fmt(r.created_at))+'</div></td>'+
        '<td class=tiny>'+esc(r.email||'No email left')+'</td>'+
        '<td class=tiny>'+esc(fmt(r.start_at))+'</td>'+
        '<td>'+esc(r.backend||'—')+'</td>'+
        '</tr>').join('')+'</tbody></table></div>';
  }
  main.innerHTML=pageHead('Bookings','Calls visitors booked straight from the chat.')+
    '<div class="card view-in">'+(rows.length?body:'<div class=pad>'+body+'</div>')+'</div>'+mobileFoot();
  wireMobileFoot();
}

/* ----- Content gaps ----- */
function renderGaps(main,rows){
  const open=rows.filter(r=>!r.resolved);
  let body;
  if(!open.length){
    body='<div class=empty><div class=ico>'+ico.tick.replace('class=tick','width=22 height=22')+'</div><h3>Nothing to fix</h3>'+
      '<p>Your assistant is answering everything visitors ask. Check back after more chats come in.</p></div>';
  }else{
    body='<div class=tbl-wrap><table><thead><tr><th>When</th><th>Question your assistant couldn\\'t answer</th><th></th></tr></thead><tbody class=stagger>'+
      open.map((r,i)=>'<tr data-gap="'+i+'"><td class=tiny>'+esc(fmt(r.created_at))+'</td><td>'+esc(r.question)+'</td>'+
        '<td style="text-align:right;white-space:nowrap"><button class="btn ghost sm gres" data-gap="'+i+'">Mark resolved</button></td></tr>').join('')+
      '</tbody></table></div>';
  }
  main.innerHTML=pageHead('Content gaps','Questions worth adding to your site or settings.')+
    (open.length?'<div class="banner tip">'+ico.info+'<div>Cover these by adding a page on the <b>Install</b> tab, or by adding a key fact in <b>Settings</b>. Your assistant learns instantly.</div></div>':'')+
    '<div class="card view-in">'+(open.length?body:'<div class=pad>'+body+'</div>')+'</div>'+mobileFoot();
  main.querySelectorAll('button.gres').forEach(btn=>{
    const r=open[Number(btn.dataset.gap)];
    btn.onclick=async()=>{
      btn.disabled=true;btn.textContent='Resolving…';
      try{
        await api('/api/t/'+encodeURIComponent(active)+'/gaps/resolve',{method:'POST',body:JSON.stringify({question:r.question})});
        const tr=btn.closest('tr');
        if(tr){tr.style.transition='opacity .25s ease';tr.style.opacity='0';setTimeout(()=>{
          const tb=tr.parentNode;tr.remove();
          if(tb&&!tb.querySelector('tr'))loadTab('gaps');
        },250);}
        gapCount=Math.max(0,gapCount-1);
        app.querySelectorAll('.nav[data-tab=gaps] .badge').forEach(s=>{if(gapCount>0)s.textContent=gapCount;else s.remove()});
      }catch(e){btn.disabled=false;btn.textContent='Mark resolved';var bc=btn.parentNode;if(bc){var be=document.createElement('span');be.style.cssText='display:block;color:var(--rose);font-size:12px;margin-top:3px';be.textContent=e.message||'Error — please try again';bc.appendChild(be);setTimeout(function(){if(be.parentNode)be.parentNode.removeChild(be)},3000)}}
    };
  });
  wireMobileFoot();
}

/* ----- Feedback ----- */
async function renderFeedback(main){
  const d=await api('/api/t/'+encodeURIComponent(active)+'/feedback');
  const up=Number(d.up||0),dn=Number(d.down||0),tot=up+dn;
  const csat=d.csat!=null?Math.round(Number(d.csat))+'%':'—';
  const items=d.items||[];
  var frows=items.map(function(r){
    var ans=String(r.answer||'');
    return '<tr>'+
      '<td style="text-align:center;font-size:17px">'+(r.rating===1?'👍':'👎')+'</td>'+
      '<td>'+esc(r.question||'—')+'</td>'+
      '<td style="max-width:260px;color:var(--ink-soft);font-size:13px">'+esc(ans.slice(0,120)+(ans.length>120?'…':''))+'</td>'+
      '<td class=tiny>'+esc(fmt(r.created_at))+'</td>'+
    '</tr>';
  }).join('');
  main.innerHTML=pageHead('Feedback','How helpful visitors found your assistant\\'s answers.')+
    '<div class="stats stagger" style="margin-bottom:20px">'+
      '<div class=stat><div class=n style="color:var(--gold)">'+num(up)+'</div><div class=l>'+ico.feedback+' Helpful</div></div>'+
      '<div class=stat><div class=n style="color:var(--rose)">'+num(dn)+'</div><div class=l>Not helpful</div></div>'+
      '<div class="stat good"><div class=n>'+csat+'</div><div class=l>'+ico.star+' CSAT</div>'+
        (tot>0?'<div class=tiny style="margin-top:4px">from '+num(tot)+' rated</div>':'<div class=tiny style="margin-top:4px">No ratings yet</div>')+
      '</div>'+
    '</div>'+
    (frows?
      '<div class="card view-in"><div class=tbl-wrap><table><thead><tr><th>Rating</th><th>Question</th><th>Answer</th><th>When</th></tr></thead>'+
        '<tbody class=stagger>'+frows+'</tbody></table></div></div>':
      '<div class="card view-in"><div class=pad><div class=empty>'+
        '<div class=ico>'+ico.feedback+'</div>'+
        '<h3>No rated messages yet</h3>'+
        '<p>When visitors give a thumbs up or down, their questions and your assistant\\'s replies appear here.</p>'+
      '</div></div></div>')+
    mobileFoot();
  wireMobileFoot();
}

/* ----- Preview (live bot inside dashboard) ----- */
function renderPreview(main){
  const src=BASE+'/demo/'+encodeURIComponent(active);
  main.innerHTML=pageHead('Preview','Test your assistant exactly as your visitors see it.')+
    '<div class="banner tip">'+ico.info+'<div>This is your real, live assistant. Ask it anything a customer might — pricing, hours, "do you take walk-ins?" — and see how it answers.</div></div>'+
    '<div class="preview view-in"><div class=bar><span class=dots><i></i><i></i><i></i></span><span class=u>Your website · live assistant</span></div>'+
      '<iframe src="'+esc(src)+'" title="Live preview of your assistant" loading=lazy></iframe></div>'+
    mobileFoot();
  wireMobileFoot();
}

/* ----- Billing ----- */
const PLANS=[
  {key:'starter',name:'Starter',price:19,feats:['250 conversations a month','Lead alerts by email & SMS','CSV export']},
  {key:'pro',name:'Pro',price:39,feats:['1,000 conversations a month','In-chat booking','Remove "Powered by Sona"','Full theming']},
  {key:'business',name:'Business',price:79,feats:['3,000 conversations a month','Everything in Pro','Priority support']}
];
let billingCycle='monthly';
function meter(label,used,limit){
  const u=Number(used||0),l=Number(limit||0);
  const pct=l>0?Math.min(100,Math.round(u/l*100)):0;
  const over=l>0&&u>=l;
  return '<div class=meter>'+
    '<div class=mlab><b>'+esc(label)+'</b><span class=mv>'+num(u)+(l>0?' / '+num(l):'')+'</span></div>'+
    '<div class=track><i class="fill'+(over?' over':'')+'" data-fill="'+pct+'"></i></div>'+
  '</div>';
}
async function renderBilling(main){
  main.innerHTML=pageHead('Billing','Your plan, usage, and upgrades.')+
    '<div class="card pad"><div class=skel><div class="skel-row" style="width:40%"></div></div>'+
    '<div class=skel><div class="skel-row" style="width:70%"></div></div>'+
    '<div class=skel><div class="skel-row" style="width:55%"></div></div></div>'+mobileFoot();
  wireMobileFoot();
  let b;
  try{b=await api('/api/t/'+encodeURIComponent(active)+'/billing/status');}catch(e){
    main.innerHTML=pageHead('Billing','Your plan, usage, and upgrades.')+
      '<div class="card pad"><div class=empty><div class=ico>'+ico.info+'</div><h3>We hit a snag</h3><p>'+esc(e.message)+'</p></div></div>'+mobileFoot();
    wireMobileFoot();return;
  }
  const lim=b.limits||{},use=b.usage||{};
  const planName=esc(((b.plan||'Free')+'').replace(/^./,function(c){return c.toUpperCase()}));
  const enabled=b.billingEnabled!==false;
  // success/cancel banner from query param
  let banner='';
  const qp=new URLSearchParams(location.search).get('billing');
  if(qp==='success')banner='<div class="toast ok">'+ico.tick+'<div><b>You\\'re upgraded.</b> Your new plan is active — thanks!</div></div>';
  else if(qp==='cancel')banner='<div class="toast warn">'+ico.info+'<div>Checkout cancelled. No charge was made — upgrade whenever you\\'re ready.</div></div>';

  // plan cards reflect the chosen billing cycle (monthly shows /mo; annual
  // shows the equivalent monthly cost when billed yearly).
  const planCardsHtml=()=>{
    const annual=billingCycle==='annual';
    return PLANS.map(p=>{
      const cur=String(b.plan||'').toLowerCase()===p.key;
      const perMo=annual?Math.round(p.price*10/12):p.price; // 2 months free → 10× yearly
      return '<div class="card pad plan lift'+(cur?' current':'')+'">'+
        (cur?'<span class=tag style="margin-bottom:6px">Your plan</span>':'')+
        '<div class=pname>'+esc(p.name)+'</div>'+
        '<div class=price>'+money(perMo)+'<span>/mo</span></div>'+
        (annual?'<div class=tiny style="margin-top:-2px">Save 20%</div>':'')+
        '<ul>'+p.feats.map(f=>'<li>'+ico.tick.replace('class=tick','width=15 height=15')+'<span>'+esc(f)+'</span></li>').join('')+'</ul>'+
        '<div class=top><button class="btn block upg" data-plan="'+esc(p.key)+'"'+((cur||!enabled)?' disabled':'')+'>'+(cur?'Your plan':'Choose '+esc(p.name))+'</button></div>'+
      '</div>';
    }).join('');
  };
  const cycleHtml=()=>'<div class=cycle>'+
    '<div class=seg role=group aria-label="Billing cycle">'+
      '<button id=cyMo class="'+(billingCycle==='monthly'?'on':'')+'" aria-pressed="'+(billingCycle==='monthly')+'">Monthly</button>'+
      '<button id=cyAn class="'+(billingCycle==='annual'?'on':'')+'" aria-pressed="'+(billingCycle==='annual')+'">Annual</button>'+
    '</div>'+
    '<span class=save-note>'+ico.bolt+'Pay yearly, save 20%</span>'+
  '</div>';

  main.innerHTML=pageHead('Billing','Your plan, what you\\'ve used, and how to upgrade.',
      (b.hasSubscription&&enabled?'<button class="btn ghost sm" id=portal>Manage billing</button>':''))+
    banner+
    (!enabled?'<div class="banner tip">'+ico.info+'<div>Billing isn\\'t switched on yet. You can see the plans below — upgrades will open up once it\\'s set up.</div></div>':'')+
    '<div class="card pad view-in">'+
      '<div class=row style="justify-content:space-between;flex-wrap:wrap;gap:10px">'+
        '<div class=h-sec>Current plan</div><span class=tag>'+planName+'</span></div>'+
      '<div style="height:16px"></div>'+
      '<div class=stack>'+
        meter('Conversations this month',use.conversations,lim.conversations)+
        meter('Pages learned',use.sources,lim.sources)+
      '</div>'+
    '</div>'+
    cycleHtml()+
    '<div class="plans stagger" id=planGrid>'+planCardsHtml()+'</div>'+
    '<p id=upgmsg class=msg style="text-align:center"></p>'+
    mobileFoot();

  // animate meter fills from 0 → value on load
  requestAnimationFrame(()=>main.querySelectorAll('.meter .fill').forEach(f=>{f.style.width=(f.dataset.fill||0)+'%'}));

  const portal=document.getElementById('portal');
  if(portal)portal.onclick=async()=>{
    portal.disabled=true;portal.textContent='Opening…';
    const um=document.getElementById('upgmsg');
    try{const r=await api('/api/t/'+encodeURIComponent(active)+'/billing/portal',{method:'POST'});if(r&&r.url)window.location=r.url;else throw new Error('We couldn\\'t open billing. Please try again.');}
    catch(e){portal.disabled=false;portal.textContent='Manage billing';if(um){um.className='msg err';um.textContent=e.message}}
  };

  const wireUpg=()=>{
    main.querySelectorAll('button.upg').forEach(btn=>{
      if(btn.disabled)return;
      btn.onclick=async()=>{
        const base=btn.dataset.plan;
        const plan=billingCycle==='annual'?base+'_annual':base;
        const um=document.getElementById('upgmsg');if(um){um.className='msg';um.textContent=''}
        btn.disabled=true;btn.textContent='Starting checkout…';
        try{const r=await api('/api/t/'+encodeURIComponent(active)+'/billing/checkout',{method:'POST',body:JSON.stringify({plan})});if(r&&r.url)window.location=r.url;else throw new Error('We couldn\\'t start checkout. Please try again.');}
        catch(e){btn.disabled=false;btn.textContent='Choose '+(PLANS.find(p=>p.key===base)||{}).name;if(um){um.className='msg err';um.textContent=e.message}}
      };
    });
  };
  wireUpg();

  const setCycle=c=>{
    billingCycle=c;
    document.getElementById('cyMo').classList.toggle('on',c==='monthly');
    document.getElementById('cyMo').setAttribute('aria-pressed',c==='monthly');
    document.getElementById('cyAn').classList.toggle('on',c==='annual');
    document.getElementById('cyAn').setAttribute('aria-pressed',c==='annual');
    const grid=document.getElementById('planGrid');grid.innerHTML=planCardsHtml();
    const um=document.getElementById('upgmsg');if(um){um.className='msg';um.textContent=''}
    wireUpg();
  };
  document.getElementById('cyMo').onclick=()=>setCycle('monthly');
  document.getElementById('cyAn').onclick=()=>setCycle('annual');
  wireMobileFoot();
}

/* ----- Install (sources + embed + ingest) ----- */
function renderSources(main){
  const embed='<script src="'+BASE+'/widget.js?tenant='+active+'"><\\/script>';
  const embedHtml='&lt;script src="<span class=tok>'+esc(BASE+'/widget.js?tenant='+active)+'</span>"&gt;&lt;/script&gt;';
  main.innerHTML=pageHead('Install & teach','Add your assistant to your site, and feed it more pages to learn.')+
    '<div class="grid2 stagger view-in">'+
      '<div class="card pad">'+
        '<div class=h-sec>Add to your website</div>'+
        '<p class=sub style="margin:4px 0 12px">Paste this single line just before the closing <code>&lt;/body&gt;</code> tag on your site. That\\'s it — your assistant appears.</p>'+
        '<div class=embed>'+embedHtml+'</div>'+
        '<div style="height:10px"></div>'+
        '<button class="btn block" id=cp>Copy the code</button>'+
        '<p id=cpmsg class="msg info"></p>'+
      '</div>'+
      '<div class="card pad">'+
        '<div class=h-sec>Teach it more pages</div>'+
        '<p class=sub style="margin:4px 0 12px">Add one page at a time, or let Sona read your whole site in one go. Either way it learns the details so it can answer for you.</p>'+
        '<label class=field for=u>Page address</label>'+
        '<input id=u type=url inputmode=url placeholder="yourbusiness.com/pricing">'+
        '<div style="height:10px"></div>'+
        '<button class="btn block" id=ing>Read this page</button>'+
        '<p id=imsg class=msg></p>'+
        '<div class=divider style="margin:18px 0"></div>'+
        '<div class=h-sec style="font-size:13.5px">Or read the whole site</div>'+
        '<p class=sub style="margin:4px 0 12px">Sona follows the links from this address and reads up to 30 pages. Good for a first pass — it takes a little longer.</p>'+
        '<label class=field for=cu>Website address</label>'+
        '<input id=cu type=url inputmode=url placeholder="yourbusiness.com">'+
        '<div style="height:10px"></div>'+
        '<button class="btn ghost block" id=crawl>Read my whole site</button>'+
        '<p id=cmsg class=msg></p>'+
      '</div>'+
    '</div>'+mobileFoot();
  document.getElementById('cp').onclick=()=>{
    navigator.clipboard.writeText(embed).then(()=>{const m=document.getElementById('cpmsg');m.className='msg ok';m.textContent='Copied to your clipboard.';setTimeout(()=>{m.textContent=''},2000)}).catch(()=>{const m=document.getElementById('cpmsg');m.className='msg err';m.textContent='Copy failed — select the code above and copy manually.';setTimeout(()=>{m.textContent=''},3000)});
  };
  document.getElementById('ing').onclick=async()=>{
    const u=normUrl(document.getElementById('u').value),m=document.getElementById('imsg');
    if(!u||u.indexOf('.')<0){m.className='msg err';m.textContent='Please enter a page address, like yourbusiness.com/pricing';return}
    m.className='msg info';m.textContent='Reading the page… this can take a moment.';
    const btn=document.getElementById('ing');btn.disabled=true;
    try{const r=await api('/api/t/'+encodeURIComponent(active)+'/ingest',{method:'POST',body:JSON.stringify({url:u})});
      m.className='msg ok';m.textContent='Done — your assistant learned '+num(r.chunks)+' new section(s).';
      document.getElementById('u').value='';
    }catch(e){m.className='msg err';m.textContent=e.message}
    btn.disabled=false;
  };
  document.getElementById('crawl').onclick=async()=>{
    const u=normUrl(document.getElementById('cu').value),m=document.getElementById('cmsg');
    if(!u||u.indexOf('.')<0){m.className='msg err';m.textContent='Please enter your website address, like yourbusiness.com';return}
    const btn=document.getElementById('crawl');btn.disabled=true;btn.textContent='Reading your site…';
    m.className='msg info';m.innerHTML='<span class=spin style="display:inline-block;vertical-align:-2px;margin-right:7px"></span>Reading your site, page by page. This can take 10–30 seconds — you can keep working.';
    try{
      const r=await api('/api/t/'+encodeURIComponent(active)+'/crawl',{method:'POST',body:JSON.stringify({url:u,maxPages:15})});
      m.className='msg ok';m.textContent='Added '+num(r.chunks)+' passage(s) from your site. Your assistant just got smarter.';
      document.getElementById('cu').value='';
    }catch(e){
      if(e.status===402||e.upgrade){
        m.className='msg err';
        m.innerHTML='Reading your whole site is on a higher plan. <button class="link-btn" id=crawlUp>See plans →</button>';
        const up=document.getElementById('crawlUp');if(up)up.onclick=()=>loadTab('billing');
      }else{m.className='msg err';m.textContent=e.message}
    }
    btn.disabled=false;btn.textContent='Read my whole site';
  };
  wireMobileFoot();
}

/* ----- Settings ----- */
async function renderSettings(main){
  try{
  const s=await api('/api/t/'+encodeURIComponent(active)+'/settings');
  const v=k=>s[k]==null?'':s[k];
  const cal=(s.booking_config&&s.booking_config.calLink)||'';
  const ics=(s.booking_config&&s.booking_config.ics)||'';
  const factsText=s.facts&&typeof s.facts==='object'?Object.keys(s.facts).map(k=>k+': '+s.facts[k]).join('\\n'):'';
  main.innerHTML=pageHead('Settings','Everything that shapes how your assistant looks, talks, and keeps you informed.')+
  '<form id=setform class=view-in autocomplete=off>'+

    '<div class="card pad stack">'+
      '<div class=eyebrow style="margin-bottom:4px">Your business</div>'+
      '<div class=h-sec style="margin-bottom:2px">Key facts</div>'+
      '<p class=sub style="margin-bottom:10px">These are things your assistant treats as gospel — hours, prices, parking, phone number. One per line, as <b>Label: value</b>.</p>'+
      '<textarea id=set_facts rows=6 placeholder="Hours: Mon&ndash;Fri 9&ndash;5&#10;Parking: free out back&#10;Phone: 555-0100">'+esc(factsText)+'</textarea>'+
      '<p class=hint>Your assistant learns these instantly when you save. No rebuild needed.</p>'+
    '</div>'+

    '<div class="card pad stack" style="margin-top:14px">'+
      '<div class=eyebrow style="margin-bottom:4px">Booking &amp; calendar</div>'+
      '<div class=h-sec style="margin-bottom:2px">Let visitors book a call from the chat</div>'+
      '<p class=sub style="margin-bottom:10px">Turn on the booking button and paste your scheduling link below.</p>'+
      '<label class=check><input type=checkbox id=set_be '+(s.booking_enabled?'checked':'')+'>'+
        '<span class=ct><b>Show a &ldquo;Book now&rdquo; button in the chat</b><br><span class=tiny>Visitors tap it to pick a time straight from the conversation.</span></span></label>'+
      '<div><label class=field for=set_cal>Your scheduling link</label>'+
        '<input id=set_cal type=url placeholder="https://cal.com/your-handle" value="'+esc(cal)+'">'+
        '<p class=hint>Cal.com, Calendly, Acuity, or any booking page — paste the direct URL.</p></div>'+
      '<div><label class=field for=set_ics>Calendar availability feed <span class=tiny style="font-weight:400">(optional)</span></label>'+
        '<input id=set_ics type=url placeholder="https://calendar.google.com/.../basic.ics" value="'+esc(ics)+'">'+
        '<p class=hint>A public iCal link (Google &ldquo;secret address in iCal format&rdquo;, Cal.com, Outlook). Your assistant reads it to answer &ldquo;are you free Tuesday?&rdquo; — it only sees booked slots, never event details.</p></div>'+
    '</div>'+

    '<div class="card pad stack" style="margin-top:14px">'+
      '<div class=eyebrow style="margin-bottom:4px">Notifications</div>'+
      '<div class=h-sec style="margin-bottom:2px">How you want to hear about new leads</div>'+
      '<p class=sub style="margin-bottom:10px">We\\'ll reach out the moment your assistant captures someone. Leave any channel blank to skip it.</p>'+
      '<div><label class=field for=set_ne>Send me an email at</label>'+
        '<input id=set_ne type=email placeholder="you@yourbusiness.com" value="'+esc(v('lead_notify_email'))+'"></div>'+
      '<div><label class=field for=set_ns>Text me at</label>'+
        '<input id=set_ns placeholder="+1 555 123 4567" value="'+esc(v('lead_notify_sms'))+'"></div>'+
      '<div><label class=field for=set_nw>Push to my CRM or automation tool</label>'+
        '<input id=set_nw type=url placeholder="https://hooks.zapier.com/&hellip;" value="'+esc(v('lead_notify_webhook'))+'">'+
        '<p class=hint>Paste an https webhook address to pipe leads straight into Zapier, Make, HubSpot, or any tool that accepts them.</p></div>'+
    '</div>'+

    '<div class="card pad stack" style="margin-top:14px">'+
      '<div class=eyebrow style="margin-bottom:4px">Look &amp; feel</div>'+
      '<div class=h-sec style="margin-bottom:2px">How your assistant presents itself</div>'+
      '<p class=sub style="margin-bottom:10px">Match the chat to your brand so it feels at home on your site.</p>'+
      '<div class=grid2>'+
        '<div><label class=field for=set_persona>Tone of voice</label>'+
          '<select id=set_persona>'+
            '<option value="friendly"'+(s.persona==='formal'?'':' selected')+'>Friendly &amp; warm</option>'+
            '<option value="formal"'+(s.persona==='formal'?' selected':'')+'>Professional &amp; formal</option>'+
          '</select>'+
          '<p class=hint>How your assistant greets and speaks to visitors.</p></div>'+
        '<div><label class=field for=set_bc>Brand colour</label>'+
          '<input id=set_bc placeholder="#4f46e5" value="'+esc(v('brand_color'))+'">'+
          '<p class=hint>The accent colour of your chat bubble. Hex code, e.g. #c79a4b.</p></div>'+
      '</div>'+
    '</div>'+

    '<div class="card pad stack" style="margin-top:14px">'+
      '<div class=eyebrow style="margin-bottom:4px">How it answers</div>'+
      '<div class=h-sec style="margin-bottom:2px">Fine-tune your assistant\\'s behaviour</div>'+
      '<p class=sub style="margin-bottom:10px">Advanced controls — most businesses won\\'t need to touch these.</p>'+
      '<div><label class=field for=set_sx>Extra instructions</label>'+
        '<textarea id=set_sx rows=3 placeholder="e.g. Always mention our 10% first-visit discount.">'+esc(v('system_extra'))+'</textarea>'+
        '<p class=hint>Anything here is added to every response your assistant gives. Be specific and brief.</p></div>'+
      '<label class=check style="margin-top:4px"><input type=checkbox id=set_reg '+(s.regulated?'checked':'')+'>'+
        '<span class=ct><b>This is a regulated business</b><br>'+
        '<span class=tiny>Health, legal, or financial services? Turns on extra-careful, liability-aware responses.</span></span></label>'+
    '</div>'+

    '<div class="card pad stack" style="margin-top:14px">'+
      '<div class=eyebrow style="margin-bottom:4px">Plan &amp; value</div>'+
      '<div class=h-sec style="margin-bottom:2px">What a customer is worth to you</div>'+
      '<p class=sub style="margin-bottom:10px">Helps us show you the real-world value your assistant is creating on the Overview page.</p>'+
      '<div><label class=field for=set_lv>Average value of a new customer (£)</label>'+
        '<input id=set_lv type=number min=0 value="'+esc(v('lead_value'))+'" placeholder="250">'+
        '<p class=hint>A rough average is fine — your assistant uses it to estimate your pipeline.</p></div>'+
    '</div>'+

    '<div class="card pad stack" style="margin-top:14px">'+
      '<div class=eyebrow style="margin-bottom:4px">Your data (GDPR)</div>'+
      '<div class=h-sec style="margin-bottom:2px">Data subject requests</div>'+
      '<p class=sub style="margin-bottom:10px">Enter a visitor\\'s email address to export or permanently delete everything your assistant has stored about them.</p>'+
      '<div><label class=field for=gdpr_em>Visitor email address</label>'+
        '<input id=gdpr_em type=email placeholder="visitor@example.com">'+
        '<p class=hint>Export downloads a JSON file of all stored data. Delete wipes it permanently — use with care.</p></div>'+
      '<div class=row style="gap:8px;margin-top:10px">'+
        '<button type=button class="btn ghost" id=gdpr_exp>⬇ Export data</button>'+
        '<button type=button class="btn ghost" id=gdpr_del style="color:var(--rose)">Delete data</button>'+
      '</div>'+
      '<span id=gdpr_msg class=msg style="margin-top:4px"></span>'+
    '</div>'+

    '<div class=row style="margin-top:18px;position:sticky;bottom:0;background:linear-gradient(to top,var(--paper) 60%,transparent);padding:10px 0">'+
      '<button type=submit class=btn id=set_save>Save changes</button>'+
      '<span id=set_msg class=msg style="margin-top:0"></span>'+
    '</div>'+
  '</form>'+mobileFoot();

  document.getElementById('setform').addEventListener('submit',async ev=>{
    ev.preventDefault();
    const facts={};document.getElementById('set_facts').value.split('\\n').map(x=>x.trim()).filter(Boolean).forEach(L=>{const i=L.indexOf(':');if(i>0)facts[L.slice(0,i).trim()]=L.slice(i+1).trim()});
    const patch={
      lead_value:Number(document.getElementById('set_lv').value||0),
      brand_color:document.getElementById('set_bc').value.trim(),
      booking_enabled:document.getElementById('set_be').checked,
      booking_config:{calLink:document.getElementById('set_cal').value.trim(),ics:document.getElementById('set_ics').value.trim()},
      lead_notify_email:document.getElementById('set_ne').value.trim(),
      lead_notify_sms:document.getElementById('set_ns').value.trim(),
      lead_notify_webhook:document.getElementById('set_nw').value.trim(),
      regulated:document.getElementById('set_reg').checked,
      persona:document.getElementById('set_persona').value,
      system_extra:document.getElementById('set_sx').value,
      facts:facts
    };
    const m=document.getElementById('set_msg'),btn=document.getElementById('set_save');
    m.className='msg info';m.textContent='Saving…';btn.disabled=true;
    try{await api('/api/t/'+encodeURIComponent(active)+'/settings',{method:'PATCH',body:JSON.stringify(patch)});m.className='msg ok';m.textContent='Saved ✓';setTimeout(()=>{m.textContent=''},2200)}
    catch(e){m.className='msg err';m.textContent=e.message}
    btn.disabled=false;
  });
  document.getElementById('gdpr_exp').onclick=async function(){
    var ge=document.getElementById('gdpr_em').value.trim();
    var gm=document.getElementById('gdpr_msg');
    if(!ge){gm.className='msg err';gm.textContent='Please enter a visitor email address.';return;}
    gm.className='msg info';gm.textContent='Exporting…';
    try{
      var gdata=await api('/api/t/'+encodeURIComponent(active)+'/gdpr/export',{method:'POST',body:JSON.stringify({email:ge})});
      var gblob=new Blob([JSON.stringify(gdata,null,2)],{type:'application/json'});
      var ga=document.createElement('a');ga.href=URL.createObjectURL(gblob);
      ga.download='sona-data-'+active+'.json';document.body.appendChild(ga);ga.click();
      setTimeout(function(){URL.revokeObjectURL(ga.href);ga.remove()},1000);
      gm.className='msg ok';gm.textContent='Data downloaded ✓';setTimeout(function(){gm.textContent=''},3000);
    }catch(e){gm.className='msg err';gm.textContent=e.message}
  };
  document.getElementById('gdpr_del').onclick=async function(){
    var ge=document.getElementById('gdpr_em').value.trim();
    var gm=document.getElementById('gdpr_msg');
    if(!ge){gm.className='msg err';gm.textContent='Please enter a visitor email address.';return;}
    if(!confirm('This permanently deletes all data stored about '+ge+'. This action cannot be undone.'))return;
    gm.className='msg info';gm.textContent='Deleting…';
    try{
      await api('/api/t/'+encodeURIComponent(active)+'/gdpr/delete',{method:'POST',body:JSON.stringify({email:ge})});
      gm.className='msg ok';gm.textContent='Data deleted ✓';setTimeout(function(){gm.textContent=''},3000);
    }catch(e){gm.className='msg err';gm.textContent=e.message}
  };
  wireMobileFoot();
  }catch(e){main.innerHTML='<div class="card pad" style="margin-top:14px"><p class="msg err" style="margin:0">Settings failed to load — please refresh.</p></div>'}
}

boot();
</script></body></html>`;
}

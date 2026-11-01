/* Scroll-scrubbed video engine for the home page intro.
   Adapted from oso95/scroll-world (MIT, https://github.com/oso95/scroll-world).
   Scrolling maps to video.currentTime, so the visitor scrubs the film forward and back.

   Changes from upstream for this site:
   - positions are measured from the top of the container, so it can sit at the top of the home
     page; the picture is held in place with position: sticky (not fixed layers + clip-path,
     which WebKit/Safari handles badly), so it scrolls away by itself when the film ends;
   - only the scenes near the current one keep a live <video> (iOS can decode only a few at once);
   - no top bar / section nav (the site already has a navbar) and no page-level body styles;
   - mount returns a cleanup function, so React can unmount it when the route changes. */

export type IntroSection = {
  id: string;
  label: string;
  still: string;
  clip: string;
  clipMobile?: string;
  accent?: string;
  scroll?: number;
  linger?: number;
  eyebrow?: string;
  title?: string;
  body?: string;
  cta?: { primary?: { label: string; href: string }; secondary?: { label: string; href: string } };
};

export type IntroConfig = {
  sections: IntroSection[];
  diveScroll?: number;
  crossfade?: number;
  hint?: string;
  /** called when the current scene changes, or the film scrolls in or out of view */
  onScene?: (index: number, inView: boolean) => void;
};

type Segment = {
  si: number;
  clip: string;
  clipM?: string;
  accent?: string;
  w: number;
  linger: number;
  start: number;
  end: number;
  el: HTMLDivElement;
  img: HTMLImageElement;
  video: HTMLVideoElement | null;
  url: string | null;
  loading: boolean;
  ready: boolean;
  cur: number;
  target: number;
  visible: boolean;
};

export function mountScrollWorld(container: HTMLElement, config: IntroConfig): () => void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const smallMQ = window.matchMedia("(max-width: 860px)");
  const isMobile = () => coarse || smallMQ.matches;
  const SECTIONS = config.sections;
  const DIVE_W = config.diveScroll || 1.3;
  const CROSSFADE = config.crossfade ?? 0.12;
  const N = SECTIONS.length;
  let alive = true;

  injectCSS();
  container.classList.add("sw-root");

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  };

  const stage = el("div", "sw-stage");
  const copylayer = el("div", "sw-copylayer");
  const route = el("div", "sw-route");
  const hint = el("div", "sw-hint");
  const hintText = el("span");
  hintText.textContent = config.hint || "scroll";
  hint.append(hintText, el("i"));
  const sticky = el("div", "sw-sticky");
  sticky.append(stage, copylayer, route, hint);
  const track = el("div", "sw-track");
  container.append(sticky, track);

  const SEGMENTS: Segment[] = SECTIONS.map((s, i) => {
    const scene = el("div", "sw-scene");
    scene.style.setProperty("--sw-accent", s.accent || "");
    const img = el("img", "sw-scene__still");
    img.alt = "";
    img.decoding = "async";
    if (i > 0) img.loading = "lazy";
    img.src = s.still;
    scene.appendChild(img);
    stage.appendChild(scene);
    return {
      si: i, clip: s.clip, clipM: s.clipMobile, accent: s.accent, w: s.scroll || DIVE_W, linger: s.linger || 0,
      start: 0, end: 0, el: scene, img, video: null, url: null, loading: false, ready: false, cur: 0, target: 0, visible: false,
    };
  });

  const copies: HTMLElement[] = [];
  const dots: HTMLElement[] = [];
  SECTIONS.forEach((s, i) => {
    const c = el("article", i === N - 1 ? "sw-copy sw-copy--last" : "sw-copy");
    c.style.setProperty("--sw-accent", s.accent || "");
    c.innerHTML =
      `<span class="sw-copy__num">${pad(i + 1)} / ${pad(N)}</span>` +
      (s.eyebrow ? `<span class="sw-copy__eyebrow">${esc(s.eyebrow)}</span>` : "") +
      (s.title ? `<h2 class="sw-copy__title">${esc(s.title)}</h2>` : "") +
      (s.body ? `<p class="sw-copy__body">${esc(s.body)}</p>` : "") +
      (s.cta ? `<div class="sw-copy__cta">${ctaBtns(s.cta)}</div>` : "");
    copylayer.appendChild(c);
    copies.push(c);

    const dot = el("button", "sw-route__dot");
    dot.type = "button";
    dot.setAttribute("aria-label", s.label);
    dot.style.setProperty("--sw-accent", s.accent || "");
    dot.innerHTML = `<span class="sw-route__label">${esc(s.label)}</span><i></i>`;
    dot.addEventListener("click", () => jumpTo(i));
    route.appendChild(dot);
    dots.push(dot);
  });

  const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
  // Settles the camera mid-scene (where the copy peaks); f(0)=0 and f(1)=1, so seams are untouched.
  const lingerEase = (x: number, L: number) => { L = clamp(L); const c = x - 0.5; return (1 - L) * x + L * (4 * c * c * c + 0.5); };
  let vh = window.innerHeight, top = 0, totalW = 0, activeIndex = -1, ticking = false, rafId = 0;
  let reportedIndex = -1, reportedInView = true;
  let laidOutW = window.innerWidth;

  function layout() {
    vh = window.innerHeight;
    laidOutW = window.innerWidth;
    let off = 0;
    SEGMENTS.forEach(s => { s.start = off * vh; off += s.w; s.end = off * vh; });
    totalW = off;
    // the sticky picture is one screen tall; the track adds the scroll distance of the film
    track.style.height = (totalW * vh) + "px";
    top = container.getBoundingClientRect().top + window.scrollY;
    read();
  }

  function jumpTo(i: number) {
    const seg = SEGMENTS[i];
    window.scrollTo({ top: top + seg.start + (seg.end - seg.start) * 0.5, behavior: reduce ? "auto" : "smooth" });
  }

  function loadClip(s: Segment) {
    // Reduced motion: never load the clips, the stills just dissolve into each other.
    if (reduce) return;
    if (s.url) { if (!s.video) attachVideo(s); return; }
    if (s.loading) return;
    s.loading = true;
    const src = (isMobile() && s.clipM) ? s.clipM : s.clip;
    // Loaded as a Blob so the video is always seekable, whatever the host does with byte ranges.
    fetch(src).then(r => r.ok ? r.blob() : Promise.reject(new Error(String(r.status))))
      .then(blob => {
        if (!alive) return;
        s.url = URL.createObjectURL(blob);
        read();
      }).catch(() => { s.loading = false; });
  }

  function attachVideo(s: Segment) {
    const v = el("video", "sw-scene__video");
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.src = s.url as string;
    v.addEventListener("loadedmetadata", () => { s.ready = true; read(); });
    // Hide the poster only once a real frame has painted (iOS shows blank until then).
    v.addEventListener("seeked", () => s.el.classList.add("has-clip"), { once: true });
    v.addEventListener("loadeddata", () => { try { v.pause(); } catch { /* ignore */ } if (userReady) primeVideo(v); });
    s.el.appendChild(v);
    s.video = v;
    s.cur = -1; // force a first seek so the frame paints
  }

  // Far-away scenes give their decoder back; the clip stays in memory and reattaches when near.
  function detachVideo(s: Segment) {
    if (!s.video) return;
    s.video.removeAttribute("src");
    s.video.load();
    s.video.remove();
    s.video = null;
    s.ready = false;
    s.el.classList.remove("has-clip");
  }

  function read() {
    ticking = false;
    const y = window.scrollY - top;
    const fade = CROSSFADE * vh;
    let ci = 0;
    for (let i = 0; i < N; i++) if (y >= SEGMENTS[i].start) ci = i;

    for (let i = 0; i < N; i++) {
      const s = SEGMENTS[i];
      if (y > s.start - 1.6 * vh && y < s.end + 1.6 * vh) loadClip(s);
      else if (y < s.start - 3 * vh || y > s.end + 3 * vh) detachVideo(s);
      const local = clamp((y - s.start) / (s.end - s.start));
      s.target = s.linger ? lingerEase(local, s.linger) : local;
      let outside = 0;
      if (y < s.start) outside = s.start - y; else if (y > s.end) outside = y - s.end;
      // the first and last scenes hold past the ends, so there is never an empty frame
      if ((i === 0 && y < s.start) || (i === N - 1 && y > s.end)) outside = 0;
      const op = smooth(1 - outside / fade);
      s.el.style.opacity = String(op);
      s.visible = op > 0.001;
      s.el.style.zIndex = i === ci ? "120" : String(100 + Math.round(op * 10));
      if (!s.ready) {
        const sc = reduce ? 1 : 1.03 + local * 0.14;
        s.img.style.transform = `scale(${sc.toFixed(3)})`;
      }
    }

    for (let i = 0; i < N; i++) {
      const seg = SEGMENTS[i];
      const pr = clamp((y - seg.start) / (seg.end - seg.start));
      const before = y < seg.start, after = y > seg.end;
      let cop: number;
      if (i === 0) cop = after ? 0 : smooth(1 - pr / 0.62);
      else if (i === N - 1) cop = before ? 0 : smooth(pr / 0.4);
      else cop = (before || after) ? 0 : smooth(1 - Math.abs(pr - 0.5) / 0.5);
      const c = copies[i];
      c.style.opacity = String(cop);
      c.style.transform = reduce ? "" : `translateY(${(0.5 - pr) * 4}vh)`;
      c.style.pointerEvents = cop > 0.5 ? "auto" : "none";
      c.setAttribute("aria-hidden", cop > 0.5 ? "false" : "true");
    }

    if (ci !== activeIndex) {
      activeIndex = ci;
      dots.forEach((d, k) => d.classList.toggle("is-active", k === ci));
      container.style.setProperty("--sw-accent", SECTIONS[ci].accent || "");
    }
    hint.style.opacity = String(clamp(1 - y / (0.5 * vh)));
    const inView = y < (totalW + 0.3) * vh;
    if (ci !== reportedIndex || inView !== reportedInView) {
      reportedIndex = ci;
      reportedInView = inView;
      config.onScene?.(ci, inView);
    }
  }

  function raf() {
    if (!alive) return;
    const eps = isMobile() ? 0.02 : 0.008;
    for (const s of SEGMENTS) {
      if (!s.ready || !s.video) continue;
      // Never queue a seek while the decoder is still busy with the last one (stops phones freezing).
      if (s.video.seeking) continue;
      if (!s.visible && Math.abs(s.cur - s.target) < 0.002) continue;
      s.cur = s.cur < 0 ? s.target : s.cur + (s.target - s.cur) * (reduce ? 1 : 0.18);
      const t = clamp(s.cur, 0, 0.999) * (s.video.duration || 1);
      if (Math.abs(s.video.currentTime - t) > eps) { try { s.video.currentTime = t; } catch { /* ignore */ } }
    }
    rafId = requestAnimationFrame(raf);
  }

  // Safari (iOS and Mac) only paints a muted video reliably once it has been played after a
  // user gesture: prime each video once (muted play, then pause), on the first touch after it loads.
  let userReady = false;
  const primed = new WeakSet<HTMLVideoElement>();
  function primeVideo(v: HTMLVideoElement | null) {
    if (!v || primed.has(v)) return;
    primed.add(v);
    const t = v.currentTime;
    const p = v.play();
    if (p) p.then(() => { v.pause(); v.currentTime = t; }).catch(() => primed.delete(v));
  }
  function onGesture() {
    userReady = true;
    SEGMENTS.forEach(s => primeVideo(s.video));
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(read); } };
  // Phones fire resize whenever the URL bar slides; only relayout when the width changes.
  const onResize = () => { if (coarse && window.innerWidth === laidOutW) return; layout(); };

  window.addEventListener("pointerdown", onGesture, { passive: true });
  window.addEventListener("touchstart", onGesture, { passive: true });
  window.addEventListener("keydown", onGesture);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", layout);
  window.addEventListener("load", layout);
  // the page above/below can change height after images load
  const ro = new ResizeObserver(() => { top = container.getBoundingClientRect().top + window.scrollY; read(); });
  ro.observe(document.body);
  layout();
  rafId = requestAnimationFrame(raf);

  return () => {
    alive = false;
    cancelAnimationFrame(rafId);
    ro.disconnect();
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("touchstart", onGesture);
    window.removeEventListener("keydown", onGesture);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", layout);
    window.removeEventListener("load", layout);
    SEGMENTS.forEach(s => {
      if (s.video) { s.video.removeAttribute("src"); s.video.load(); }
      if (s.url) URL.revokeObjectURL(s.url);
    });
    container.replaceChildren();
    container.classList.remove("sw-root");
  };
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
function ctaBtns(cta: NonNullable<IntroSection["cta"]>) {
  let h = "";
  if (cta.primary) h += `<a class="sw-btn sw-btn--primary" href="${esc(cta.primary.href)}">${esc(cta.primary.label)}</a>`;
  if (cta.secondary) h += `<a class="sw-btn sw-btn--ghost" href="${esc(cta.secondary.href)}">${esc(cta.secondary.label)}</a>`;
  return h;
}

function injectCSS() {
  if (document.getElementById("sw-css")) return;
  const css = `
  .sw-root{--sw-bg:#0b0b0d;--sw-ink:#f5ecd5;--sw-ink-soft:#b6ad9c;--sw-accent:#f3cf43;
    --sw-font-display:var(--font-kannada),Georgia,serif;--sw-font-body:'DM Sans','Inter',system-ui,sans-serif;
    position:relative;background:var(--sw-bg);color:var(--sw-ink);font-family:var(--sw-font-body);}
  .sw-sticky{position:sticky;top:0;height:100vh;height:100dvh;overflow:hidden;z-index:1;}
  .sw-stage{position:absolute;inset:0;z-index:10;pointer-events:none;background:var(--sw-bg);}
  .sw-scene{position:absolute;inset:0;opacity:0;overflow:hidden;will-change:opacity;}
  .sw-scene__video,.sw-scene__still{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;object-position:center 45%;}
  .sw-scene__still{will-change:transform;} .sw-scene.has-clip .sw-scene__still{opacity:0;} .sw-scene__video{z-index:1;}
  .sw-copylayer{position:absolute;inset:0;z-index:20;pointer-events:none;}
  .sw-copylayer::before{content:"";position:absolute;inset:0;width:min(58vw,780px);background:linear-gradient(90deg,color-mix(in srgb,var(--sw-bg) 88%,transparent) 0%,color-mix(in srgb,var(--sw-bg) 62%,transparent) 38%,color-mix(in srgb,var(--sw-bg) 22%,transparent) 66%,transparent 100%);}
  .sw-copy{position:absolute;left:clamp(18px,6vw,90px);top:54%;transform:translateY(-50%);width:min(42vw,480px);opacity:0;will-change:opacity,transform;}
  .sw-copy__num{font-family:ui-monospace,Menlo,monospace;font-size:.72rem;letter-spacing:.14em;color:var(--sw-ink-soft);}
  .sw-copy__eyebrow{display:block;margin-top:16px;font-weight:800;font-size:.74rem;letter-spacing:.18em;text-transform:uppercase;color:var(--sw-accent);}
  .sw-copy__title{font-family:var(--sw-font-display);font-weight:700;color:var(--sw-ink);font-size:clamp(2.2rem,4.6vw,4rem);line-height:1.18;margin:12px 0 0;text-shadow:0 2px 24px rgba(0,0,0,.6);}
  .sw-copy__body{margin-top:16px;font-size:clamp(1rem,1.2vw,1.12rem);line-height:1.6;color:color-mix(in srgb,var(--sw-ink) 86%,var(--sw-ink-soft));max-width:40ch;text-shadow:0 1px 14px rgba(0,0,0,.75);}
  .sw-copy__cta{display:flex;flex-wrap:wrap;gap:14px;margin-top:26px;pointer-events:auto;}
  .sw-btn{text-decoration:none;font-weight:800;font-size:.8rem;letter-spacing:.08em;padding:14px 22px;border-radius:2px;transition:transform .2s;}
  .sw-btn--primary{color:#101012;background:var(--sw-accent);border:2px solid #09090b;box-shadow:3px 3px 0 #e33e30;} .sw-btn--primary:hover{transform:translateY(-2px);}
  .sw-btn--ghost{color:var(--sw-ink);border:1.5px solid color-mix(in srgb,var(--sw-ink) 40%,transparent);background:rgba(0,0,0,.25);} .sw-btn--ghost:hover{transform:translateY(-2px);}
  .sw-route{position:absolute;right:clamp(14px,2.4vw,30px);top:54%;z-index:40;transform:translateY(-50%);display:flex;flex-direction:column;gap:20px;padding:18px 10px;}
  .sw-route::before{content:"";position:absolute;left:50%;top:22px;bottom:22px;width:2px;transform:translateX(-50%);background:var(--sw-accent);opacity:.3;}
  .sw-route__dot{position:relative;border:0;background:transparent;cursor:pointer;width:14px;height:14px;display:grid;place-items:center;padding:0;}
  .sw-route__dot i{width:9px;height:9px;border-radius:50%;background:color-mix(in srgb,var(--sw-accent) 40%,transparent);transition:transform .3s,background .3s,box-shadow .3s;}
  .sw-route__dot:hover i{transform:scale(1.25);background:var(--sw-accent);}
  .sw-route__dot.is-active i{background:var(--sw-accent);transform:scale(1.4);box-shadow:0 0 0 5px color-mix(in srgb,var(--sw-accent) 22%,transparent);}
  .sw-route__label{position:absolute;right:24px;top:50%;transform:translateY(-50%) translateX(6px);white-space:nowrap;font-size:.72rem;font-weight:700;letter-spacing:.06em;color:var(--sw-ink);background:rgba(11,11,13,.72);backdrop-filter:blur(6px);padding:5px 11px;border-radius:999px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;border:1px solid color-mix(in srgb,var(--sw-accent) 30%,transparent);}
  .sw-route__dot:hover .sw-route__label,.sw-route__dot.is-active .sw-route__label{opacity:1;transform:translateY(-50%) translateX(0);}
  .sw-hint{position:absolute;left:50%;bottom:26px;z-index:30;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--sw-ink-soft);pointer-events:none;}
  .sw-hint i{width:22px;height:34px;border-radius:12px;border:2px solid color-mix(in srgb,var(--sw-ink) 35%,transparent);position:relative;}
  .sw-hint i::after{content:"";position:absolute;left:50%;top:7px;width:4px;height:7px;border-radius:2px;background:var(--sw-accent);transform:translateX(-50%);animation:sw-wheel 1.7s ease-in-out infinite;}
  @keyframes sw-wheel{0%{opacity:0;top:6px}40%{opacity:1}100%{opacity:0;top:17px}}
  .sw-track{position:relative;z-index:1;width:100%;pointer-events:none;}
  @media (max-width:860px){
    .sw-copylayer::before{width:100%;height:62%;top:auto;bottom:0;background:linear-gradient(0deg,color-mix(in srgb,var(--sw-bg) 92%,transparent) 10%,color-mix(in srgb,var(--sw-bg) 60%,transparent) 48%,transparent 100%);}
    .sw-copy{left:clamp(18px,6vw,64px);right:clamp(18px,6vw,64px);top:auto;bottom:calc(clamp(64px,13dvh,120px) + env(safe-area-inset-bottom));transform:none;width:auto;max-width:560px;}
    .sw-copy__title{font-size:clamp(2rem,8vw,2.8rem);}
    .sw-copy__body{max-width:none;font-size:clamp(.95rem,3.6vw,1.08rem);}
    .sw-hint{left:clamp(18px,6vw,64px);bottom:calc(24px + env(safe-area-inset-bottom));transform:none;flex-direction:row;gap:8px;font-size:.62rem;}
    .sw-hint i{width:16px;height:24px;border-radius:9px;} .sw-hint i::after{top:5px;height:5px;}
    /* the logo fills the middle of the last scene on a phone: keep only the eyebrow and buttons */
    .sw-copy--last .sw-copy__title,.sw-copy--last .sw-copy__body{display:none;}
    .sw-copy--last .sw-copy__cta{margin-top:14px;flex-wrap:nowrap;gap:10px;} .sw-copy--last .sw-btn{padding:12px 13px;font-size:.68rem;white-space:nowrap;}
    .sw-route{gap:14px;right:6px;} .sw-route__label{display:none;}
  }
  @media (hover:none) and (pointer:coarse){ .sw-route{padding:14px 6px;} .sw-route__dot{width:28px;height:28px;} }
  @media (prefers-reduced-motion:reduce){ .sw-hint i::after{animation:none;} }
  `;
  // Not in a cascade layer: the site's global resets (img/video height:auto, h2 font-size:inherit)
  // would otherwise win over these rules.
  const style = document.createElement("style");
  style.id = "sw-css";
  style.textContent = css;
  document.head.appendChild(style);
}

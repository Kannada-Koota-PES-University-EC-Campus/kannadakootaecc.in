import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mountScrollWorld, type IntroSection } from "@/features/intro/scrollWorld";
import { IntroSound } from "@/features/intro/introSound";

// The intro film is cut into scenes (public/intro): scrolling scrubs through each one.
// All Kannada text stays here as real HTML, never inside the video.
const v = (name: string) => ({ still: `/intro/${name}.webp`, clip: `/intro/${name}.mp4` });

const SECTIONS: IntroSection[] = [
  { id: "spark", label: "The spark", ...v("spark"), scroll: 1.0, eyebrow: "ಕಿಡಿ · THE SPARK", title: "ಒಂದು ಕಿಡಿ.", body: "Every story begins with a spark. Ours begins with a language." },
  { id: "land", label: "The land", ...v("land"), scroll: 1.2, linger: 0.3, eyebrow: "ನಾಡು · THE LAND", title: "ಕರುನಾಡು.", body: "Old rocks, slow rivers, morning mist. The land that gave us our words." },
  { id: "stone", label: "Hampi", ...v("stone"), scroll: 1.2, linger: 0.3, eyebrow: "ಶಿಲ್ಪ · HAMPI", title: "ಕಲ್ಲಿನಲ್ಲಿ ಕಾವ್ಯ.", body: "At Hampi, even the stone learned to tell stories." },
  { id: "script", label: "The script", ...v("script"), scroll: 1.4, linger: 0.3, eyebrow: "ಲಿಪಿ · THE SCRIPT", title: "ಅಕ್ಷರದ ಬೆಳಕು.", body: "Letters carved centuries ago, still alive in the way we speak, passed on thread by thread." },
  { id: "arts", label: "The arts", ...v("arts"), scroll: 1.3, linger: 0.3, eyebrow: "ಕಲೆ · THE ARTS", title: "ತಾಳ, ಹೆಜ್ಜೆ, ಬಣ್ಣ.", body: "Yakshagana, music and colour. The culture comes alive when it is performed." },
  { id: "city", label: "Today", ...v("city"), scroll: 1.0, eyebrow: "ಇಂದು · TODAY", title: "ಹಳೆ ಬೇರು, ಹೊಸ ಚಿಗುರು.", body: "The same story, now in a city of glass and light, and on our campus." },
  {
    id: "koota", label: "Kannada Koota", ...v("koota"), scroll: 1.8, eyebrow: "ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ", title: "ಕನ್ನಡ ಕೂಟ.", body: "ಬನ್ನಿ, ಈ ಕಥೆಯ ಭಾಗವಾಗಿ. Come be part of the story.",
    cta: { primary: { label: "ENTER THE KOOTA ↓", href: "#home-start" }, secondary: { label: "OUR EVENTS", href: "/events" } },
  },
];

const SOUND_KEY = "kkc-intro-sound";
// on unless the visitor turned it off before
const readSound = () => { try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; } };
const saveSound = (on: boolean) => { try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch { /* private mode */ } };

const SKIP_KEY = "kkc-intro-skipped";
const skippedThisVisit = () => { try { return sessionStorage.getItem(SKIP_KEY) === "1"; } catch { return false; } };
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Phase = "loading" | "ready" | "entered" | "skipped";

/**
 * The film is a lot of video, so it is downloaded in full behind a loading screen first;
 * the visitor enters when it is ready (that click also lets the browser play the sounds),
 * or skips straight to the website. Visitors who prefer reduced motion never load the
 * videos (the film shows stills), so they go straight in.
 */
export default function ScrollIntro() {
  const [phase, setPhase] = useState<Phase>(() => (skippedThisVisit() ? "skipped" : reducedMotion() ? "entered" : "loading"));
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [clips, setClips] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (phase !== "loading") return;
    const ctrl = new AbortController();
    preloadClips(SECTIONS.map((x) => x.clip), (loaded, total) => setProgress({ loaded, total }), ctrl.signal)
      .then((map) => {
        if (ctrl.signal.aborted) { Object.values(map).forEach((u) => URL.revokeObjectURL(u)); return; }
        setClips(map);
        setPhase("ready");
      })
      .catch(() => { if (!ctrl.signal.aborted) setPhase("ready"); }); // a failed download: the film loads clips itself
    return () => ctrl.abort();
  }, [phase]);

  // the downloaded copies are freed only when the home page closes
  useEffect(() => () => { if (clips) Object.values(clips).forEach((u) => URL.revokeObjectURL(u)); }, [clips]);

  // nothing behind the loading screen scrolls
  useEffect(() => {
    if (phase !== "loading" && phase !== "ready") return;
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = prev; };
  }, [phase]);

  const skip = () => {
    try { sessionStorage.setItem(SKIP_KEY, "1"); } catch { /* private mode */ }
    setPhase("skipped");
    window.scrollTo(0, 0);
  };

  if (phase === "skipped") return null;
  return <>
    {phase !== "loading" && <IntroFilm clips={clips} />}
    {phase !== "entered" && <IntroLoader progress={progress} ready={phase === "ready"} onEnter={() => setPhase("entered")} onSkip={skip} />}
  </>;
}

/** downloads every clip, reporting bytes loaded / total; resolves to blob: URLs keyed by the clip's address */
async function preloadClips(srcs: string[], onProgress: (loaded: number, total: number) => void, signal: AbortSignal) {
  const loaded = new Array(srcs.length).fill(0);
  const sizes = new Array(srcs.length).fill(0);
  const report = () => onProgress(loaded.reduce((a, b) => a + b, 0), sizes.reduce((a, b) => a + b, 0));
  const blobs = await Promise.all(srcs.map(async (src, i) => {
    const res = await fetch(src, { signal });
    if (!res.ok) throw new Error(`${src}: ${res.status}`);
    sizes[i] = Number(res.headers.get("content-length")) || 0;
    if (!res.body) return res.blob();
    const reader = res.body.getReader();
    const parts: BlobPart[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      loaded[i] += value.length;
      if (!sizes[i]) sizes[i] = loaded[i];
      report();
    }
    return new Blob(parts, { type: res.headers.get("content-type") || "video/mp4" });
  }));
  return Object.fromEntries(srcs.map((src, i) => [src, URL.createObjectURL(blobs[i])]));
}

function IntroLoader({ progress, ready, onEnter, onSkip }: { progress: { loaded: number; total: number }; ready: boolean; onEnter: () => void; onSkip: () => void }) {
  const enterRef = useRef<HTMLButtonElement>(null);
  const share = ready ? 1 : progress.total ? progress.loaded / progress.total : 0;
  const mb = (b: number) => Math.round(b / 1048576);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => { if (ready) enterRef.current?.focus(); }, [ready]);
  const enter = () => { setLeaving(true); window.setTimeout(onEnter, 650); };
  return (
    <div className={`intro-loader${ready ? " is-ready" : ""}${leaving ? " is-leaving" : ""}`} role="dialog" aria-modal="true" aria-label="The Kannada Koota film is loading">
      <div className="intro-loader-center">
        <div className="intro-loader-ring" style={{ "--p": share } as React.CSSProperties}>
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" /><circle className="intro-loader-arc" cx="60" cy="60" r="54" pathLength={1} /></svg>
          <img src="/KKCEC-ECON.png" alt="" />
        </div>
        <p className="intro-loader-name kn">ಕನ್ನಡ ಕೂಟ</p>
        {ready ? (
          <>
            <p className="intro-loader-status"><span className="kn">ಚಿತ್ರ ಸಿದ್ಧವಾಗಿದೆ</span> · The film is ready</p>
            <button ref={enterRef} type="button" className="intro-loader-enter" onClick={enter}><span className="kn">ಒಳಗೆ ಬನ್ನಿ</span> · Enter <ArrowRight size={16} /></button>
          </>
        ) : (
          <p className="intro-loader-status" aria-live="polite">
            <span className="kn">ಚಿತ್ರ ಸಿದ್ಧವಾಗುತ್ತಿದೆ</span> · Preparing the film · <b>{Math.floor(share * 100)}%</b>
            {progress.total > 0 && <small>{mb(progress.loaded)} of {mb(progress.total)} MB</small>}
          </p>
        )}
      </div>
      <button type="button" className="intro-loader-skip" onClick={onSkip}><span className="kn">ನೇರವಾಗಿ ಮುಖಪುಟಕ್ಕೆ</span> · Skip to the website <ArrowRight size={15} /></button>
    </div>
  );
}

/** the film itself (unchanged); `clips` are already-downloaded copies of the clip files */
function IntroFilm({ clips }: { clips: Record<string, string> | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const sound = useRef<IntroSound | null>(null);
  const [soundOn, setSoundOn] = useState(readSound);

  // A short sound plays at each scene change, on by default. It tries to start on the first scroll;
  // most browsers only allow sound after a click, tap or key press, so it keeps trying on those too
  // until the browser lets it play (the sound button's own click is handled by toggleSound).
  useEffect(() => {
    const s = new IntroSound();
    sound.current = s;
    const events = ["wheel", "scroll", "touchstart", "touchend", "pointerdown", "keydown"] as const;
    const stop = () => events.forEach(e => window.removeEventListener(e, unlock, true));
    function unlock(e: Event) {
      if ((e.target as Element | null)?.closest?.(".scroll-intro-sound")) return;
      if (!readSound()) return stop();
      if (s.isRunning) return stop();
      s.enable(false);
    }
    events.forEach(e => window.addEventListener(e, unlock, { capture: true, passive: true }));
    return () => {
      stop();
      s.dispose();
      sound.current = null;
    };
  }, []);

  const toggleSound = () => {
    const s = sound.current;
    if (!s) return;
    // shown as on but not started yet (no click so far): the visitor wants it off
    const turnOn = !soundOn;
    if (turnOn) s.enable(); else s.disable();
    setSoundOn(turnOn);
    saveSound(turnOn);
  };

  // The navbar stays out of the way until the film ends: the intro slides up under it,
  // and the bar comes back once the home page reaches the top of the screen.
  useEffect(() => {
    const section = sectionRef.current;
    const nav = document.querySelector<HTMLElement>(".site-nav");
    if (!section || !nav) return;
    const place = () => { section.style.marginTop = `-${nav.offsetHeight}px`; };
    const toggle = () => nav.classList.toggle("nav-hidden-for-intro", section.getBoundingClientRect().bottom > nav.offsetHeight);
    place();
    // check again once the film has laid itself out (it has no height on the first pass)
    const frame = requestAnimationFrame(toggle);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", toggle, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", toggle);
      nav.classList.remove("nav-hidden-for-intro");
    };
  }, []);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const sections = clips ? SECTIONS.map((x) => ({ ...x, clip: clips[x.clip] ?? x.clip })) : SECTIONS;
    const unmount = mountScrollWorld(host, { sections, crossfade: 0.1, hint: "scroll to begin", onScene: (i, inView) => sound.current?.setScene(i, inView) });
    // the engine renders plain links; send the site's own pages through the router
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      const href = link?.getAttribute("href");
      if (!href?.startsWith("/")) return;
      e.preventDefault();
      navigate(href);
    };
    host.addEventListener("click", onClick);
    return () => { host.removeEventListener("click", onClick); unmount(); };
  }, [navigate, clips]);

  return <section ref={sectionRef} className="scroll-intro" aria-label="Kannada Koota: a short scroll-through film">
    {/* the buttons ride on a screen-tall sticky layer, so they leave together with the film */}
    <div className="scroll-intro-ui">
      <button type="button" className={`scroll-intro-sound${soundOn ? " is-on" : ""}`} onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? "Turn the transition sounds off" : "Turn the transition sounds on"}>
        {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}<span>{soundOn ? "ಧ್ವನಿ · SOUND ON" : "ಧ್ವನಿ · TURN SOUND ON"}</span>
      </button>
      <a className="scroll-intro-skip" href="#home-start">SKIP INTRO <ArrowDown size={13} /></a>
    </div>
    <div ref={ref} />
  </section>;
}

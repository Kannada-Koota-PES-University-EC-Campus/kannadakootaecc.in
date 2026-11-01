import { useEffect, useRef, useState } from "react";
import { ArrowRight, Play, Volume2, VolumeX } from "lucide-react";
import { IntroSound } from "@/features/intro/introSound";

/*
 * The intro film, played as a video: it starts as soon as the home page opens, a caption names each
 * scene, and when the film ends the screen slides up to the home page. "Skip" at the bottom goes
 * there at any time. It plays once per visit.
 *
 * (The earlier scroll-scrubbed version is still in ScrollIntro.tsx: to go back to it, use
 * <ScrollIntro /> instead of <IntroVideo /> in IndexPage.tsx.)
 *
 * All Kannada text stays here as real HTML, never inside the video.
 */

// public/intro/film-*.mp4 is the seven scenes of the scroll version joined into one film
const SCENES = [
  { at: 0, eyebrow: "ಕಿಡಿ · THE SPARK", title: "ಒಂದು ಕಿಡಿ.", body: "Every story begins with a spark. Ours begins with a language." },
  { at: 4, eyebrow: "ನಾಡು · THE LAND", title: "ಕರುನಾಡು.", body: "Old rocks, slow rivers, morning mist. The land that gave us our words." },
  { at: 9, eyebrow: "ಶಿಲ್ಪ · HAMPI", title: "ಕಲ್ಲಿನಲ್ಲಿ ಕಾವ್ಯ.", body: "At Hampi, even the stone learned to tell stories." },
  { at: 14, eyebrow: "ಲಿಪಿ · THE SCRIPT", title: "ಅಕ್ಷರದ ಬೆಳಕು.", body: "Letters carved centuries ago, still alive in the way we speak." },
  { at: 20, eyebrow: "ಕಲೆ · THE ARTS", title: "ತಾಳ, ಹೆಜ್ಜೆ, ಬಣ್ಣ.", body: "Yakshagana, music and colour. The culture comes alive when it is performed." },
  { at: 25.5, eyebrow: "ಇಂದು · TODAY", title: "ಹಳೆ ಬೇರು, ಹೊಸ ಚಿಗುರು.", body: "The same story, now in a city of glass and light, and on our campus." },
  { at: 29, eyebrow: "ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ", title: "ಕನ್ನಡ ಕೂಟ.", body: "ಬನ್ನಿ, ಈ ಕಥೆಯ ಭಾಗವಾಗಿ. Come be part of the story." },
];
const sceneAt = (t: number) => SCENES.reduce((i, s, k) => (t >= s.at ? k : i), 0);

const SEEN_KEY = "kkc-intro-seen";
const seenThisVisit = () => { try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch { return false; } };
const markSeen = () => { try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ } };
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SOUND_KEY = "kkc-intro-sound";
const readSound = () => { try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; } };
const saveSound = (on: boolean) => { try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch { /* private mode */ } };

// Each screen gets the film it can show: 4K only on big, sharp screens with fast internet,
// 1080p on ordinary laptops, 720p on phones and for data-saver visitors.
const FILM_4K = "/intro/film-2160.mp4";
const FILM_HD = "/intro/film-1080.mp4";
const filmSrc = () => {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; downlink?: number } }).connection;
  if (conn?.saveData || Math.min(window.innerWidth, window.innerHeight) < 600) return "/intro/film-720.mp4";
  const screenPx = Math.max(window.innerWidth, window.innerHeight) * (window.devicePixelRatio || 1);
  // Mbps, a rough guess where the browser gives one (Chrome never says more than 10); if 4K still
  // cannot keep up, the film drops to 1080p by itself (see onWaiting)
  const slow = conn?.downlink !== undefined && conn.downlink < 5;
  return screenPx >= 2400 && !slow ? FILM_4K : FILM_HD;
};
const STALL_MS = 2500; // the 4K film buffering this long falls back to 1080p

const LEAVE_MS = 900;

export default function IntroVideo() {
  const [show, setShow] = useState(() => !seenThisVisit() && !reducedMotion());
  if (!show) return null;
  return <IntroVideoPlayer onDone={() => setShow(false)} />;
}

function IntroVideoPlayer({ onDone }: { onDone: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const sound = useRef<IntroSound | null>(null);
  const [src, setSrc] = useState(filmSrc);
  const stall = useRef(0);
  const [scene, setScene] = useState(0);
  const [progress, setProgress] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [blocked, setBlocked] = useState(false); // the browser refused to start the video by itself
  const [leaving, setLeaving] = useState(false);
  const [soundOn, setSoundOn] = useState(readSound);

  const finish = () => {
    if (leaving) return;
    markSeen();
    setLeaving(true);
    window.setTimeout(onDone, reducedMotion() ? 0 : LEAVE_MS);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // the page underneath stays at the top and does not scroll while the film plays
  useEffect(() => {
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") finishRef.current(); };
    window.addEventListener("keydown", key);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", key);
      window.scrollTo(0, 0);
    };
  }, []);

  // start playing straight away (muted, so browsers allow it)
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => setBlocked(true));
  }, []);

  // A short sound at each scene change (same as the scroll version). Browsers only allow sound
  // after a click, tap or key press, so it starts on the visitor's first one.
  useEffect(() => {
    const s = new IntroSound();
    sound.current = s;
    const events = ["touchstart", "touchend", "pointerdown", "keydown"] as const;
    const stop = () => events.forEach((e) => window.removeEventListener(e, unlock, true));
    function unlock(e: Event) {
      if ((e.target as Element | null)?.closest?.(".intro-video-sound")) return;
      if (!readSound() || s.isRunning) return stop();
      s.enable(false);
    }
    events.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
    return () => { stop(); s.dispose(); sound.current = null; };
  }, []);

  const toggleSound = () => {
    const s = sound.current;
    if (!s) return;
    const turnOn = !soundOn;
    if (turnOn) s.enable(); else s.disable();
    setSoundOn(turnOn);
    saveSound(turnOn);
  };

  const onTime = () => {
    const v = video.current;
    if (!v) return;
    const i = sceneAt(v.currentTime);
    if (i !== scene) { setScene(i); sound.current?.setScene(i, true); }
    if (v.duration) setProgress(v.currentTime / v.duration);
  };

  // 4K but the internet cannot keep up: carry on in 1080p from the same moment
  const onWaiting = () => {
    setWaiting(true);
    if (src !== FILM_4K) return;
    window.clearTimeout(stall.current);
    stall.current = window.setTimeout(() => {
      const v = video.current;
      if (!v || src !== FILM_4K) return;
      const t = v.currentTime;
      setSrc(FILM_HD);
      v.addEventListener("loadedmetadata", () => { v.currentTime = t; v.play().catch(() => setBlocked(true)); }, { once: true });
    }, STALL_MS);
  };
  const onPlaying = () => {
    window.clearTimeout(stall.current);
    setWaiting(false);
    setBlocked(false);
  };
  useEffect(() => () => window.clearTimeout(stall.current), []);

  const playByTap = () => {
    setBlocked(false);
    video.current?.play().catch(() => setBlocked(true));
  };

  const s = SCENES[scene];
  return (
    <div className={`intro-video${leaving ? " is-leaving" : ""}`} role="dialog" aria-modal="true" aria-label="Kannada Koota intro film">
      <video
        ref={video}
        className="intro-video-film"
        src={src}
        poster="/intro/spark.webp"
        muted
        autoPlay
        playsInline
        preload="auto"
        disablePictureInPicture
        onTimeUpdate={onTime}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onEnded={finish}
        onError={finish}
        aria-hidden="true"
      />
      <div className="intro-video-shade" aria-hidden="true" />

      <div key={scene} className="intro-video-caption" aria-live="polite">
        <p className="intro-video-eyebrow kn">{s.eyebrow}</p>
        <h2 className="intro-video-title kn">{s.title}</h2>
        <p className="intro-video-body">{s.body}</p>
      </div>

      {waiting && !blocked && <span className="intro-video-spinner" role="status" aria-label="Loading the film" />}
      {blocked && (
        <button type="button" className="intro-video-play" onClick={playByTap}>
          <Play size={22} /> <span className="kn">ಚಿತ್ರ ನೋಡಿ</span> · Watch the film
        </button>
      )}

      <button type="button" className="intro-video-sound" onClick={toggleSound} aria-pressed={soundOn}>
        {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />} <span className="kn">ಧ್ವನಿ</span> · {soundOn ? "SOUND ON" : "SOUND OFF"}
      </button>
      <button type="button" className="intro-video-skip" onClick={finish}>
        <span className="kn">ನೇರವಾಗಿ ಮುಖಪುಟಕ್ಕೆ</span> · Skip to the website <ArrowRight size={15} />
      </button>
      <span className="intro-video-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
    </div>
  );
}

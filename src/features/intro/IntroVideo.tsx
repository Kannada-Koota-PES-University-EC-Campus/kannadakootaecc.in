import { useEffect, useRef, useState } from "react";
import { ArrowRight, Play, Volume2, VolumeX } from "lucide-react";

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

// the seven scenes of the film and when each begins (seconds)
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

// The intro film, with its own background music (cleaned up): one small file, public/intro/intro.mp4.
// It starts muted, since browsers only allow sound after a click, tap or key press; the music comes
// on with the visitor's first one (or the music button).
const FILM = "/intro/intro.mp4";

const LEAVE_MS = 900;

export default function IntroVideo() {
  const [show, setShow] = useState(() => !seenThisVisit() && !reducedMotion());
  if (!show) return null;
  return <IntroVideoPlayer onDone={() => setShow(false)} />;
}

function IntroVideoPlayer({ onDone }: { onDone: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [scene, setScene] = useState(0);
  const [progress, setProgress] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [blocked, setBlocked] = useState(false); // the browser refused to start the video by itself
  const [leaving, setLeaving] = useState(false);
  const [soundOn, setSoundOn] = useState(readSound);
  const [hearing, setHearing] = useState(false); // the music is actually playing

  const finish = () => {
    if (leaving) return;
    fadeMusic();
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

  const musicOn = () => {
    const v = video.current;
    if (!v) return;
    v.volume = 1;
    v.muted = false;
    setHearing(true);
    if (v.paused && !v.ended) v.play().catch(() => { v.muted = true; setHearing(false); });
  };
  const musicOff = () => {
    const v = video.current;
    if (v) v.muted = true;
    setHearing(false);
  };
  // the screen slides away: the music fades out with it
  const fadeMusic = () => {
    const v = video.current;
    if (!v || v.muted) return;
    const step = window.setInterval(() => {
      v.volume = Math.max(0, v.volume - 0.1);
      if (v.volume <= 0.01) window.clearInterval(step);
    }, LEAVE_MS / 10);
  };
  const musicOnRef = useRef(musicOn);
  musicOnRef.current = musicOn;

  // the visitor's first click, tap or key press brings the music in
  useEffect(() => {
    const events = ["touchend", "pointerdown", "keydown"] as const;
    const stop = () => events.forEach((e) => window.removeEventListener(e, unlock, true));
    function unlock(e: Event) {
      const t = e.target as Element | null;
      if (t?.closest?.(".intro-video-sound, .intro-video-skip")) return; // those buttons decide for themselves
      stop();
      if (readSound()) musicOnRef.current();
    }
    events.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
    return stop;
  }, []);

  const toggleSound = () => {
    // shown as on but not heard yet (no tap so far): this tap starts it
    const turnOn = !soundOn || !hearing;
    if (turnOn) musicOn(); else musicOff();
    setSoundOn(turnOn);
    saveSound(turnOn);
  };

  const onTime = () => {
    const v = video.current;
    if (!v) return;
    const i = sceneAt(v.currentTime);
    if (i !== scene) setScene(i);
    if (v.duration) setProgress(v.currentTime / v.duration);
  };

  const onPlaying = () => {
    setWaiting(false);
    setBlocked(false);
  };

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
        src={FILM}
        poster="/intro/spark.webp"
        muted
        autoPlay
        playsInline
        preload="auto"
        disablePictureInPicture
        onTimeUpdate={onTime}
        onWaiting={() => setWaiting(true)}
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

      <button type="button" className={`intro-video-sound${soundOn && !hearing ? " is-waiting" : ""}`} onClick={toggleSound} aria-pressed={soundOn && hearing}>
        {soundOn && hearing ? <Volume2 size={15} /> : <VolumeX size={15} />} <span className="kn">ಸಂಗೀತ</span> · {!soundOn ? "MUSIC OFF" : hearing ? "MUSIC ON" : "TAP FOR MUSIC"}
      </button>
      <button type="button" className="intro-video-skip" onClick={finish}>
        <span className="kn">ನೇರವಾಗಿ ಮುಖಪುಟಕ್ಕೆ</span> · Skip to the website <ArrowRight size={15} />
      </button>
      <span className="intro-video-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
    </div>
  );
}

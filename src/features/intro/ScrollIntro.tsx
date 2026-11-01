import { useEffect, useRef, useState } from "react";
import { ArrowDown, Volume2, VolumeX } from "lucide-react";
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

export default function ScrollIntro() {
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
    const unmount = mountScrollWorld(host, { sections: SECTIONS, crossfade: 0.1, hint: "scroll to begin", onScene: (i, inView) => sound.current?.setScene(i, inView) });
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
  }, [navigate]);

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

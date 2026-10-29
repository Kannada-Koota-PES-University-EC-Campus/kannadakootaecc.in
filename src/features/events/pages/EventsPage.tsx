import { Fragment, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Link, useNavigate, useNavigationType } from "react-router-dom";
import { ArrowRight, CalendarPlus, Instagram, MapPin } from "lucide-react";
import Diya from "@/features/events/components/Diya";
import { coverOf, getPastEvents, getUpcomingEvents, imgSrcSet, imgUrl, isPosterOnly, type Event } from "@/features/events/data/events";
import { calendarLink, formatDate, igniteTo, plainClick, reducedMotion, useCountdown } from "@/features/events/lib";
import "@/features/events/events.css";

const SCROLL_KEY = "kkc-lamps-scroll";

/** ದೀಪದ ದಾರಿ · The Path of Lamps: every event the Koota has held is a lamp on the path. */
export default function Events() {
  const upcoming = getUpcomingEvents();
  const past = getPastEvents();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const pathRef = useRef<HTMLOListElement>(null);
  const [lit, setLit] = useState<Set<string>>(() => new Set(reducedMotion() ? past.map((e) => e.slug) : []));

  // a lamp lights once the visitor has scrolled to it; the light runs down the path with them
  useEffect(() => {
    const list = pathRef.current;
    if (!list) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      const vh = window.innerHeight;
      const r = list.getBoundingClientRect();
      list.style.setProperty("--progress", String(Math.min(1, Math.max(0, (vh * 0.68 - r.top) / r.height))));
      const now: string[] = [];
      list.querySelectorAll<HTMLElement>("[data-lamp]").forEach((el) => {
        if (el.getBoundingClientRect().top < vh * 0.72) now.push(el.dataset.lamp as string);
      });
      setLit((prev) => (now.every((s) => prev.has(s)) ? prev : new Set([...prev, ...now])));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // coming back from an event puts the visitor where they left the path
  useEffect(() => {
    const y = Number(sessionStorage.getItem(SCROLL_KEY));
    if (navType === "POP" && y > 0) requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
  }, [navType]);

  const open = (ev: MouseEvent, e: Event, origin: HTMLElement | null) => {
    if (!plainClick(ev)) return;
    ev.preventDefault();
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    igniteTo(origin, () => navigate(`/events/${e.slug}`));
  };

  // year markers along the path
  let lastYear = "";

  return (
    <div className="lamps-page">
      <header className="lamps-head">
        <p className="lamps-eyebrow"><span className="kn">ಕಾರ್ಯಕ್ರಮಗಳು</span>· EVENTS</p>
        <h1 className="lamps-title"><span className="kn">ದೀಪದ ದಾರಿ</span><em>The Path of Lamps</em></h1>
        <p className="lamps-intro">Every event we hold lights a lamp. Walk the path, and step into a memory.</p>
        <p className="lamps-count"><b>{past.length}</b> <span className="kn">ದೀಪಗಳು ಬೆಳಗಿವೆ</span> · lamps lit since {past.length ? past[past.length - 1].date.slice(0, 4) : "2024"}</p>
        <span className="lamps-scroll" aria-hidden="true" />
      </header>

      <NextLamp event={upcoming[0]} onOpen={open} />

      <ol className="lamps-path" ref={pathRef} aria-label="Past events, newest first">
        {past.map((e, i) => {
          const year = e.date.slice(0, 4);
          const marker = year !== lastYear;
          lastYear = year;
          return (
            <Fragment key={e.slug}>
              {marker && <li className="lamps-year" aria-hidden="true"><span>{year}</span></li>}
              <LampStop event={e} side={i % 2 ? "right" : "left"} lit={lit.has(e.slug)} index={i} onOpen={open} />
            </Fragment>
          );
        })}
      </ol>

      <footer className="lamps-foot">
        <Diya lit={false} className="lamps-foot-diya" />
        <p><span className="kn">ಇನ್ನಷ್ಟು ದೀಪಗಳು ಬರಲಿವೆ</span>More lamps are waiting to be lit.</p>
        <a href="https://www.instagram.com/kannadakoota_ecc?igsh=eGJnODZ6Njd0dTU5" target="_blank" rel="noreferrer"><Instagram size={15} /> Follow the Koota for the next one</a>
      </footer>
    </div>
  );
}

function LampStop({ event: e, side, lit, index, onOpen }: { event: Event; side: "left" | "right"; lit: boolean; index: number; onOpen: (ev: MouseEvent, e: Event, origin: HTMLElement | null) => void }) {
  const flameRef = useRef<HTMLSpanElement>(null);
  const cover = coverOf(e);
  const poster = isPosterOnly(e);
  // the warm light follows the pointer across the card
  const follow = (ev: React.PointerEvent<HTMLAnchorElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    ev.currentTarget.style.setProperty("--mx", `${((ev.clientX - r.left) / r.width) * 100}%`);
    ev.currentTarget.style.setProperty("--my", `${((ev.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <li className={`lamp-stop is-${side}${lit ? " is-lit" : ""}`} data-lamp={e.slug} style={{ "--i": index } as CSSProperties}>
      <span className="lamp-stop-diya" ref={flameRef}><Diya lit={lit} delay={(index % 5) * 0.37} /></span>
      <Link to={`/events/${e.slug}`} className="lamp-card" onClick={(ev) => onOpen(ev, e, flameRef.current)} onPointerMove={follow}>
        <span className={`lamp-card-frame${poster ? " is-poster" : ""}`}>
          {cover && poster && <img className="lamp-card-blur" src={imgUrl(cover.src, 800)} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
          {cover && <img src={imgUrl(cover.src, 800)} srcSet={imgSrcSet(cover.src)} sizes="(max-width: 760px) 86vw, 460px" alt={cover.alt ?? e.en} width={cover.w} height={cover.h} loading={index < 2 ? "eager" : "lazy"} decoding="async" />}
          <span className="lamp-card-light" aria-hidden="true" />
        </span>
        <span className="lamp-card-body">
          <span className="lamp-card-date">{formatDate(e)} <i>·</i> {e.category}</span>
          <span className="lamp-card-kn kn">{e.kn}</span>
          <span className="lamp-card-en">{e.en}</span>
          {e.venue && <span className="lamp-card-venue"><MapPin size={13} /> {e.venue}</span>}
          <span className="lamp-card-cta">ಒಳಗೆ ಬನ್ನಿ · Step in <ArrowRight size={15} /></span>
        </span>
      </Link>
    </li>
  );
}

/** the next event: an unlit lamp waiting, with a countdown */
function NextLamp({ event: e, onOpen }: { event?: Event; onOpen: (ev: MouseEvent, e: Event, origin: HTMLElement | null) => void }) {
  const left = useCountdown(e);
  const flameRef = useRef<HTMLSpanElement>(null);
  if (!e || !left) {
    return (
      <section className="lamps-next is-empty" aria-label="Next event">
        <Diya lit={false} className="lamps-next-diya" />
        <div>
          <p className="lamps-next-label"><span className="kn">ಮುಂದಿನ ದೀಪ</span>· NEXT LAMP</p>
          <p className="lamps-next-wait"><span className="kn">ಮುಂದಿನ ಹಣತೆ ಸಿದ್ಧವಾಗುತ್ತಿದೆ</span>The next lamp is being prepared. Follow us on Instagram to hear first.</p>
        </div>
      </section>
    );
  }
  const cover = coverOf(e);
  return (
    <section className="lamps-next" aria-labelledby="next-lamp-title">
      <span className="lamps-next-flame" ref={flameRef}><Diya lit={left.today} className="lamps-next-diya" /></span>
      <div className="lamps-next-copy">
        <p className="lamps-next-label"><span className="kn">ಮುಂದಿನ ದೀಪ</span>· NEXT LAMP</p>
        <h2 id="next-lamp-title"><span className="kn">{e.kn}</span><em>{e.en}</em></h2>
        <p className="lamps-next-when">{formatDate(e, true)}{e.time ? ` · ${e.time}` : ""}{e.venue ? ` · ${e.venue}` : ""}</p>
        {left.today ? (
          <p className="lamps-next-count is-today">ಇಂದು ದೀಪ ಬೆಳಗುತ್ತದೆ · The lamp is lit today</p>
        ) : (
          <p className="lamps-next-count" aria-live="polite">
            <span className="kn">ಹಣತೆ ಬೆಳಗಲು</span>
            <b>{left.days}</b><small>days</small><b>{left.hours}</b><small>hrs</small><b>{left.minutes}</b><small>min</small>
          </p>
        )}
        <div className="lamps-next-actions">
          <Link to={`/events/${e.slug}`} className="lamps-btn is-primary" onClick={(ev) => onOpen(ev, e, flameRef.current)}>See the event <ArrowRight size={15} /></Link>
          <a className="lamps-btn" href={calendarLink(e)} target="_blank" rel="noreferrer"><CalendarPlus size={15} /> Remind me</a>
        </div>
      </div>
      {cover && <img className="lamps-next-art" src={imgUrl(cover.src, 800)} srcSet={imgSrcSet(cover.src)} sizes="(max-width: 760px) 90vw, 420px" alt={cover.alt ?? e.en} />}
    </section>
  );
}

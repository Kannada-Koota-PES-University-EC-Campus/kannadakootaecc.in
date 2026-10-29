import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, CalendarPlus, Clock, MapPin, Share2 } from "lucide-react";
import Diya from "@/features/events/components/Diya";
import Lightbox from "@/features/events/components/Lightbox";
import { coverOf, eventsByDate, findEvent, imgSrcSet, imgUrl, isPosterOnly, isUpcoming, type Event, type EventImage } from "@/features/events/data/events";
import { calendarLink, formatDate, graphemes, igniteTo, plainClick, reducedMotion, titleWords, useCountdown } from "@/features/events/lib";
import "@/features/events/events.css";

const TILT = [-2.4, 1.7, -1.2, 2.6, -1.9, 1.1, -2.8, 2.1];

/** how many aksharas come before word wi, so the reveal runs left to right across the whole title */
const wordStart = (text: string, wi: number) =>
  titleWords(text).slice(0, wi).reduce((n, w) => n + (typeof w === "string" ? 0 : w.length), 0);

/** One event's own page: /events/<slug> */
export default function EventDetail() {
  const { slug = "" } = useParams();
  const event = findEvent(slug);
  if (!event) return <EventNotFound />;
  // old ids and other spellings (e.g. /events/kalataranga) move to the one true address
  if (event.slug !== slug) return <Navigate to={`/events/${event.slug}`} replace />;
  return <EventView key={event.slug} event={event} />;
}

function EventView({ event: e }: { event: Event }) {
  const navigate = useNavigate();
  const [viewing, setViewing] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const cover = coverOf(e);
  const posterOnly = isPosterOnly(e);
  const upcoming = isUpcoming(e);
  const left = useCountdown(upcoming ? e : undefined);
  const all: EventImage[] = [...e.photos, ...e.posters];
  const order = eventsByDate();
  const at = order.findIndex((x) => x.slug === e.slug);
  const newer = at > 0 ? order[at - 1] : undefined;
  const older = at < order.length - 1 ? order[at + 1] : undefined;

  usePageMeta(e);
  useDevelop();

  const open = (ev: MouseEvent, target: Event, origin: HTMLElement | null) => {
    if (!plainClick(ev)) return;
    ev.preventDefault();
    igniteTo(origin, () => navigate(`/events/${target.slug}`));
  };

  const share = async () => {
    const url = `${window.location.origin}/events/${e.slug}`;
    if (navigator.share) {
      await navigator.share({ title: `${e.en} · Kannada Koota`, text: e.story[0], url }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <article className="ev-page">
      {/* the hero: the light of the lamp settles into the event's picture */}
      <header className={`ev-hero${posterOnly ? " is-poster" : ""}`}>
        {cover && (posterOnly ? (
          <>
            <img className="ev-hero-blur" src={imgUrl(cover.src, 800)} alt="" aria-hidden="true" />
            <button className="ev-hero-poster" onClick={() => setViewing(e.photos.length)} aria-label="View the poster">
              <img src={imgUrl(cover.src, 1600)} srcSet={imgSrcSet(cover.src)} sizes="(max-width: 760px) 78vw, 34vw" alt={cover.alt ?? e.en} width={cover.w} height={cover.h} {...{ fetchpriority: "high" }} />
            </button>
          </>
        ) : (
          <img className="ev-hero-photo" src={imgUrl(cover.src, 1600)} srcSet={imgSrcSet(cover.src)} sizes="100vw" alt={cover.alt ?? e.en} width={cover.w} height={cover.h} {...{ fetchpriority: "high" }} />
        ))}
        <span className="ev-hero-shade" aria-hidden="true" />
        <div className="ev-hero-copy">
          <Link to="/events" className="ev-back"><ArrowLeft size={15} /> ದೀಪದ ದಾರಿ · All events</Link>
          <p className="ev-chip">{e.category}{upcoming ? " · Upcoming" : ""}</p>
          <h1 className="ev-title">
            <span className="kn ev-title-kn" aria-label={e.kn}>
              {titleWords(e.kn).map((w, wi) => typeof w === "string"
                ? <span key={wi} aria-hidden="true"> </span>
                : <span key={wi} className="ev-word" aria-hidden="true">{w.map((g, i) => <span key={i} style={{ "--d": `${0.25 + (wordStart(e.kn, wi) + i) * 0.05}s` } as CSSProperties}>{g}</span>)}</span>)}
            </span>
            <em className="ev-title-en">{e.en}</em>
          </h1>
          <ul className="ev-ticket" aria-label="When and where">
            <li><CalendarDays size={15} /> {formatDate(e, true)}</li>
            {e.time && <li><Clock size={15} /> {e.time}</li>}
            {e.venue && <li><MapPin size={15} /> {e.venue}</li>}
          </ul>
          {upcoming && left && (
            <div className="ev-upcoming">
              <p className="ev-count">{left.today ? "ಇಂದು · Today" : <><b>{left.days}</b> days <b>{left.hours}</b> hrs <b>{left.minutes}</b> min to go</>}</p>
              <div className="ev-actions">
                {e.registerLink && <a className="lamps-btn is-primary" href={e.registerLink} target="_blank" rel="noreferrer">Register <ArrowRight size={15} /></a>}
                <a className="lamps-btn" href={calendarLink(e)} target="_blank" rel="noreferrer"><CalendarPlus size={15} /> Remind me</a>
              </div>
            </div>
          )}
          <button className="ev-share" onClick={share}><Share2 size={15} /> {copied ? "Link copied" : "Share this event"}</button>
        </div>
        <span className="ev-hero-cue" aria-hidden="true" />
      </header>

      <section className="ev-story" aria-label="About the event">
        <span className="ev-story-mark kn" aria-hidden="true">{graphemes(e.kn)[0]}</span>
        <div className="ev-story-copy">
          {e.story.map((p, i) => <p key={i} className={i === 0 ? "is-lead" : ""}>{p}</p>)}
        </div>
      </section>

      {e.photos.length > 0 && (
        <section className="ev-memories" aria-labelledby="memories-title">
          <h2 id="memories-title" className="ev-section-title"><span className="kn">ನೆನಪಿನ ಚಿತ್ರಗಳು</span><em>Memories from the day</em></h2>
          <div className="ev-table">
            {e.photos.map((p, i) => (
              <button key={p.src} className="ev-print" data-develop style={{ "--tilt": `${TILT[i % TILT.length]}deg`, "--delay": `${(i % 3) * 0.15}s` } as CSSProperties} onClick={() => setViewing(i)} aria-label={`Open photo: ${p.alt ?? e.en}`}>
                <img src={imgUrl(p.src, 800)} srcSet={imgSrcSet(p.src)} sizes="(max-width: 760px) 90vw, 30vw" alt={p.alt ?? ""} width={p.w} height={p.h} loading="lazy" decoding="async" />
                {p.alt && <span className="ev-print-note">{p.alt}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {e.posters.length > 0 && !(posterOnly && e.posters.length === 1) && (
        <section className="ev-invites" aria-labelledby="invite-title">
          <h2 id="invite-title" className="ev-section-title"><span className="kn">ಆಹ್ವಾನ</span><em>The invitation{e.posters.length > 1 ? "s" : ""}</em></h2>
          <div className="ev-invite-row">
            {e.posters.map((p, i) => (
              <button key={p.src} className="ev-frame" data-develop onClick={() => setViewing(e.photos.length + i)} aria-label={`Open poster: ${p.alt ?? e.en}`}>
                <img src={imgUrl(p.src, 800)} srcSet={imgSrcSet(p.src)} sizes="(max-width: 760px) 80vw, 26vw" alt={p.alt ?? ""} width={p.w} height={p.h} loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        </section>
      )}

      {e.reviews && e.reviews.length > 0 && (
        <section className="ev-voices" aria-labelledby="voices-title">
          <h2 id="voices-title" className="ev-section-title"><span className="kn">ಪ್ರೇಕ್ಷಕರ ಮಾತು</span><em>What people said</em></h2>
          <div className="ev-board">
            {e.reviews.map((r, i) => (
              <figure key={i} className="ev-note" data-develop style={{ "--tilt": `${TILT[(i + 3) % TILT.length] * 0.7}deg` } as CSSProperties}>
                <blockquote><p>{r.quote}</p></blockquote>
                <figcaption>— {r.name}{r.role ? `, ${r.role}` : ""}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {e.video && (
        <section className="ev-film" aria-label="Highlights video">
          <video src={e.video} controls playsInline preload="metadata" poster={cover ? imgUrl(cover.src, 1600) : undefined} />
        </section>
      )}

      <nav className="ev-more" aria-label="More events">
        {newer && <MoreLamp e={newer} label="ಇತ್ತೀಚಿನ ದೀಪ · Newer" dir="newer" onOpen={open} />}
        {older && <MoreLamp e={older} label="ಹಿಂದಿನ ದೀಪ · Earlier" dir="older" onOpen={open} />}
      </nav>

      {viewing !== null && all.length > 0 && <Lightbox images={all} index={Math.min(viewing, all.length - 1)} onIndex={setViewing} onClose={() => setViewing(null)} />}
    </article>
  );
}

function MoreLamp({ e, label, dir, onOpen }: { e: Event; label: string; dir: "newer" | "older"; onOpen: (ev: MouseEvent, e: Event, origin: HTMLElement | null) => void }) {
  const flame = useRef<HTMLSpanElement>(null);
  const cover = coverOf(e);
  return (
    <Link to={`/events/${e.slug}`} className={`ev-more-lamp is-${dir}`} onClick={(ev) => onOpen(ev, e, flame.current)}>
      {cover && <img src={imgUrl(cover.src, 800)} alt="" loading="lazy" decoding="async" />}
      <span className="ev-more-shade" aria-hidden="true" />
      <span className="ev-more-diya" ref={flame}><Diya lit={false} /></span>
      <span className="ev-more-copy">
        <small><span className="kn">{label.split(" · ")[0]}</span>· {label.split(" · ")[1]}</small>
        <b className="kn">{e.kn}</b>
        <span>{e.en} {dir === "older" ? <ArrowRight size={16} /> : null}</span>
      </span>
    </Link>
  );
}

function EventNotFound() {
  return (
    <div className="ev-missing">
      <Diya lit={false} />
      <h1><span className="kn">ಈ ದೀಪ ಸಿಗಲಿಲ್ಲ</span><em>We could not find this event.</em></h1>
      <Link to="/events" className="lamps-btn is-primary"><ArrowLeft size={15} /> Back to the Path of Lamps</Link>
    </div>
  );
}

/** title and description for the tab and for apps that read them after load */
function usePageMeta(e: Event) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${e.en} · Kannada Koota EC PES`;
    const desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = desc?.content;
    if (desc) desc.content = e.story[0] ?? e.en;
    return () => {
      document.title = prev;
      if (desc && prevDesc !== undefined) desc.content = prevDesc;
    };
  }, [e]);
}

/** prints, posters and notes "develop" (fade up from blank like instant film) as they come into view */
function useDevelop() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-develop]");
    if (reducedMotion() || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-developed"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-developed");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

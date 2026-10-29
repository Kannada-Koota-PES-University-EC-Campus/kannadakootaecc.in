import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Play } from "lucide-react";
import "@/features/blogs/journal.css";

/**
 * ದಿನಚರಿ · Journal, as a ತೊಗಲು ಗೊಂಬೆಯಾಟ (leather-puppet shadow theatre):
 * stories wait on a lamp-lit cloth screen as shadows and come alive in colour when played.
 * Videos and cover frames live in public/media/journal/.
 */
type Story = { n: string; kn: string; en: string; line: string; src: string; poster: string; length: string; event?: string };

const STORIES: Story[] = [
  { n: "೧", kn: "ಯಕ್ಷಗಾನ · ಉತ್ಸವ 2K25", en: "Yakshagana at Utsava 2K25", line: "Crown, colour and thunder on the Utsava stage.", src: "/media/journal/1.mp4", poster: "/media/journal/1.webp", length: "0:06", event: "rajyotsava-2025" },
  { n: "೨", kn: "ವೇದಿಕೆಯ ಮೇಲೆ ನೃತ್ಯ", en: "Dance on the stage", line: "Classical dance under the stage lights.", src: "/media/journal/2.mp4", poster: "/media/journal/2.webp", length: "0:07" },
  { n: "೩", kn: "ತೆರೆಯ ಹಿಂದೆ", en: "Behind the scenes", line: "At the sound desk, where every show really begins.", src: "/media/journal/3.mp4", poster: "/media/journal/3.webp", length: "0:05" },
];

const PUPPET_TONES = ["is-red", "is-ochre", "is-teal"];

export default function Blogs() {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sweep, setSweep] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const story = STORIES[current];

  // choosing another story: a shadow passes across the screen, the new one waits as a shadow
  const choose = (i: number) => {
    if (i === current) return;
    video.current?.pause();
    setPlaying(false);
    setSweep((s) => s + 1);
    window.setTimeout(() => setCurrent(i), 260);
  };

  const play = () => {
    setPlaying(true);
    requestAnimationFrame(() => video.current?.play().catch(() => setPlaying(false)));
  };

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const done = () => setPlaying(false);
    v.addEventListener("ended", done);
    return () => v.removeEventListener("ended", done);
  }, [current]);

  return (
    <div className="journal">
      <header className="journal-head">
        <p className="journal-eyebrow"><span className="kn">ದಿನಚರಿ</span>· JOURNAL</p>
        <h1 className="journal-title"><span className="kn">ನೆರಳು–ಬೆಳಕಿನ ಕಥೆಗಳು</span><em>Stories in Shadow &amp; Light</em></h1>
        <p className="journal-intro">
          Like Karnataka&rsquo;s <span className="kn">ತೊಗಲು ಗೊಂಬೆಯಾಟ</span>, the leather-puppet theatre, our stories wait on a lamp-lit screen. Pick one, and watch it come alive.
        </p>
      </header>

      <section className="theatre" aria-label="Now showing">
        <Toran />
        <div className={`theatre-screen${playing ? " is-playing" : ""}`}>
          <span key={sweep} className={`theatre-sweep${sweep ? " is-on" : ""}`} aria-hidden="true" />
          <img key={`p${current}`} className="theatre-shadow" src={story.poster} alt="" aria-hidden="true" />
          <video
            key={`v${current}`}
            ref={video}
            className="theatre-video"
            src={story.src}
            poster={story.poster}
            playsInline
            controls={playing}
            preload="metadata"
            aria-label={story.en}
          />
          {!playing && (
            <div className="theatre-title">
              <p className="kn">{story.kn}</p>
              <p className="theatre-title-en">{story.en}</p>
              <button className="theatre-play" onClick={play} aria-label={`Play: ${story.en}`}>
                <span className="theatre-play-flame" aria-hidden="true" /><Play size={22} fill="currentColor" />
              </button>
            </div>
          )}
          <span className="theatre-lamp" aria-hidden="true" />
        </div>
        <div className="theatre-caption">
          <p><span className="kn">ಈಗ ತೆರೆಯ ಮೇಲೆ</span> · Now on the screen: <b>{story.en}</b> <i>{story.length}</i></p>
          {story.event && <Link to={`/events/${story.event}`}>See the event <ArrowUpRight size={14} /></Link>}
        </div>
      </section>

      <section className="puppets" aria-label="All stories">
        {STORIES.map((s, i) => (
          <button key={s.src} className={`puppet ${PUPPET_TONES[i % PUPPET_TONES.length]}${i === current ? " is-current" : ""}`} onClick={() => choose(i)} aria-pressed={i === current} style={{ "--sway": `${(i % 2 ? 1 : -1) * 2.5}deg` } as React.CSSProperties}>
            <span className="puppet-body">
              <span className="puppet-num kn">{s.n}</span>
              <img src={s.poster} alt="" loading="lazy" decoding="async" />
              <span className="puppet-kn kn">{s.kn}</span>
              <span className="puppet-en">{s.en}</span>
              <span className="puppet-line">{s.line}</span>
            </span>
            <span className="puppet-rod" aria-hidden="true" />
          </button>
        ))}
      </section>

      <p className="journal-foot"><span className="kn">ಇನ್ನಷ್ಟು ಕಥೆಗಳು ಬರಲಿವೆ</span> · More stories are on their way.</p>
    </div>
  );
}

/** a string of mango leaves (ತೋರಣ) hung across the top of the stage */
function Toran() {
  const leaves = Array.from({ length: 23 }, (_, i) => i);
  return (
    <svg className="toran" viewBox="0 0 1150 90" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 8 Q575 34 1150 8" stroke="#8a5a1c" strokeWidth="3" fill="none" />
      {leaves.map((i) => {
        const x = 25 + i * 50;
        const y = 8 + 26 * (1 - Math.pow((x - 575) / 575, 2));
        return (
          <g key={i} transform={`translate(${x} ${y})`} className="toran-leaf" style={{ animationDelay: `${(i % 6) * 0.4}s` }}>
            <path d="M0 0 C 13 16 13 44 0 62 C -13 44 -13 16 0 0 Z" fill={i % 2 ? "#3f6b2a" : "#5a8a34"} />
            <path d="M0 4 L0 56" stroke="#2c4a1c" strokeWidth="1.2" />
            {i % 4 === 0 && <circle cy="68" r="6" fill="#f0a640" />}
          </g>
        );
      })}
    </svg>
  );
}

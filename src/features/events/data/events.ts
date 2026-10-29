/**
 * Every Kannada Koota event. Each one gets its own page at /events/<slug>.
 *
 * Images live in public/media/events/<slug>/ as <name>-800.webp and <name>-1600.webp
 * (see imgSrcSet); `src` below is the path without the "-800.webp" part.
 * - photos:  pictures from the day, shown on the "light table"
 * - posters: invitations / creatives, shown framed as "the invitation"
 * - reviews: what people said (add as they come in)
 *
 * Upcoming events: date >= today. Past events: date < today.
 */

export interface EventImage {
  src: string;
  w: number;
  h: number;
  alt?: string;
}

export interface EventReview {
  quote: string;
  name: string;
  role?: string;
}

export interface Event {
  /** used in the address: /events/<slug> */
  slug: string;
  /** other addresses that should open this event (old ids, other spellings) */
  aliases?: string[];
  kn: string;
  en: string;
  date: string; // ISO date (YYYY-MM-DD)
  time?: string;
  venue?: string;
  category: "Festival" | "Dance" | "Workshop" | "Community" | "Competition" | "Club";
  story: string[];
  photos: EventImage[];
  posters: EventImage[];
  reviews?: EventReview[];
  video?: string;
  registerLink?: string;
}

const img = (slug: string, name: string, w: number, h: number, alt?: string): EventImage => ({ src: `/media/events/${slug}/${name}`, w, h, alt });

export const events: Event[] = [
  {
    slug: "rajyotsava-2025",
    aliases: ["1", "utsava-2025", "utsava-2k25"],
    kn: "ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ · ಉತ್ಸವ 2K25",
    en: "Kannada Rajyotsava · Utsava 2K25",
    date: "2025-11-07",
    venue: "MRD Auditorium, PES University EC",
    category: "Festival",
    story: [
      "Karnataka Formation Day, celebrated the Kannada Koota way: a rich showcase of cultural performances, authentic traditional food and a campus that came together as one.",
      "Utsava 2K25 brought Yakshagana to the stage, in full costume and colour.",
    ],
    photos: [
      img("rajyotsava-2025", "video-poster", 1600, 898, "Yakshagana performer on the Utsava 2K25 stage"),
      img("rajyotsava-2025", "yakshagana-2k25", 1153, 1600, "Yakshagana performer in full costume at Utsava 2K25"),
    ],
    posters: [
      img("rajyotsava-2025", "2025", 1179, 916, "Utsava 2K25 invitation"),
      img("rajyotsava-2025", "untitled-1-18", 1600, 2473, "Utsava 2K25 poster"),
      img("rajyotsava-2025", "202k-1", 1210, 683, "Utsava 2K25 banner"),
    ],
  },
  {
    slug: "rajyotsava-2024",
    aliases: ["2", "utsava-2024", "utsava-2k24"],
    kn: "ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ · ಉತ್ಸವ 2K24",
    en: "Kannada Rajyotsava · Utsava 2K24",
    date: "2024-11-01",
    venue: "MRD Auditorium, PES University EC",
    category: "Festival",
    story: [
      "A grand celebration of Karnataka Formation Day with cultural performances, traditional food and the whole community gathered together.",
    ],
    photos: [],
    posters: [
      img("rajyotsava-2024", "2024", 1179, 638, "Utsava 2K24 banner"),
      img("rajyotsava-2024", "bk2", 548, 305, "Past event memories"),
      img("rajyotsava-2024", "bk1", 549, 308, "Social buzz around the celebration"),
      img("rajyotsava-2024", "bk3", 546, 307, "Kannada Koota social impact"),
    ],
  },
  {
    slug: "kannada-koota-x-rotaract",
    aliases: ["3", "rotaract"],
    kn: "ಕನ್ನಡ ಕೂಟ × ರೋಟರಾಕ್ಟ್",
    en: "Kannada Koota × Rotaract",
    date: "2025-09-03",
    venue: "Seminar Hall 2",
    category: "Workshop",
    story: [
      "From “Kannada Gothilla” to “Kannada Gothidhe”: a session with Rotaract to learn Kannada in a fun, engaging way, through games, drama and interactive activities.",
    ],
    photos: [
      img("kannada-koota-x-rotaract", "kkec-x-rt-4", 1600, 1067, "The audience lights up the hall with their phones"),
      img("kannada-koota-x-rotaract", "img_1863", 1600, 1067, "The session begins: From Kannada Gothilla to Kannada Gothidhe"),
      img("kannada-koota-x-rotaract", "img_1978", 1600, 1067, "Hosts on stage in Seminar Hall 2"),
      img("kannada-koota-x-rotaract", "kkec-x-rt-1", 1600, 1192, "Speaking on stage in front of the session slide"),
      img("kannada-koota-x-rotaract", "kkec-x-rt-2", 1600, 938, "The closing slide"),
      img("kannada-koota-x-rotaract", "kkec-x-rt-3", 1600, 1067, "Presenting a plant on stage"),
    ],
    posters: [],
  },
  {
    slug: "quadrangle-dance",
    aliases: ["4"],
    kn: "ಕ್ವಾಡ್ರ್ಯಾಂಗಲ್ ನೃತ್ಯ",
    en: "Quadrangle Dance",
    date: "2025-09-10",
    venue: "Quadrangle, PES EC",
    category: "Dance",
    story: [
      "A lively dance in the quadrangle to welcome the new students, and to show them the rich Kannada culture they had just joined.",
    ],
    photos: [
      img("quadrangle-dance", "kkec-dc-3", 1024, 767, "Dancers mid-step in the quadrangle"),
      img("quadrangle-dance", "kkec-dc-1", 1600, 1061, "The dance team after the performance"),
      img("quadrangle-dance", "kkec-dc-2", 1600, 988, "The whole crew together"),
      img("quadrangle-dance", "kkec-dc-5", 1361, 757, "The quadrangle packed with students watching"),
    ],
    posters: [],
  },
  {
    slug: "hosa-chiguru-2026",
    aliases: ["club-head", "new-crew-2026"],
    kn: "ಹೊಸ ಚಿಗುರು",
    en: "New Crew for 2026",
    date: "2026-02-04",
    category: "Club",
    story: [
      "A new leadership structure for the club. As we push the boundaries of cultural and community engagement, we welcome a fresh board of Heads and Domain Heads.",
    ],
    photos: [],
    posters: [img("hosa-chiguru-2026", "club-head", 904, 1280, "Hosa Chiguru announcement")],
  },
  {
    slug: "mahashivratri-nritya",
    aliases: ["mahashivratri-dance"],
    kn: "ಮಹಾ ಶಿವರಾತ್ರಿ ನೃತ್ಯ ಪ್ರದರ್ಶನ",
    en: "Mahashivratri Dance Performance",
    date: "2026-02-13",
    category: "Dance",
    story: [
      "From silence to resonance, from resonance to rhythm, from rhythm to dance, from dance to devotion: a special dance performance for Mahashivratri.",
    ],
    photos: [img("mahashivratri-nritya", "mahashivratri-dance1", 1080, 908, "Dancers mid-performance for Mahashivratri")],
    posters: [img("mahashivratri-nritya", "mahashivratri-dance2", 900, 1600, "Mahashivratri performance poster")],
  },
  {
    slug: "raktha-spandana",
    aliases: ["blood-donation"],
    kn: "ರಕ್ತ ಸ್ಪಂದನ",
    en: "Raktha Spandana · Blood Donation Camp",
    date: "2026-03-17",
    category: "Community",
    story: [
      "A drop of blood can save a life. Kannada Koota organised a blood donation camp, because blood donation is the noblest of all donations.",
    ],
    photos: [],
    posters: [img("raktha-spandana", "blood-donation", 1131, 1600, "Raktha Spandana poster")],
  },
  {
    slug: "kalantaranga",
    aliases: ["Kalantaranga", "kalataranga"],
    kn: "ಕಲಾಂತರಂಗ",
    en: "Kalantaranga",
    date: "2026-04-08",
    time: "2:30 PM – 4:30 PM",
    venue: "Seminar Hall 2",
    category: "Competition",
    story: [
      "A wave of art, a celebration of your talent. This is your moment to shine.",
      "Before the art within you fades, let it surge into a flowing stream. Come, make this stage yours. Prize pool: ₹3000.",
    ],
    photos: [],
    posters: [img("kalantaranga", "kalantaranga1", 1600, 900, "Kalantaranga poster")],
  },
  {
    slug: "nritya-lahari",
    aliases: ["Nritya_Lahari"],
    kn: "ನೃತ್ಯ ಲಹರಿ",
    en: "Nritya Lahari",
    date: "2026-08-19",
    time: "10:00 AM",
    venue: "Quadrangle, PES EC Campus",
    category: "Dance",
    story: [
      "The rhythm of Kannada in every step. Dance is not merely about steps; it is emotion, rhythm, grace and celebration.",
      "The essence of Kannada, the colours of our culture and the spirit of dance, all coming alive on a single stage.",
    ],
    photos: [],
    posters: [img("nritya-lahari", "nritya_lahari", 1600, 1050, "Nritya Lahari artwork")],
  },
];

/* ---------- helpers ---------- */

export const imgSrcSet = (src: string) => `${src}-800.webp 800w, ${src}-1600.webp 1600w`;
export const imgUrl = (src: string, w: 800 | 1600 = 1600) => `${src}-${w}.webp`;

/** the picture that represents the event: its best photo, else its first poster */
export const coverOf = (e: Event): EventImage | undefined => e.photos[0] ?? e.posters[0];
/** true when the event only has a poster (shown framed instead of cropped full-bleed) */
export const isPosterOnly = (e: Event) => e.photos.length === 0;

const startOfDay = (iso: string) => new Date(`${iso}T00:00:00`);
const today = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

export const isUpcoming = (e: Event) => startOfDay(e.date) >= today();
export const eventDate = (e: Event) => startOfDay(e.date);

export const getUpcomingEvents = () =>
  events.filter(isUpcoming).sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime());

export const getPastEvents = () =>
  events.filter((e) => !isUpcoming(e)).sort((a, b) => eventDate(b).getTime() - eventDate(a).getTime());

/** finds an event by its address, an alias (old ids, other spellings) or any letter case */
export const findEvent = (key: string) => {
  const k = decodeURIComponent(key).toLowerCase();
  return events.find((e) => e.slug === k || e.aliases?.some((a) => a.toLowerCase() === k));
};

/** newest first: the order of the Path of Lamps */
export const eventsByDate = () => [...events].sort((a, b) => eventDate(b).getTime() - eventDate(a).getTime());

import { useEffect, useState, type MouseEvent } from "react";
import type { Event } from "@/features/events/data/events";
import { eventDate } from "@/features/events/data/events";

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const formatDate = (e: Event, withDay = false) =>
  eventDate(e).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", ...(withDay ? { weekday: "long" } : {}) });

/** days / hours / minutes until the event starts (ticks every 30 s) */
export function useCountdown(e: Event | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!e) return;
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, [e]);
  if (!e) return null;
  const ms = Math.max(0, eventDate(e).getTime() - now);
  return { days: Math.floor(ms / 86_400_000), hours: Math.floor(ms / 3_600_000) % 24, minutes: Math.floor(ms / 60_000) % 60, today: ms === 0 };
}

const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

export function calendarLink(e: Event) {
  const start = eventDate(e);
  const end = new Date(start.getTime() + 86_400_000);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${e.en} · Kannada Koota`,
    dates: `${ymd(start)}/${ymd(end)}`,
    details: `${e.story[0] ?? ""}\n\n${window.location.origin}/events/${e.slug}`,
    location: e.venue ?? "PES University, Electronic City",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/**
 * Letters as people see them. A Kannada akshara stays one piece, including conjuncts:
 * ತ್ಯ, ನ್ನ, ಕ್ಟ್ are several "graphemes" to the computer but must be drawn together,
 * so a piece that ends in the virama (್) or a joiner is glued to the next one.
 */
export function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  const parts = Seg ? Array.from(new Seg("kn", { granularity: "grapheme" }).segment(text), (s) => s.segment) : Array.from(text);
  const out: string[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (last && /[\u0CCD\u200C\u200D]$/.test(last) && p.trim()) out[out.length - 1] = last + p;
    else if (last && /^[\u0C80-\u0CFF]/.test(last) && /^[\u0CBC-\u0CD6\u0C81-\u0C83\u0CE2\u0CE3]/.test(p)) out[out.length - 1] = last + p; // stray vowel signs
    else out.push(p);
  }
  return out;
}

/** words of a title, each split into aksharas (words never break across lines) */
export const titleWords = (text: string) => text.split(/(\s+)/).filter(Boolean).map((w) => (/^\s+$/.test(w) ? w : graphemes(w)));

/**
 * The lamp's flame swells to fill the screen, the event page is shown underneath,
 * then the light fades away and leaves the event's photo. Falls back to plain
 * navigation when motion is reduced.
 */
export function igniteTo(origin: HTMLElement | null, go: () => void) {
  if (!origin || reducedMotion() || !("animate" in document.body)) {
    go();
    return;
  }
  const r = origin.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 40;
  const veil = document.createElement("div");
  veil.className = "ignite-veil";
  veil.style.setProperty("--x", `${x}px`);
  veil.style.setProperty("--y", `${y}px`);
  document.body.appendChild(veil);
  const grow = veil.animate(
    [{ clipPath: `circle(6px at ${x}px ${y}px)`, opacity: 0.9 }, { clipPath: `circle(${radius}px at ${x}px ${y}px)`, opacity: 1 }],
    { duration: 620, easing: "cubic-bezier(.6,0,.25,1)", fill: "forwards" },
  );
  grow.finished.then(() => {
    go();
    requestAnimationFrame(() => {
      veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 760, delay: 90, easing: "ease-out", fill: "forwards" }).finished.then(() => veil.remove());
    });
  });
}

/** an ordinary click (not ctrl/cmd/middle-click) that we can turn into the lamp transition */
export const plainClick = (ev: MouseEvent) => ev.button === 0 && !ev.metaKey && !ev.ctrlKey && !ev.shiftKey && !ev.altKey;

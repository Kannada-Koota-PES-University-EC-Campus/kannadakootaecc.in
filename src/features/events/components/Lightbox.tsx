import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { imgUrl, type EventImage } from "@/features/events/data/events";

/** Full-screen photo viewer: arrows / swipe / keyboard, Esc to close. */
export default function Lightbox({ images, index, onIndex, onClose }: { images: EventImage[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);
  const go = useCallback((d: number) => onIndex((index + d + images.length) % images.length), [index, images.length, onIndex]);

  // while open: page does not scroll, focus sits on Close and goes back to the photo afterwards
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [go, onClose]);

  const img = images[index];
  return createPortal(
    <div className="ev-lightbox" role="dialog" aria-modal="true" aria-label={img.alt ?? "Photo"} onClick={() => { if (swiped.current) swiped.current = false; else onClose(); }}
      onPointerDown={(e) => { startX.current = e.clientX; }}
      onPointerCancel={() => { startX.current = null; }}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 50) { swiped.current = true; go(dx < 0 ? 1 : -1); }
      }}>
      <figure onClick={(e) => { if (!swiped.current) e.stopPropagation(); }}>
        <img key={img.src} src={imgUrl(img.src, 1600)} alt={img.alt ?? ""} width={img.w} height={img.h} draggable={false} />
        <figcaption><span>{img.alt}</span><span>{index + 1} / {images.length}</span></figcaption>
      </figure>
      <button ref={closeRef} className="ev-lightbox-close" onClick={onClose} aria-label="Close"><X /></button>
      {images.length > 1 && <>
        <button className="ev-lightbox-nav is-prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous photo"><ChevronLeft /></button>
        <button className="ev-lightbox-nav is-next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next photo"><ChevronRight /></button>
      </>}
    </div>,
    document.body,
  );
}

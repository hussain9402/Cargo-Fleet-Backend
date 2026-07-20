"use client";

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';

/** Reveal on enter, then gently track scroll while in view. */
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [entered, setEntered] = useState(false);
  const [nudge, setNudge] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShown(true);
      },
      { threshold: 0.14, rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(() => setEntered(true), 700 + delay);
    return () => window.clearTimeout(t);
  }, [shown, delay]);

  useEffect(() => {
    if (!entered) return;
    let raf = 0;
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const viewMid = window.innerHeight / 2;
      const delta = (mid - viewMid) / window.innerHeight;
      setNudge(Math.max(-22, Math.min(22, delta * 28)));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [entered]);

  const y = shown ? (entered ? nudge : 0) : 36;

  const style: CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: `translate3d(0, ${y}px, 0)`,
    transition: entered
      ? 'none'
      : `opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
    willChange: 'opacity, transform',
  };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/** Soft parallax tied to page scroll — use on hero layers. */
export function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return y;
}

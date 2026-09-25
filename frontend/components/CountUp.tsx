"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up from 0 to `value` over `duration` ms.
 * Pass `null` while the real value is still loading — it renders "—" and
 * skips animating until a real number arrives.
 */
export function CountUp({
  value,
  duration = 700,
  formatter,
}: {
  value: number | null;
  duration?: number;
  formatter?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) return;

    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic — starts fast, settles gently
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value! - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value!);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  if (value === null) return <>—</>;

  const rounded = Math.round(display);
  return <>{formatter ? formatter(rounded) : rounded}</>;
}

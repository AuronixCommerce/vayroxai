"use client";

import { useEffect, useId, useRef } from "react";
import type { HariumModelId } from "@/lib/harium-models";

const profiles: Record<HariumModelId, { color: number[]; amplitude: number; spread: number }> = {
  swift: { color: [190, 218, 172], amplitude: 1, spread: 1 },
  code: { color: [185, 174, 230], amplitude: .72, spread: .85 },
  research: { color: [145, 193, 226], amplitude: .88, spread: 1.15 },
  studio: { color: [228, 186, 142], amplitude: 1.2, spread: .95 },
  think: { color: [140, 207, 194], amplitude: 1.05, spread: 1.1 },
};

/** An open field of light: one continuous scene, including across mode changes. */
export default function IntelligenceScene({ model }: { model: HariumModelId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef(model);
  const wakeRef = useRef<(() => void) | null>(null);
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    modelRef.current = model;
    wakeRef.current?.();
  }, [model]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(pointer: coarse)").matches;
    const strands = mobile ? 26 : 34;
    const initial = profiles[modelRef.current];
    let color = [...initial.color];
    let amplitude = initial.amplitude;
    let spread = initial.spread;
    let frame = 0;
    let previous = 0;
    let time = 0;
    let width = 1;
    let height = 1;
    let visible = true;
    let disposed = false;
    let lightTheme = document.documentElement.dataset.theme === "light";

    function schedule() {
      if (!frame && !disposed && visible && !document.hidden) {
        frame = requestAnimationFrame(draw);
      }
    }

    function resize() {
      const bounds = canvas!.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.max(1, Math.round(width * ratio));
      canvas!.height = Math.max(1, Math.round(height * ratio));
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
      schedule();
    }

    function point(u: number, lane: number) {
      const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 1.25);
      const wave = Math.sin(u * Math.PI * 2 - .55 + time * .16 + lane * .8);
      const detail = Math.sin(u * Math.PI * 4 + time * .09 + lane * 1.3);
      return {
        x: width * (.035 + u * .93),
        y: height * (.5 + lane * .33 * spread + envelope *
          (wave * .16 * amplitude + detail * .025 + lane * Math.cos(u * Math.PI * 2 + time * .13) * .13)),
      };
    }

    function draw(now: number) {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      if (!reduced.matches && previous && now - previous < (mobile ? 40 : 25)) {
        schedule();
        return;
      }
      const elapsed = previous ? Math.min(now - previous, 80) : 30;
      previous = now;
      if (!reduced.matches) time += elapsed * .001;
      const target = profiles[modelRef.current];
      const blend = reduced.matches ? 1 : 1 - Math.exp(-elapsed / 360);
      color = color.map((value, i) => value + (target.color[i] - value) * blend);
      amplitude += (target.amplitude - amplitude) * blend;
      spread += (target.spread - spread) * blend;
      const rgb = color.map(value => Math.round(lightTheme ? value * .52 : value)).join(",");
      context!.clearRect(0, 0, width, height);
      if (!width || !height) return;

      // A faint Cartesian field gives the open strands structure without an object or orb.
      context!.fillStyle = lightTheme ? "rgba(50,75,60,.12)" : "rgba(175,201,177,.11)";
      for (let x = width * .1; x < width * .95; x += width / 12) {
        for (let y = height * .19; y < height * .83; y += height / 10) {
          context!.fillRect(x, y, .8, .8);
        }
      }

      for (let i = 0; i < strands; i++) {
        const lane = i / (strands - 1) - .5;
        const center = 1 - Math.abs(lane * 2);
        const glow = context!.createLinearGradient(0, 0, width, 0);
        glow.addColorStop(0, `rgba(${rgb},0)`);
        glow.addColorStop(.2, `rgba(${rgb},${.1 + center * .12})`);
        glow.addColorStop(.52, `rgba(${rgb},${.28 + center * .35})`);
        glow.addColorStop(.84, `rgba(${rgb},${.12 + center * .15})`);
        glow.addColorStop(1, `rgba(${rgb},0)`);
        context!.strokeStyle = glow;
        context!.lineWidth = i % 7 === 0 ? 1.2 : .65;
        context!.beginPath();
        for (let step = 0; step <= 70; step++) {
          const p = point(step / 70, lane);
          if (step === 0) context!.moveTo(p.x, p.y);
          else context!.lineTo(p.x, p.y);
        }
        context!.stroke();
      }

      // Small highlights glide along the existing strands; they never reset on a mode switch.
      for (let i = 0; i < 9; i++) {
        const u = (i * .137 + time * (.012 + i % 3 * .002)) % 1;
        const lane = ((i * 11) % strands) / (strands - 1) - .5;
        const p = point(u, lane);
        const alpha = Math.sin(u * Math.PI) * .8;
        context!.fillStyle = `rgba(${rgb},${alpha * .07})`;
        context!.beginPath();
        context!.arc(p.x, p.y, 7, 0, Math.PI * 2);
        context!.fill();
        context!.fillStyle = `rgba(${rgb},${alpha})`;
        context!.beginPath();
        context!.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
        context!.fill();
      }
      canvas!.dataset.ready = "true";
      if (!reduced.matches) schedule();
    }

    wakeRef.current = schedule;
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) schedule();
      else { cancelAnimationFrame(frame); frame = 0; }
    });
    intersection.observe(canvas);
    const themeObserver = new MutationObserver(() => {
      lightTheme = document.documentElement.dataset.theme === "light";
      schedule();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const visibility = () => {
      previous = 0;
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else schedule();
    };
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", schedule);
    resize();
    return () => {
      disposed = true;
      wakeRef.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", schedule);
    };
  }, []);

  return <div className="intelligence-scene light-field" aria-hidden="true">
    <div className="light-field-aura" />
    <svg className="light-field-still" viewBox="0 0 500 350" fill="none">
      <defs><linearGradient id={gradientId}><stop stopColor="currentColor" stopOpacity="0" /><stop offset=".5" stopColor="currentColor" stopOpacity=".6" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      {Array.from({ length: 24 }, (_, i) => <path key={i} d={`M15 ${148 + i * 3} C135 ${18 + i * 5} 290 ${325 - i * 4} 485 ${117 + i * 3}`} stroke={`url(#${gradientId})`} strokeWidth=".7" />)}
    </svg>
    <canvas ref={canvasRef} className="light-field-canvas" />
    <span className="light-field-corner top-left" /><span className="light-field-corner bottom-right" />
    <div className="light-field-caption"><span>VAYROX INTELLIGENCE</span><span>Ideas in flow.</span></div>
  </div>;
}

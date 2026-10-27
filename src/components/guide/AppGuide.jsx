import React, { useEffect, useState } from "react";

const visibleTarget = (id) => {
  const nodes = document.querySelectorAll(`[data-guide="${id}"]`);
  return [...nodes].find((node) => {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
};

const cardPosition = (box) => {
  const width = Math.min(320, window.innerWidth - 32);
  const estimatedHeight = 210;
  let left = box.right + 16;
  let top = box.top;

  if (left + width > window.innerWidth - 16) {
    left = box.left - width - 16;
  }
  if (left < 16) {
    left = Math.max(16, Math.min(box.left, window.innerWidth - width - 16));
    top = box.bottom + 14;
  }
  if (top + estimatedHeight > window.innerHeight - 16) {
    top = Math.max(16, box.top - estimatedHeight - 14);
  }
  return { left, top, width };
};

const AppGuide = ({ step, onDone, onPrepare }) => {
  const [box, setBox] = useState(null);

  useEffect(() => {
    if (!step) return undefined;
    onPrepare(step);
    let frame = 0;
    const measure = () => {
      const target = visibleTarget(step.id);
      if (!target) {
        setBox(null);
        return;
      }
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
      const rect = target.getBoundingClientRect();
      setBox({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      });
    };
    measure();
    frame = window.requestAnimationFrame(measure);
    const later = window.setTimeout(measure, 220);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(later);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step?.id, step?.mobilePlace, onPrepare]);

  if (!step) return null;

  const card = box
    ? cardPosition(box)
    : {
        left: Math.max(16, (window.innerWidth - 320) / 2),
        top: 80,
        width: Math.min(320, window.innerWidth - 32),
      };

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none" role="dialog" aria-labelledby="app-guide-title">
      {box ? (
        <div
          className="absolute rounded-xl ring-2 ring-white"
          style={{
            top: box.top - 6,
            left: box.left - 6,
            width: box.width + 12,
            height: box.height + 12,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/55" />
      )}
      <div
        className="pointer-events-auto absolute rounded-2xl bg-white p-4 shadow-xl"
        style={{ left: card.left, top: card.top, width: card.width }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          How this page works
        </p>
        <h2 id="app-guide-title" className="mt-1 text-base font-semibold text-gray-900">
          {step.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{step.body}</p>
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn btn-primary" onClick={onDone}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppGuide;

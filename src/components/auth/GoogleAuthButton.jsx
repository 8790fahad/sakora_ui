import React, { useEffect, useRef, useState } from "react";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "175215736246-v9d560u61pgruhqcmns43lfpoal13e89.apps.googleusercontent.com";

let gisLoadPromise = null;

const loadGisScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window unavailable"));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Sign-In"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
};

const buttonWidth = (node) => {
  const width = Math.floor(node?.getBoundingClientRect().width || 0);
  if (width < 200) return 0;
  return Math.min(400, width);
};

const GoogleAuthButton = ({
  onCredential,
  text = "continue_with",
  disabled = false,
  label = "Continue with Google",
}) => {
  const wrapRef = useRef(null);
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const paintedWidth = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) {
      setError("Google sign-in is not configured");
      return undefined;
    }

    let cancelled = false;

    const paint = () => {
      const wrap = wrapRef.current;
      const slot = containerRef.current;
      if (!wrap || !slot || !window.google?.accounts?.id) return;
      const width = buttonWidth(wrap);
      if (!width || width === paintedWidth.current) return;
      paintedWidth.current = width;
      slot.innerHTML = "";
      window.google.accounts.id.renderButton(slot, {
        type: "standard",
        theme: "outline",
        size: "large",
        text,
        shape: "rectangular",
        logo_alignment: "left",
        width,
      });
      const clamp = () => {
        const frame = slot.querySelector("iframe");
        const shell = slot.firstElementChild;
        if (shell) {
          shell.style.maxWidth = "100%";
          shell.style.width = "100%";
        }
        if (frame) {
          frame.style.maxWidth = "100%";
          frame.style.width = "100%";
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(clamp));
    };

    const mount = async () => {
      try {
        await loadGisScript();
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response?.credential) {
              callbackRef.current?.(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
        });
        window.google.accounts.id.cancel?.();
        paintedWidth.current = 0;
        paint();

        if (!cancelled) {
          setReady(true);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Google sign-in unavailable");
        }
      }
    };

    mount();

    const wrap = wrapRef.current;
    const observer =
      wrap && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => paint())
        : null;
    if (wrap && observer) observer.observe(wrap);

    return () => {
      cancelled = true;
      observer?.disconnect();
      window.google?.accounts?.id?.cancel?.();
    };
  }, [text]);

  if (!CLIENT_ID) {
    return null;
  }

  return (
    <div ref={wrapRef} className="w-full max-w-full overflow-hidden">
      <div
        ref={containerRef}
        className={`w-full max-w-full min-h-[44px] overflow-hidden ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
        aria-label={label}
      />
      {!ready && !error && (
        <p className="text-center text-xs text-gray-400 mt-2">Loading Google…</p>
      )}
      {error && (
        <p className="text-center text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
};

export default GoogleAuthButton;

import { useEffect, useRef, useState } from "react";

// Extra pixels added to the height the demo reports, so the iframe has a little
// breathing room and never shows an inner scrollbar from sub-pixel rounding.
const HEIGHT_PADDING = 24;

/**
 * Embeds a self-contained interactive demo (a static HTML file under
 * `public/demos/`) inside an iframe. The demo reports its own content height
 * via `postMessage({ demoHeight: number })`, so the iframe grows to fit without
 * an inner scrollbar. Theme (light/dark) syncs automatically: the demo reads
 * `localStorage.theme`, which Nextra also writes, and both share the same
 * origin. See `public/demos/README.md` for the full authoring contract.
 *
 * `heightKey` defaults to `"demoHeight"`; the handler also accepts a custom key
 * as an escape hatch, but new demos should post `demoHeight`.
 */
export function Demo({
  src,
  title,
  caption,
  heightKey = "demoHeight",
  minHeight = 400,
}) {
  const iframeRef = useRef(null);
  const [height, setHeight] = useState(minHeight);

  useEffect(() => {
    function handleMessage(event) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const value = event.data?.[heightKey] ?? event.data?.demoHeight;
      if (typeof value === "number") {
        setHeight(value + HEIGHT_PADDING);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [heightKey]);

  return (
    <figure className="nx-mt-6 first:nx-mt-0">
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        loading="lazy"
        style={{
          width: "100%",
          height: `${height}px`,
          border: "none",
          borderRadius: "0.75rem",
          display: "block",
        }}
      />
      <figcaption className="nx-mt-2 nx-text-sm nx-text-gray-500 dark:nx-text-gray-400">
        {caption ? <span>{caption} </span> : null}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="nx-text-primary-600 nx-underline decoration-from-font"
        >
          Open demo in a new tab ↗
        </a>
      </figcaption>
    </figure>
  );
}

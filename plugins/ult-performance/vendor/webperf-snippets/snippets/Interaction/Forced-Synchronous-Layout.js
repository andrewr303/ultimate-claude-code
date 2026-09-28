// Forced Synchronous Layout Detector
// https://webperf-snippets.nucliweb.net

(() => {
  let isDirty = false;
  let lastMutationTime = 0;
  let rafPending = false;
  const fslEvents = [];
  const restorations = [];

  const getElementDesc = (el) => {
    let desc = el.tagName.toLowerCase();
    if (el.id) desc += `#${el.id}`;
    if (el.className && typeof el.className === "string" && el.className.trim()) {
      desc += `.${el.className.trim().split(/\s+/).join(".")}`;
    }
    return desc;
  };

  const markDirty = () => {
    isDirty = true;
    lastMutationTime = performance.now();
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      isDirty = false;
      rafPending = false;
    });
  };

  // ─── SYNCHRONOUS MUTATION INTERCEPTION ──────────────────────────────────────
  // MutationObserver fires asynchronously (microtask after the stack clears),
  // so it cannot set isDirty before a geometric read in the same synchronous
  // block. We intercept the DOM mutation APIs directly instead.

  // classList: add / remove / toggle / replace
  const domTokenListProto = DOMTokenList.prototype;
  ["add", "remove", "toggle", "replace"].forEach((method) => {
    const orig = domTokenListProto[method];
    domTokenListProto[method] = function (...args) {
      markDirty();
      return orig.apply(this, args);
    };
    restorations.push(() => (domTokenListProto[method] = orig));
  });

  // element.setAttribute('class', ...) / element.setAttribute('style', ...)
  const origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (name === "class" || name === "style") markDirty();
    return origSetAttribute.call(this, name, value);
  };
  restorations.push(
    () => (Element.prototype.setAttribute = origSetAttribute)
  );

  // element.style.setProperty(...) and element.style.cssText = ...
  const cssStyleDeclarationProto = CSSStyleDeclaration.prototype;
  const origSetProperty = cssStyleDeclarationProto.setProperty;
  cssStyleDeclarationProto.setProperty = function (...args) {
    markDirty();
    return origSetProperty.apply(this, args);
  };
  restorations.push(
    () => (cssStyleDeclarationProto.setProperty = origSetProperty)
  );

  const cssTextDescriptor = Object.getOwnPropertyDescriptor(
    cssStyleDeclarationProto,
    "cssText"
  );
  if (cssTextDescriptor?.set) {
    Object.defineProperty(cssStyleDeclarationProto, "cssText", {
      ...cssTextDescriptor,
      set(value) {
        markDirty();
        cssTextDescriptor.set.call(this, value);
      },
    });
    restorations.push(() =>
      Object.defineProperty(cssStyleDeclarationProto, "cssText", cssTextDescriptor)
    );
  }

  // ─── GEOMETRIC PROPERTY INTERCEPTION ────────────────────────────────────────

  const warnFSL = (propName, accessType, el) => {
    if (!isDirty) return;
    const elapsed = (performance.now() - lastMutationTime).toFixed(2);
    const elDesc = el instanceof Element ? getElementDesc(el) : "unknown";
    const stack = new Error().stack;

    fslEvents.push({
      property: propName,
      accessType,
      element: elDesc,
      sinceLastMutationMs: parseFloat(elapsed),
      stack,
    });

    console.warn(
      `⚠️ [FSL Detector] Forced Synchronous Layout detected!\n` +
        `   Property  : ${propName} (${accessType})\n` +
        `   Element   : ${elDesc}\n` +
        `   Since last mutation: ${elapsed} ms\n` +
        `   Stack trace:\n${stack}`
    );
  };

  const interceptProp = (proto, propName, accessType) => {
    const descriptor = Object.getOwnPropertyDescriptor(proto, propName);
    if (!descriptor) return;

    const { get: origGet, set: origSet } = descriptor;
    const newDescriptor = { configurable: true, enumerable: descriptor.enumerable };

    if (origGet) {
      newDescriptor.get = function () {
        if (accessType === "read" || accessType === "readwrite") {
          warnFSL(propName, "read", this);
        }
        return origGet.call(this);
      };
    }

    if (origSet) {
      newDescriptor.set = function (value) {
        if (accessType === "write" || accessType === "readwrite") {
          warnFSL(propName, "write", this);
        }
        origSet.call(this, value);
      };
    }

    Object.defineProperty(proto, propName, newDescriptor);
    restorations.push(() => Object.defineProperty(proto, propName, descriptor));
  };

  // Element.prototype: client* and scroll*
  const elementReadProps = [
    "clientTop", "clientLeft", "clientWidth", "clientHeight",
    "scrollWidth", "scrollHeight",
  ];
  const elementReadWriteProps = ["scrollTop", "scrollLeft"];

  elementReadProps.forEach((p) => interceptProp(Element.prototype, p, "read"));
  elementReadWriteProps.forEach((p) => interceptProp(Element.prototype, p, "readwrite"));

  // HTMLElement.prototype: offset*
  const htmlElementReadProps = [
    "offsetTop", "offsetLeft", "offsetWidth", "offsetHeight",
  ];
  htmlElementReadProps.forEach((p) => interceptProp(HTMLElement.prototype, p, "read"));

  // getBoundingClientRect
  const origGetBCR = Element.prototype.getBoundingClientRect;
  const getBCRDescriptor = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "getBoundingClientRect"
  );
  Element.prototype.getBoundingClientRect = function () {
    warnFSL("getBoundingClientRect()", "read", this);
    return origGetBCR.call(this);
  };
  restorations.push(() =>
    Object.defineProperty(Element.prototype, "getBoundingClientRect", getBCRDescriptor)
  );

  // ─── SUMMARY ─────────────────────────────────────────────────────────────────

  window.getFSLSummary = () => {
    console.group("%c📊 FSL Detector Summary", "font-weight: bold; font-size: 14px;");

    if (fslEvents.length === 0) {
      console.log("   No forced synchronous layouts detected.");
      console.log("   ✅ The page is not triggering FSL patterns.");
      console.groupEnd();
      return {
        script: "Forced-Synchronous-Layout",
        status: "ok",
        count: 0,
        details: { fslEvents: [] },
      };
    }

    const byProperty = fslEvents.reduce((acc, e) => {
      acc[e.property] = (acc[e.property] || 0) + 1;
      return acc;
    }, {});

    const byElement = fslEvents.reduce((acc, e) => {
      acc[e.element] = (acc[e.element] || 0) + 1;
      return acc;
    }, {});

    console.log("");
    console.log("%cStatistics:", "font-weight: bold;");
    console.log(`   Total FSL events: ${fslEvents.length}`);
    console.log(
      `   Fastest since mutation: ${Math.min(...fslEvents.map((e) => e.sinceLastMutationMs)).toFixed(2)} ms`
    );

    console.log("");
    console.log("%cBy Property:", "font-weight: bold;");
    console.table(
      Object.entries(byProperty)
        .sort((a, b) => b[1] - a[1])
        .map(([property, count]) => ({ Property: property, Count: count }))
    );

    console.log("");
    console.log("%cBy Element:", "font-weight: bold;");
    console.table(
      Object.entries(byElement)
        .sort((a, b) => b[1] - a[1])
        .map(([element, count]) => ({ Element: element, Count: count }))
    );

    console.log("");
    console.log("%c💡 Fix:", "font-weight: bold; color: #3b82f6;");
    console.log("   Wrap geometric reads/writes in a double requestAnimationFrame:");
    console.log("   requestAnimationFrame(() => requestAnimationFrame(() => {");
    console.log("     element.scrollTop = 0; // or any layout-triggering access");
    console.log("   }));");

    console.groupEnd();

    return {
      script: "Forced-Synchronous-Layout",
      status: "ok",
      count: fslEvents.length,
      details: {
        byProperty,
        byElement,
        fastestSinceLastMutationMs: Math.min(
          ...fslEvents.map((e) => e.sinceLastMutationMs)
        ),
        fslEvents: fslEvents.map(({ property, accessType, element, sinceLastMutationMs }) => ({
          property,
          accessType,
          element,
          sinceLastMutationMs,
        })),
      },
    };
  };

  window.stopFSLDetector = () => {
    restorations.forEach((restore) => restore());
    restorations.length = 0;
    console.log(
      `%c🛑 FSL Detector stopped. Total FSL events detected: ${fslEvents.length}`,
      "font-weight: bold;"
    );
    delete window.getFSLSummary;
    delete window.stopFSLDetector;
  };

  console.log("%c⚡ FSL Detector Active", "font-weight: bold; font-size: 14px;");
  console.log("   Monitoring class/style mutations and geometric property access.");
  console.log(
    "   Call %cgetFSLSummary()%c for the report or %cstopFSLDetector()%c to stop.",
    "font-family: monospace; background: #f3f4f6; padding: 2px 4px;",
    "",
    "font-family: monospace; background: #f3f4f6; padding: 2px 4px;",
    ""
  );

  return {
    script: "Forced-Synchronous-Layout",
    status: "tracking",
    count: 0,
    details: {
      interceptedProperties: [
        ...elementReadProps,
        ...elementReadWriteProps,
        ...htmlElementReadProps,
        "getBoundingClientRect()",
      ],
    },
    message:
      "FSL Detector active. Reproduce the interaction then call getFSLSummary() to inspect results.",
    getDataFn: "getFSLSummary",
    stopFn: "stopFSLDetector",
  };
})();

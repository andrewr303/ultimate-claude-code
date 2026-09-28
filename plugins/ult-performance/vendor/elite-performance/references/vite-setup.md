# Vite Setup for Animation Projects

Optimized Vite configuration for premium animated websites.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [GSAP Integration](#gsap-integration)
3. [Production Build](#production-build)
4. [Development Workflow](#development-workflow)

---

## Basic Setup

### Project Initialization

```bash
# Create Vite project
npm create vite@latest my-project -- --template vanilla

# Or with framework
npm create vite@latest my-project -- --template react
npm create vite@latest my-project -- --template vue
npm create vite@latest my-project -- --template svelte

cd my-project
npm install
```

### Install Animation Dependencies

```bash
# GSAP and all plugins (free in 2026)
npm install gsap

# Optional: CSS utilities
npm install -D autoprefixer postcss
```

### Basic vite.config.js

```javascript
import { defineConfig } from "vite";

export default defineConfig({
  // Dev server
  server: {
    port: 3000,
    open: true,
    cors: true,
  },

  // Build options
  build: {
    target: "esnext",
    minify: "terser",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          gsap: ["gsap"],
        },
      },
    },
  },

  // CSS options
  css: {
    devSourcemap: true,
  },
});
```

---

## GSAP Integration

### Register Plugins (Main Entry)

```javascript
// src/main.js
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { ScrollSmoother } from "gsap/ScrollSmoother";

// Register all plugins ONCE at app entry
gsap.registerPlugin(ScrollTrigger, SplitText, Flip, ScrollSmoother);

// Make gsap available globally (optional)
window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;
```

### Chunked Plugin Loading

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core GSAP
          "gsap-core": ["gsap"],
          // Scroll plugins
          "gsap-scroll": ["gsap/ScrollTrigger", "gsap/ScrollSmoother"],
          // Animation plugins
          "gsap-animation": [
            "gsap/SplitText",
            "gsap/Flip",
            "gsap/MorphSVGPlugin",
            "gsap/DrawSVGPlugin",
          ],
        },
      },
    },
  },
});
```

### Lazy Load Heavy Plugins

```javascript
// Load plugins only when needed
async function initScrollAnimations() {
  const { ScrollTrigger } = await import("gsap/ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);

  // Now use ScrollTrigger
  ScrollTrigger.create({
    trigger: ".section",
    // ...
  });
}

// Load on route or visibility
if (document.querySelector(".scroll-section")) {
  initScrollAnimations();
}
```

---

## Production Build

### Optimized Config

```javascript
// vite.config.js
import { defineConfig } from "vite";
import { compression } from "vite-plugin-compression2";

export default defineConfig({
  build: {
    target: "esnext",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // GSAP chunks
          if (id.includes("gsap")) {
            if (id.includes("ScrollTrigger") || id.includes("ScrollSmoother")) {
              return "gsap-scroll";
            }
            return "gsap-core";
          }
          // Vendor chunk
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
  },

  plugins: [
    // Gzip and Brotli compression
    compression({
      algorithm: "gzip",
      threshold: 1024,
    }),
    compression({
      algorithm: "brotliCompress",
      threshold: 1024,
    }),
  ],
});
```

### CSS Optimization

```javascript
// vite.config.js
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        autoprefixer(),
        cssnano({
          preset: [
            "default",
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
            },
          ],
        }),
      ],
    },
  },
});
```

### Asset Optimization

```javascript
// vite.config.js
export default defineConfig({
  build: {
    assetsInlineLimit: 4096, // Inline < 4KB assets
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Organize assets by type
          const ext = assetInfo.name.split(".").pop();
          if (/png|jpe?g|svg|gif|webp|avif/.test(ext)) {
            return "images/[name]-[hash][extname]";
          }
          if (/woff2?|ttf|otf/.test(ext)) {
            return "fonts/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
```

---

## Development Workflow

### Hot Module Replacement with GSAP

```javascript
// src/animations.js
export function initAnimations() {
  const ctx = gsap.context(() => {
    gsap.from(".hero-title", {
      opacity: 0,
      y: 50,
      duration: 1,
    });

    ScrollTrigger.create({
      trigger: ".section",
      onEnter: () => console.log("Section entered"),
    });
  });

  return ctx;
}

// HMR support
if (import.meta.hot) {
  let ctx;

  import.meta.hot.accept(() => {
    // Cleanup old animations
    if (ctx) ctx.revert();
    // Re-initialize
    ctx = initAnimations();
  });
}
```

### Environment Variables

```bash
# .env
VITE_API_URL=https://api.example.com
VITE_ENABLE_ANIMATIONS=true
```

```javascript
// Use in code
const enableAnimations = import.meta.env.VITE_ENABLE_ANIMATIONS === "true";

if (enableAnimations) {
  initAnimations();
}
```

### Dev Server Proxy

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
```

---

## Framework-Specific Setup

### React + GSAP

```javascript
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          gsap: ["gsap", "@gsap/react"],
        },
      },
    },
  },
});
```

```javascript
// src/main.jsx
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);
```

### Vue + GSAP

```javascript
// vite.config.js
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ["vue"],
          gsap: ["gsap"],
        },
      },
    },
  },
});
```

### Svelte + GSAP

```javascript
// vite.config.js
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          gsap: ["gsap"],
        },
      },
    },
  },
});
```

---

## Complete Example Config

```javascript
// vite.config.js
import { defineConfig } from "vite";
import { compression } from "vite-plugin-compression2";
import autoprefixer from "autoprefixer";

export default defineConfig(({ mode }) => ({
  // Base URL
  base: mode === "production" ? "/my-app/" : "/",

  // Dev server
  server: {
    port: 3000,
    open: true,
    cors: true,
  },

  // Preview server (for testing production build)
  preview: {
    port: 4000,
  },

  // Build
  build: {
    target: "esnext",
    minify: "terser",
    sourcemap: mode !== "production",
    terserOptions: {
      compress: {
        drop_console: mode === "production",
        drop_debugger: mode === "production",
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          "gsap-core": ["gsap"],
          "gsap-scroll": ["gsap/ScrollTrigger", "gsap/ScrollSmoother"],
          "gsap-plugins": ["gsap/SplitText", "gsap/Flip"],
        },
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "js/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
      },
    },
    chunkSizeWarningLimit: 500,
  },

  // CSS
  css: {
    devSourcemap: true,
    postcss: {
      plugins: [autoprefixer()],
    },
  },

  // Plugins
  plugins: [
    compression({ algorithm: "gzip" }),
    compression({ algorithm: "brotliCompress" }),
  ],

  // Resolve
  resolve: {
    alias: {
      "@": "/src",
      "@components": "/src/components",
      "@animations": "/src/animations",
    },
  },
}));
```

---

## NPM Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "build:analyze": "vite build --mode analyze",
    "lint": "eslint src --fix"
  }
}
```

### Bundle Analyzer

```bash
npm install -D rollup-plugin-visualizer
```

```javascript
// vite.config.js
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  plugins: [
    mode === "analyze" &&
      visualizer({
        open: true,
        filename: "stats.html",
        gzipSize: true,
      }),
  ].filter(Boolean),
}));
```

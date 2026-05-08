import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer uses Node.js built-ins; exclude from server bundle
  serverExternalPackages: ["@react-pdf/renderer"],

  // Turbopack: stub Node.js built-ins on the client side (used in `next build`)
  turbopack: {
    resolveAlias: {
      fs: { browser: "./lib/empty.ts" },
      net: { browser: "./lib/empty.ts" },
      tls: { browser: "./lib/empty.ts" },
      stream: { browser: "./lib/empty.ts" },
      zlib: { browser: "./lib/empty.ts" },
      http: { browser: "./lib/empty.ts" },
      https: { browser: "./lib/empty.ts" },
      crypto: { browser: "./lib/empty.ts" },
      os: { browser: "./lib/empty.ts" },
      path: { browser: "./lib/empty.ts" },
      canvas: { browser: "./lib/empty.ts" },
      worker_threads: { browser: "./lib/empty.ts" },
    },
  },

  // Webpack: stub Node.js built-ins on the client side (used in `next dev --webpack`)
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        stream: false,
        zlib: false,
        http: false,
        https: false,
        crypto: false,
        os: false,
        path: false,
        canvas: false,
        worker_threads: false,
      };
    }
    return config;
  },
};

export default nextConfig;

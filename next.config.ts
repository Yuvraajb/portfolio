import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16's `cacheComponents` model makes every read dynamic unless marked
  // with `use cache`. The content layer in `app/lib/content` handles caching
  // explicitly via tagged `unstable_cache`, so leave the classic model on.
  // (`partialPrefetching` depends on it, so it comes off too.)
  cacheComponents: false,

  images: {
    remotePatterns: [
      // Goodreads book covers, served straight from their CDN.
      { protocol: "https", hostname: "i.gr-assets.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      // Substack post images.
      { protocol: "https", hostname: "substackcdn.com" },
    ],
  },

  turbopack: {
    // Pin the workspace root; otherwise Turbopack walks up and finds the
    // unrelated lockfile in ~/dev.
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

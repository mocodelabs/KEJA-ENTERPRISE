import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // The public landing page is the static sales page in public/brochure. Signed-in users
      // never see it: src/lib/supabase/middleware.ts redirects them from "/" to /dashboard.
      beforeFiles: [
        { source: "/", destination: "/brochure/index.html" },
        { source: "/brochure", destination: "/brochure/index.html" },
      ],
    };
  },
};

export default nextConfig;

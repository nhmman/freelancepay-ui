import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /milestones → /escrow (backward compat)
      {
        source: "/milestones",
        destination: "/escrow",
        permanent: true,
      },
      {
        source: "/milestones/:path*",
        destination: "/escrow/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /pay without username → redirect về trang chính
      {
        source: "/pay",
        destination: "/",
        permanent: false,
      },
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

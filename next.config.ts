import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  serverExternalPackages: ["onnxruntime-node", "sharp"],
  outputFileTracingIncludes: {
    "/api/**": ["./models/**"],
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Accept-CH",
            value: "Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

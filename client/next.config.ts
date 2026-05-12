// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
//     reactStrictMode: true,
//   env: {
//     NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',
//   },
//   // Fix WebSocket HMR connection issues when accessing via network IP
//   webpack: (config, { isServer }) => {
//     if (!isServer) {
//       config.watchOptions = {
//         poll: 1000,
//         aggregateTimeout: 300,
//       }
//     }
//     return config
//   },
// };

// export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.7.66",
    "localhost",
  ],
};

export default nextConfig;

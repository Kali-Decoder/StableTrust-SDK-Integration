/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Force async WebAssembly processing support layers
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Fix the "Can't resolve 'fs'" error block on browser bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }

    // Silence missing dynamic package logger issues (pino, metamask-sdk)
    config.ignoreWarnings = [
      { module: /pino/ },
      { module: /metamask/ }
    ];

    return config;
  },
};

export default nextConfig;
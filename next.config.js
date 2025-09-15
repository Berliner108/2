// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'oxzcewynapbbzyojyjfl.supabase.co' }, // dein Projekt
    ],
  },
  eslint: { ignoreDuringBuilds: true },

  // ⬇️ wichtig für PDFKit
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'fontkit', 'linebreak', 'png-js'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      for (const pkg of ['pdfkit', 'fontkit', 'linebreak', 'png-js']) {
        if (!config.externals.includes(pkg)) config.externals.push(pkg);
      }
    }
    return config;
  },
};

module.exports = nextConfig;

// next.config.js
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'oxzcewynapbbzyojyjfl.supabase.co' }, // dein Projekt
    ],
  },
  eslint: { ignoreDuringBuilds: true },
};
module.exports = nextConfig;

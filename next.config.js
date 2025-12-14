// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    // explizit erlauben (hilft in manchen Next-Versionen zusätzlich)
    domains: ['oxzcewynapbbzyojyjfl.supabase.co'],

    // für public + signed urls
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oxzcewynapbbzyojyjfl.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },

  eslint: { ignoreDuringBuilds: true },

  // ✅ neu statt experimental.serverComponentsExternalPackages
  serverExternalPackages: ['pdfkit', 'fontkit', 'linebreak', 'png-js'],

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      for (const pkg of ['pdfkit', 'fontkit', 'linebreak', 'png-js']) {
        if (!config.externals.includes(pkg)) config.externals.push(pkg)
      }
    }
    return config
  },
}

module.exports = nextConfig

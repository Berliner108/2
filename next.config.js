// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oxzcewynapbbzyojyjfl.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  eslint: { ignoreDuringBuilds: true },

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

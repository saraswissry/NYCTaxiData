/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/heatmap',
        destination: '/dispatch',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://zonax.runasp.net/api/v1/:path*',
      },
      {
        source: '/hubs/:path*',
        destination: 'https://zonax.runasp.net/hubs/:path*',
      },
    ]
  },
}

export default nextConfig

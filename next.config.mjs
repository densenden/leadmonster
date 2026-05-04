/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Single-Domain-Strategie (§ 8): das Root-Produkt sterbegeld24plus
  // lebt unter `/`. Der alte Slug-Pfad wird permanent dorthin umgeleitet.
  // Dynamische Redirects kommen in Phase 3 via DB-Tabelle + Middleware.
  async redirects() {
    return [
      {
        source: '/sterbegeld24plus',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

export default nextConfig

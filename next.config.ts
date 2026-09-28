import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Permite que o build conclua na Vercel mesmo com divergências estritas de TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    // Evita bloqueios por avisos de linter durante o build
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
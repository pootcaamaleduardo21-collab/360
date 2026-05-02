/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' produces a self-contained server bundle for Docker.
  // On Vercel (process.env.VERCEL is set automatically) we skip it so
  // Vercel's own bundler handles the output correctly.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },

  // Required for Three.js to bundle correctly
  transpilePackages: ['three'],
};

export default nextConfig;

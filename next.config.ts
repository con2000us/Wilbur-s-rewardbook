import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

function getSupabasePathRewrite() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];

  try {
    const parsedUrl = new URL(supabaseUrl);
    const pathname = parsedUrl.pathname.replace(/\/+$/, '');
    if (!pathname || pathname === '/') return [];

    return [{
      source: `${pathname}/:path*`,
      destination: `${parsedUrl.origin}${pathname}/:path*`,
    }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.*', 'localhost', '127.0.0.1', 'wilbur.mayacraft.net', 'mayacraft.net', 'wilbur.mayacraft.net:443', 'mayacraft.net:443'],
  async rewrites() {
    return getSupabasePathRewrite();
  },
};

export default withNextIntl(nextConfig);

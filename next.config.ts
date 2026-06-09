import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.188', 'localhost', '127.0.0.1'],
};

export default withNextIntl(nextConfig);

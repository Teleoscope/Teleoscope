import nextra from 'nextra';

/** @type {import('next').NextConfig} */
const productBaseUrl = (process.env.NEXT_PUBLIC_PRODUCT_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '');

const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "mdx"],
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    if (!productBaseUrl) {
      return [];
    }

    return [
      {
        source: '/demo',
        destination: `${productBaseUrl}/demo`,
        permanent: false,
      },
      {
        source: '/demo/:path*',
        destination: `${productBaseUrl}/demo/:path*`,
        permanent: false,
      },
      {
        source: '/auth/:path*',
        destination: `${productBaseUrl}/auth/:path*`,
        permanent: false,
      },
      {
        source: '/app/:path*',
        destination: `${productBaseUrl}/app/:path*`,
        permanent: false,
      },
      {
        source: '/workspace/:path*',
        destination: `${productBaseUrl}/workspace/:path*`,
        permanent: false,
      },
    ];
  },
  webpack: (config) => {
    config.externals.push("@node-rs/argon2", "@node-rs/bcrypt");

    // Enable top-level await
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    return config;
  },
};

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx'
});

export default withNextra(nextConfig);

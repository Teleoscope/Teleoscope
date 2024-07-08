import nextra from 'nextra';

/** @type {import('next').NextConfig} */
const nextConfig = {

pageExtensions: ["js", "jsx", "ts", "tsx", "mdx"],

  webpack: (config) => {
    config.externals.push("@node-rs/argon2", "@node-rs/bcrypt");
    return config;
  },
};


const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx'
})




export default  withNextra(nextConfig)

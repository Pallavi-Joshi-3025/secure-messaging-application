/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Old URLs from the first version still work.
  async redirects() {
    return [
      { source: '/profile', destination: '/chats?view=settings', permanent: false },
      { source: '/chat/:id', destination: '/chats?c=:id', permanent: false },
    ];
  },
};

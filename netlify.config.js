module.exports = {
  async rewrites() {
    return [
      {
        source: "/.netlify/functions/CRUDFLData",
        destination: process.env.NEXT_PUBLIC_API_URL, // Proxy to Netlify Dev
      },
    ];
  },
};

module.exports = {
  async rewrites() {
    return [
      {
        source: "/.netlify/functions/CRUDFLData",
        destination: "http://localhost:8888/.netlify/functions/CRUDFLData", // Proxy to Netlify Dev
      },
    ];
  },
};

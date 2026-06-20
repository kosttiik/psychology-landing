import { defineConfig, loadEnv, type Plugin } from "vite";

function stripHtmlComments(): Plugin {
  return {
    name: "strip-html-comments",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(/<!--(?!\[if)[\s\S]*?-->/g, "");
    },
  };
}

// Emits robots.txt + sitemap.xml into dist/ at build time, derived from
// VITE_SITE_URL so the domain lives in exactly one place (.env).
function seoFiles(siteUrl: string): Plugin {
  const site = siteUrl.replace(/\/+$/, "");
  const lastmod = new Date().toISOString().slice(0, 10);

  return {
    name: "generate-seo-files",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`,
      });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source:
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `  <url>\n` +
          `    <loc>${site}/</loc>\n` +
          `    <lastmod>${lastmod}</lastmod>\n` +
          `    <changefreq>monthly</changefreq>\n` +
          `    <priority>1.0</priority>\n` +
          `  </url>\n` +
          `</urlset>\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = env["VITE_SITE_URL"] ?? "https://example.com";

  return {
    root: "src",
    envDir: "..",
    publicDir: "../public",
    build: {
      outDir: "../dist",
      emptyOutDir: true,
      rollupOptions: {
        input: "src/index.html",
      },
    },
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
    plugins: [stripHtmlComments(), seoFiles(siteUrl)],
    // served in Docker behind an external reverse proxy
    preview: {
      host: true,
      port: 4173,
      allowedHosts: true,
    },
  };
});

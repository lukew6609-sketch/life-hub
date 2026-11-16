import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life Hub",
    short_name: "Life Hub",
    start_url: "/",
    display: "standalone",
    background_color: "#111a2c",
    theme_color: "#111a2c",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}

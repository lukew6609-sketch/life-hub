import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life Hub",
    short_name: "Life Hub",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#047857",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}

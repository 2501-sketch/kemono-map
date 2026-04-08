import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coordi Closet",
    short_name: "Coordi",
    description: "服の管理、コーデ作成、カレンダー記録ができるPWAアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e8",
    theme_color: "#ff8d6c",
    lang: "ja",
    orientation: "portrait",
    icons: []
  };
}

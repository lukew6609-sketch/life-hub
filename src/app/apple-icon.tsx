import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111a2c", color: "#5fe0b8", fontSize: 100, fontWeight: 700, borderRadius: 0 }}>
        L
      </div>
    ),
    size
  );
}

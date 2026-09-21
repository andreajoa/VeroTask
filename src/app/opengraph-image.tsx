import { ImageResponse } from "next/og";

export const alt = "VeroTask — trusted local services in Orlando and Central Florida";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a2a3d", color: "white", padding: "76px 84px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 38, fontWeight: 800 }}>
        <div style={{ width: 58, height: 58, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, background: "#e8f6fc", color: "#0a2a3d" }}>V</div>
        VeroTask
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ maxWidth: 930, fontSize: 76, lineHeight: 1.02, letterSpacing: -3, fontWeight: 900 }}>Trusted local services. Verified work.</div>
        <div style={{ fontSize: 30, color: "#cdebf7" }}>Orlando &amp; Central Florida</div>
      </div>
    </div>,
    size
  );
}

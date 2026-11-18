import { ImageResponse } from "next/og";

export const alt = "VetLawGuide — Point-in-Time Veterans Law Research Desk";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#fbf9f5",
          padding: "44px",
          fontFamily: "Georgia, serif",
          color: "#1e2022",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#f3eee3",
            border: "3px solid #d4cbb8",
            borderRadius: "18px",
            padding: "48px 54px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "0px",
              top: "0px",
              bottom: "0px",
              width: "16px",
              backgroundColor: "#8ea38b",
              borderTopLeftRadius: "14px",
              borderBottomLeftRadius: "14px",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#1b365d",
                fontFamily: "sans-serif",
              }}
            >
              Point-in-Time Veterans Law Reference Desk
            </div>
            <div
              style={{
                backgroundColor: "#784f12",
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: "999px",
                fontSize: "20px",
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              38 U.S.C. · 38 C.F.R. · DC 5000–9918
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div
              style={{
                fontSize: "58px",
                fontWeight: 700,
                lineHeight: 1.16,
                color: "#1e2022",
              }}
            >
              Find the VA Law in Force on Your Decision Date
            </div>
            <div
              style={{
                fontSize: "25px",
                lineHeight: 1.45,
                color: "#4a4d52",
                fontFamily: "sans-serif",
              }}
            >
              Historical and modern 38 C.F.R. snapshots, VASRD rating schedules,
              statutory crosswalks, and private on-device record checklists.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "2px solid #d4cbb8",
              paddingTop: "22px",
              fontFamily: "sans-serif",
            }}
          >
            <div style={{ fontSize: "26px", fontWeight: 700, color: "#1b365d" }}>
              VetLawGuide.com
            </div>
            <div style={{ fontSize: "19px", color: "#4a4d52" }}>
              Educational Reference Only · Not Legal Advice
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const size = {
  width: 1200,
  height: 630,
};

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawTitle =
    searchParams.get("title")?.trim().slice(0, 110) ||
    "Find the VA Law in Force on Your Decision Date";
  const eyebrow =
    searchParams.get("eyebrow")?.trim().slice(0, 64) ||
    "Point-in-Time Veterans Law Reference";
  const cite = searchParams.get("cite")?.trim().slice(0, 72) || "";

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
          {/* Sage archival bookplate spine accent */}
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
              gap: "16px",
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
              {eyebrow}
            </div>
            {cite ? (
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
                {cite}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              marginTop: "12px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                fontSize: rawTitle.length > 72 ? "48px" : "56px",
                fontWeight: 700,
                lineHeight: 1.18,
                color: "#1e2022",
              }}
            >
              {rawTitle}
            </div>
            <div
              style={{
                fontSize: "24px",
                lineHeight: 1.45,
                color: "#4a4d52",
                fontFamily: "sans-serif",
              }}
            >
              Inspectable 38 C.F.R. snapshots, Title 38 crosswalks, VASRD diagnostic
              codes, and plain-English Veteran companions.
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "#1b365d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fbf9f5",
                  fontSize: "20px",
                  fontWeight: 700,
                }}
              >
                V
              </div>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 700,
                  color: "#1e2022",
                }}
              >
                VetLawGuide.com
              </div>
            </div>

            <div
              style={{
                fontSize: "19px",
                color: "#4a4d52",
              }}
            >
              Educational Reference Only · Not Legal Advice
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

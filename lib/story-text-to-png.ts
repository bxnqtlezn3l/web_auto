/**
 * แปลงข้อความเป็น PNG แนวตั้ง 9:16 สำหรับ Facebook Page photo story
 * (Graph ไม่มี API สตอรี่ “ข้อความล้วน” — ใช้รูปที่เรนเดอร์จากข้อความแทน)
 */

import fs from "fs";
import path from "path";

import { Resvg } from "@resvg/resvg-js";
import React from "react";
import satori from "satori";

const W = 1080;
const H = 1920;
const MAX_CHARS = 2800;

function loadThaiFontBuffer(): ArrayBuffer {
  const fontPath = path.join(
    process.cwd(),
    "node_modules/@fontsource-variable/noto-sans-thai/files/noto-sans-thai-thai-wght-normal.woff2",
  );
  if (!fs.existsSync(fontPath)) {
    throw new Error(
      "ไม่พบฟอนต์ Noto Sans Thai — รัน npm install ในโฟลเดอร์ web",
    );
  }
  const buf = fs.readFileSync(fontPath);
  return new Uint8Array(buf).buffer;
}

export async function renderStoryTextToPng(rawText: string): Promise<Buffer> {
  const text = rawText.trim();
  if (!text) {
    throw new Error("ข้อความว่าง");
  }
  const clipped = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
  const fontData = loadThaiFontBuffer();

  const svg = await satori(
    React.createElement(
      "div",
      {
        style: {
          width: W,
          height: H,
          background:
            "linear-gradient(165deg, #0f3460 0%, #16213e 45%, #1a1a2e 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 72,
          boxSizing: "border-box",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            color: "#f8fafc",
            fontSize: 52,
            fontWeight: 500,
            fontFamily: "Noto Sans Thai",
            lineHeight: 1.35,
            textAlign: "center",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          },
        },
        clipped,
      ),
    ),
    {
      width: W,
      height: H,
      fonts: [
        {
          name: "Noto Sans Thai",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
  });
  const png = resvg.render();
  return Buffer.from(png.asPng());
}

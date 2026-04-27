import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  GRAPH_BASE,
  graphHeaders,
  normalizeAccessToken,
} from "@/lib/facebook-graph";
import { userFacingFacebookGraphError } from "@/lib/facebook-graph-user-message";
import { recordFacebookMeSuccess } from "@/lib/landing-stats";

type GraphErrorBody = {
  error?: { message?: string; type?: string; code?: number };
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let access_token = "";
  let cookie: string | undefined;

  try {
    const text = await req.text();
    if (!text) {
      return NextResponse.json(
        { error: "ไม่มีข้อมูลใน request" },
        { status: 400 },
      );
    }

    const body = JSON.parse(text) as {
      access_token?: unknown;
      cookie?: unknown;
    };
    access_token =
      typeof body.access_token === "string"
        ? normalizeAccessToken(body.access_token)
        : "";
    cookie =
      typeof body.cookie === "string" ? body.cookie : undefined;
  } catch {
    return NextResponse.json(
      { error: "รูปแบบ JSON ไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  if (!access_token) {
    return NextResponse.json(
      { error: "กรุณากรอก access token" },
      { status: 400 },
    );
  }

  const meFields = "id,name,link";
  const meUrl = `${GRAPH_BASE}/me?access_token=${encodeURIComponent(access_token)}&fields=${encodeURIComponent(meFields)}`;

  let meRes: Response;
  try {
    meRes = await fetch(meUrl, {
      method: "GET",
      headers: graphHeaders(cookie),
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "เครือข่ายล้มเหลว";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let meData: GraphErrorBody & {
    id?: string;
    name?: string;
    link?: string;
  };

  try {
    meData = (await meRes.json()) as typeof meData;
  } catch {
    return NextResponse.json(
      { error: "Facebook ส่งคำตอบที่อ่านไม่ได้" },
      { status: 502 },
    );
  }

  if (!meRes.ok) {
    const raw =
      typeof meData.error?.message === "string"
        ? meData.error.message
        : "ไม่สามารถเชื่อมต่อ Facebook ได้";
    const msg = userFacingFacebookGraphError(raw);
    const status =
      meRes.status === 401 || meRes.status === 403 ? meRes.status : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  const id = meData.id ?? "";
  let pictureUrl: string | null = null;

  if (id) {
    const picUrl = `${GRAPH_BASE}/${encodeURIComponent(id)}/picture?redirect=0&access_token=${encodeURIComponent(access_token)}`;
    try {
      const picRes = await fetch(picUrl, {
        method: "GET",
        headers: graphHeaders(cookie),
        cache: "no-store",
      });
      const picJson = (await picRes.json()) as {
        data?: { url?: string };
        error?: { message?: string };
      };
      if (picRes.ok && typeof picJson.data?.url === "string") {
        pictureUrl = picJson.data.url;
      }
    } catch {
      /* ignore */
    }
  }

  const profileLink =
    typeof meData.link === "string" && meData.link
      ? meData.link
      : id
        ? `https://www.facebook.com/profile.php?id=${id}`
        : "";

  await recordFacebookMeSuccess();

  return NextResponse.json({
    id,
    name: meData.name ?? "",
    pictureUrl,
    link: profileLink,
  });
}

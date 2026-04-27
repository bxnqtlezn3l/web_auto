import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  GRAPH_BASE,
  graphHeaders,
  normalizeAccessToken,
} from "@/lib/facebook-graph";
import { userFacingFacebookGraphError } from "@/lib/facebook-graph-user-message";

type GraphErrorBody = {
  error?: { message?: string };
};

type GroupItem = {
  id: string;
  name: string;
  privacy?: string;
  member_count?: number;
};

type GroupsPage = {
  data?: GroupItem[];
  paging?: { next?: string };
  error?: GraphErrorBody["error"];
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

  const headers = graphHeaders(cookie);
  const fields = "id,name,privacy,member_count";
  let nextUrl: string | null =
    `${GRAPH_BASE}/me/groups?access_token=${encodeURIComponent(access_token)}&fields=${encodeURIComponent(fields)}&limit=100`;

  const groups: GroupItem[] = [];

  try {
    while (nextUrl) {
      const res = await fetch(nextUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      let page: GroupsPage;
      try {
        page = (await res.json()) as GroupsPage;
      } catch {
        return NextResponse.json(
          { error: "Facebook ส่งคำตอบที่อ่านไม่ได้" },
          { status: 502 },
        );
      }

      if (!res.ok) {
        const raw =
          typeof page.error?.message === "string"
            ? page.error.message
            : "ดึงรายการกลุ่มไม่สำเร็จ";
        const msg = userFacingFacebookGraphError(raw);
        const status =
          res.status === 401 || res.status === 403 ? res.status : 400;
        return NextResponse.json({ error: msg }, { status });
      }

      if (Array.isArray(page.data)) {
        for (const g of page.data) {
          if (g && typeof g.id === "string" && typeof g.name === "string") {
            groups.push({
              id: g.id,
              name: g.name,
              privacy: typeof g.privacy === "string" ? g.privacy : undefined,
              member_count:
                typeof g.member_count === "number" ? g.member_count : undefined,
            });
          }
        }
      }

      nextUrl =
        typeof page.paging?.next === "string" && page.paging.next.length > 0
          ? page.paging.next
          : null;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "เครือข่ายล้มเหลว";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ groups });
}

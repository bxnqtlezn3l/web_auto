/**
 * โพสต์ลงกลุ่มผ่าน Graph — ใช้ร่วมกับ route และตัวรันคิว
 */
import {
  GRAPH_BASE,
  graphHeadersFormUrlEncoded,
  GRAPH_USER_AGENT,
} from "@/lib/facebook-graph";

export const MAX_GROUP_POST_IMAGE_BYTES = 12 * 1024 * 1024;

export type GraphPayload = {
  error?: FacebookError;
  id?: string;
  post_id?: string;
};

export type FacebookError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_user_msg?: string;
  error_user_title?: string;
  fbtrace_id?: string;
};

async function readGraphResponse(res: Response): Promise<GraphPayload> {
  const text = await res.text();
  try {
    return JSON.parse(text) as GraphPayload;
  } catch {
    return {
      error: {
        message:
          text.length > 0
            ? `คำตอบไม่ใช่ JSON: ${text.slice(0, 280)}`
            : "คำตอบว่างจาก Facebook",
      },
    };
  }
}

async function postFeed(
  groupId: string,
  access_token: string,
  cookie: string | undefined,
  message: string,
) {
  const url = `${GRAPH_BASE}/${encodeURIComponent(groupId)}/feed`;
  const body = new URLSearchParams();
  body.set("access_token", access_token);
  body.set("message", message);

  const res = await fetch(url, {
    method: "POST",
    headers: graphHeadersFormUrlEncoded(cookie),
    body: body.toString(),
    cache: "no-store",
  });
  const data = await readGraphResponse(res);
  return { res, data };
}

function multipartBaseHeaders(cookie: string | undefined): Headers {
  const headers = new Headers();
  headers.set("User-Agent", GRAPH_USER_AGENT);
  const c = cookie?.trim();
  if (c) {
    headers.set("Cookie", c);
  }
  return headers;
}

async function postPhoto(
  groupId: string,
  access_token: string,
  cookie: string | undefined,
  message: string,
  file: File,
) {
  const outgoing = new FormData();
  outgoing.set("access_token", access_token);
  outgoing.set("published", "true");
  if (message.trim().length > 0) {
    outgoing.set("message", message.trim());
  }
  outgoing.set("source", file, file.name || "image.jpg");

  const url = `${GRAPH_BASE}/${encodeURIComponent(groupId)}/photos`;
  const res = await fetch(url, {
    method: "POST",
    headers: multipartBaseHeaders(cookie),
    body: outgoing,
    cache: "no-store",
  });
  const data = await readGraphResponse(res);
  return { res, data };
}

async function postPhotoViaUnpublishedThenFeed(
  groupId: string,
  access_token: string,
  cookie: string | undefined,
  message: string,
  file: File,
) {
  const url = `${GRAPH_BASE}/${encodeURIComponent(groupId)}/photos`;

  const upload = new FormData();
  upload.set("access_token", access_token);
  upload.set("published", "false");
  upload.set("source", file, file.name || "image.jpg");

  const res1 = await fetch(url, {
    method: "POST",
    headers: multipartBaseHeaders(cookie),
    body: upload,
    cache: "no-store",
  });
  const data1 = await readGraphResponse(res1);
  if (!res1.ok) {
    return { res: res1, data: data1 };
  }

  const mediaId = data1.id;
  if (typeof mediaId !== "string" || !mediaId) {
    return {
      res: new Response(null, { status: 400 }),
      data: {
        error: {
          message:
            "อัปโหลดรูปแล้วแต่ไม่ได้รับรหัสสื่อจาก Facebook — ลองไฟล์อื่นหรือตรวจสิทธิ์โทเคน",
        },
      },
    };
  }

  const caption = message.trim();
  const body = new URLSearchParams();
  body.set("access_token", access_token);
  if (caption.length > 0) {
    body.set("message", caption);
  } else {
    body.set("message", " ");
  }
  body.set("attached_media", JSON.stringify([{ media_fbid: mediaId }]));

  const res2 = await fetch(
    `${GRAPH_BASE}/${encodeURIComponent(groupId)}/feed`,
    {
      method: "POST",
      headers: graphHeadersFormUrlEncoded(cookie),
      body: body.toString(),
      cache: "no-store",
    },
  );
  const data2 = await readGraphResponse(res2);
  return { res: res2, data: data2 };
}

async function postImageWithCaption(
  groupId: string,
  access_token: string,
  cookie: string | undefined,
  message: string,
  file: File,
): Promise<{ res: Response; data: GraphPayload }> {
  const first = await postPhoto(
    groupId,
    access_token,
    cookie,
    message,
    file,
  );
  if (first.res.ok) {
    return first;
  }
  return postPhotoViaUnpublishedThenFeed(
    groupId,
    access_token,
    cookie,
    message,
    file,
  );
}

export type ExecuteGroupPostParams = {
  groupId: string;
  access_token: string;
  cookie: string | undefined;
  message: string;
  image: File | null;
};

export type ExecuteGroupPostResult =
  | { ok: true; post_id: string; id: string }
  | { ok: false; res: Response; data: GraphPayload };

export async function executeFacebookGroupPost(
  p: ExecuteGroupPostParams,
): Promise<ExecuteGroupPostResult> {
  const hasImage = p.image !== null && p.image.size > 0;
  if (!hasImage && !p.message.trim()) {
    return {
      ok: false,
      res: new Response(null, { status: 400 }),
      data: {
        error: { message: "กรุณากรอกข้อความหรือแนบรูป" },
      },
    };
  }
  if (hasImage && p.image!.size > MAX_GROUP_POST_IMAGE_BYTES) {
    return {
      ok: false,
      res: new Response(null, { status: 400 }),
      data: { error: { message: "ไฟล์รูปใหญ่เกิน 12 MB" } },
    };
  }

  let res: Response;
  let data: GraphPayload;

  if (hasImage) {
    ({ res, data } = await postImageWithCaption(
      p.groupId,
      p.access_token,
      p.cookie,
      p.message,
      p.image!,
    ));
  } else {
    ({ res, data } = await postFeed(
      p.groupId,
      p.access_token,
      p.cookie,
      p.message,
    ));
  }

  if (!res.ok) {
    return { ok: false, res, data };
  }

  const rawId = data.post_id ?? data.id;
  const postId =
    rawId !== undefined && rawId !== null ? String(rawId).trim() : "";
  if (!postId) {
    return {
      ok: false,
      res: new Response(null, { status: 502 }),
      data: {
        error: {
          message:
            "Facebook ไม่คืนรหัสโพสต์ — โพสต์อาจไม่ถูกสร้างในกลุ่ม",
        },
      },
    };
  }

  return {
    ok: true,
    post_id: postId,
    id: String(data.id ?? postId).trim() || postId,
  };
}

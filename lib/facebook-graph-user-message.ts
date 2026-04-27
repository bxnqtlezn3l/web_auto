/**
 * แปลงข้อความ error ดิบจาก Facebook Graph API ให้ผู้ใช้เข้าใจ (รวม pattern ยกเลิก session / โทเคนหมดอายุ)
 */
export function userFacingFacebookGraphError(
  message: string | null | undefined,
): string {
  const m = (message ?? "").trim();
  if (!m) {
    return "Facebook ปฏิเสธคำขอ (ไม่มีรายละเอียด)";
  }

  const lower = m.toLowerCase();
  if (lower.includes("session has been invalidated")) {
    return [
      "Access token นี้ใช้งานไม่ได้แล้ว: Facebook ยกเลิกเซสชัน",
      "(เช่น เปลี่ยนรหัสผ่าน, เข้าสู่ระบบอุปกรณ์อื่น, หรือเหตุด้านความปลอดภัย)",
      "— กรุณาไป Meta for Developers หรือ Graph API Explorer สร้าง user access token ใหม่ แล้วบันทึกในหน้า “เชื่อมต่อ” ของแอปนี้",
    ].join(" ");
  }

  if (lower.includes("error validating access token")) {
    return "Access token ไม่ถูกต้องหรือหมดอายุ — สร้าง token ใหม่แล้ววางในหน้าเชื่อมต่อ";
  }

  return m;
}

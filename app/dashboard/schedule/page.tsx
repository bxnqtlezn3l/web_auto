import { redirect } from "next/navigation";

/** เดิมเป็นหน้าแยก — รวมไว้ที่ `/dashboard/post` แล้ว */
export default function DashboardScheduleRedirectPage() {
  redirect("/dashboard/post?schedule=1");
}

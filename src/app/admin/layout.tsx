import { assertAdminSession } from "@/lib/admin/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await assertAdminSession();
  return children;
}

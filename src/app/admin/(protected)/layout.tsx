import { guardAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await guardAdmin();
  return <AdminShell email={user.email || ""}>{children}</AdminShell>;
}

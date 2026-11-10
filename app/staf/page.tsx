import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getStaffDashboard } from "@/lib/staff";
import { StaffDashboardClient } from "./staff-dashboard";

export const metadata: Metadata = {
  title: "Antrean admin",
  description: "Dashboard admin untuk memproses pengajuan reservasi ruangan.",
};

export default async function StafPage() {
  await requireAdmin();
  const initial = await getStaffDashboard({ status: "MENUNGGU" });

  return (
    <div className="page-shell py-8 sm:py-10">
      <StaffDashboardClient initial={initial} />
    </div>
  );
}

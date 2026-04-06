import { Outlet } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminUserBar } from "@/components/AdminUserBar";

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen w-full items-start">
      <AdminSidebar />
      <main className="flex-1 min-h-screen min-w-0">
        <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
          <AdminUserBar />
          <Outlet />
        </div>
      </main>
    </div>
  );
}

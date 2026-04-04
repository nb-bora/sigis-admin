import { Outlet } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen w-full relative">
      <AdminSidebar />
      <main className="flex-1 min-w-0 lg:ml-0">
        <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

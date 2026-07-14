import type { Metadata } from "next";
import { AdminDashboard } from "./AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard - Intexspace",
};

export default function AdminPage() {
  return <AdminDashboard />;
}

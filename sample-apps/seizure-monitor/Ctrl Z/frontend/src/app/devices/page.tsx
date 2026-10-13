import type { Metadata } from "next";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import DeviceList from "@/components/device/DeviceList";

export const metadata: Metadata = {
  title: "Devices",
};

export default function DevicesPage() {
  return (
    <main className="flex min-h-screen bg-background">
      <Sidebar />

      <section className="flex-1 min-w-0">
        <Navbar />

        <div className="p-4 sm:p-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Devices
          </h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Connected ESP32 receivers
          </p>
          <DeviceList />
        </div>
      </section>
    </main>
  );
}

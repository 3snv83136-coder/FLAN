"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import type { AppProfile } from "@/lib/sales/types";
import { pendingCount } from "@/lib/sales/offline-queue";

export function AppShell({
  profile,
  children,
}: {
  profile: AppProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const sync = () => {
      setOnline(navigator.onLine);
      setPending(pendingCount());
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("flan-queue-changed", sync);
    const id = window.setInterval(sync, 2000);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener("flan-queue-changed", sync);
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <AppHeader
        profile={profile}
        pathname={pathname}
        pendingCount={pending}
        online={online}
      />
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}

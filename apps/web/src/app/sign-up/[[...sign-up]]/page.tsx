"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sign-in");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-msi-pale-cyan to-white">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-msi-navy border-t-transparent" />
    </div>
  );
}

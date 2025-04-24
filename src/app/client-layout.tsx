'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const router = useRouter();

  useEffect(() => {
    // Sayfa yüklendiğinde router'ı yenile
    router.refresh();
  }, []);

  return <>{children}</>;
} 
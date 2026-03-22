"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

export function ToastHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const message = searchParams.get('toast');
    const type = searchParams.get('type') ?? 'success';
    if (!message) return;

    if (type === 'error') {
      toast.error(message);
    } else {
      toast.success(message);
    }

    // Remove toast params from URL without navigation
    const params = new URLSearchParams(searchParams.toString());
    params.delete('toast');
    params.delete('type');
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams]);

  return null;
}

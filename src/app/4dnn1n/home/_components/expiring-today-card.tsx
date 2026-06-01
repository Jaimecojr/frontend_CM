'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { getExpiringToday, type ExpiringAffiliate } from '@/app/4dnn1n/affiliates/fetch';
import { ExpiringTodayCardSkeleton } from './expiring-today-card-skeleton';

export function ExpiringTodayCard() {
  const [affiliates, setAffiliates] = useState<ExpiringAffiliate[]>([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getExpiringToday().then(({ data, date }) => {
      setAffiliates(data);
      setDate(date);
      setLoading(false);
    });
  }, []);

  const startScroll = () => {
    const el = containerRef.current;
    if (!el || affiliates.length <= 5) return;
    intervalRef.current = setInterval(() => {
      el.scrollTop += 1;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
        el.scrollTop = 0;
      }
    }, 40);
  };

  const stopScroll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!loading) startScroll();
    return stopScroll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, affiliates.length]);

  if (loading) return <ExpiringTodayCardSkeleton />;

  return (
    <div className="rounded-[10px] bg-white px-7.5 py-6 shadow-1 dark:bg-gray-dark dark:shadow-card flex flex-col gap-1 h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-dark dark:text-white">Contratos que vencen hoy</h3>
        <span className="text-sm text-dark-5 dark:text-dark-6">{date}</span>
      </div>

      {affiliates.length === 0 ? (
        <p className="py-8 text-center text-sm text-dark-5 dark:text-dark-6">
          No hay contratos que vencen hoy
        </p>
      ) : (
        <div
          ref={containerRef}
          className="overflow-y-auto max-h-[280px] pr-1"
          onMouseEnter={stopScroll}
          onMouseLeave={startScroll}
          onTouchStart={stopScroll}
          onTouchEnd={startScroll}
        >
          {affiliates.map((affiliate) => (
            <div
              key={affiliate.id}
              className="flex items-center justify-between gap-3 border-b border-stroke py-3.5 dark:border-dark-3 last:border-b-0 last:pb-0"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium leading-tight truncate text-dark dark:text-white">
                  {affiliate.name} {affiliate.lastname}
                </span>
                <span className="text-xs text-dark-5 dark:text-dark-6">
                  {[affiliate.movil, affiliate.phone].filter(Boolean).join(' · ')}
                </span>
              </div>
              <Link
                href={`/4dnn1n/affiliates/${affiliate.id}/edit`}
                className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-gray-2 dark:hover:bg-dark-2"
                title="Renovar"
              >
                <RefreshCw className="h-4 w-4 text-dark-5 dark:text-dark-6" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { getTodayAppointments, type TodayAppointment } from '@/app/4dnn1n/home/fetch';
import { TodayAppointmentsCardSkeleton } from './today-appointments-card-skeleton';

export function TodayAppointmentsCard() {
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getTodayAppointments().then(({ data }) => {
      setAppointments(data);
      setLoading(false);
    });
  }, []);

  const startScroll = () => {
    const el = containerRef.current;
    if (!el || appointments.length <= 5) return;
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
  }, [loading, appointments.length]);

  if (loading) return <TodayAppointmentsCardSkeleton />;

  return (
    <div className="rounded-[10px] bg-white px-7.5 py-6 shadow-1 dark:bg-gray-dark dark:shadow-card flex flex-col gap-1 h-full">
      <h3 className="mb-2 text-xl font-bold text-dark dark:text-white">Citas pendientes del día</h3>

      {appointments.length === 0 ? (
        <p className="py-8 text-center text-sm text-dark-5 dark:text-dark-6">
          No hay citas para hoy
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
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="flex items-center justify-between gap-3 border-b border-stroke py-3.5 dark:border-dark-3 last:border-b-0 last:pb-0"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium leading-tight truncate text-dark dark:text-white">
                  {appt.name}
                </span>
                <span className="text-xs text-dark-5 dark:text-dark-6">
                  {appt.hour} · {appt.doctor.name} {appt.doctor.lastname}
                </span>
              </div>
              <Link
                href={`/4dnn1n/appointments/${appt.id}`}
                className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-gray-2 dark:hover:bg-dark-2"
                title="Ver cita"
              >
                <Eye className="h-4 w-4 text-dark-5 dark:text-dark-6" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

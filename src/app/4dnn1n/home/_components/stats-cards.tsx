'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats, type DashboardStats } from '@/app/4dnn1n/home/fetch';
import { StatsCardsSkeleton } from './stats-cards-skeleton';

export function StatsCards() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.type !== 1) {
      setLoading(false);
      return;
    }
    getDashboardStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, [user]);

  if (!user || user.type !== 1) return null;
  if (loading) return <StatsCardsSkeleton />;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
        <p className="text-sm font-medium text-dark-5 dark:text-dark-6">Afiliados activos</p>
        <p className="mt-2 text-[28px] font-bold text-green-500">
          {stats.affiliates.active.toLocaleString('es-CO')}
        </p>
      </div>

      <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
        <p className="text-sm font-medium text-dark-5 dark:text-dark-6">Afiliados inactivos</p>
        <p className="mt-2 text-[28px] font-bold text-orange-500">
          {stats.affiliates.inactive.toLocaleString('es-CO')}
        </p>
        <p className="mt-1 text-xs text-dark-5 dark:text-dark-6">
          {stats.affiliates.inactive_by_expiry} por vencimiento de vigencia
        </p>
      </div>

      <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
        <p className="text-sm font-medium text-dark-5 dark:text-dark-6">Citas este mes</p>
        <p className="mt-2 text-[28px] font-bold text-blue-500">
          {stats.appointments.this_month.toLocaleString('es-CO')}
        </p>
      </div>
    </div>
  );
}

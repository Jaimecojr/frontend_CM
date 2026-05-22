'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { useAuth } from '@/context/AuthContext';
import { getDashboardCharts, type DashboardCharts } from '@/app/4dnn1n/home/fetch';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const BASE_CHART: ApexOptions['chart'] = {
  toolbar: { show: false },
  fontFamily: 'inherit',
  background: 'transparent',
};

const BASE_XAXIS: ApexOptions['xaxis'] = {
  categories: MESES,
  axisBorder: { show: false },
  axisTicks: { show: false },
};

const BASE_GRID: ApexOptions['grid'] = {
  strokeDashArray: 5,
  yaxis: { lines: { show: true } },
  xaxis: { lines: { show: false } },
};

const BASE_DATALABELS: ApexOptions['dataLabels'] = { enabled: false };

function ChartSkeleton() {
  return <div className="h-[270px] animate-pulse rounded-lg bg-gray-2 dark:bg-dark-2" />;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] bg-white px-7.5 pt-6 pb-4 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <h3 className="mb-4 text-body-sm font-bold text-dark dark:text-white">{title}</h3>
      {children}
    </div>
  );
}

export function ChartsSection() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    getDashboardCharts(year)
      .then((d) => { setData(d); })
      .catch(() => {})
      .finally(() => { setLoading(false); });
  }, [year]);

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-body-2xlg font-bold text-dark dark:text-white">Actividad</h2>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-stroke bg-white px-3 py-1.5 text-sm font-medium text-dark outline-none dark:border-dark-3 dark:bg-gray-dark dark:text-white"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Citas por mes">
          {loading ? <ChartSkeleton /> : (
            <div className="-ml-3.5">
              <ReactApexChart
                type="bar"
                height={270}
                options={{
                  chart: BASE_CHART,
                  xaxis: BASE_XAXIS,
                  grid: BASE_GRID,
                  dataLabels: BASE_DATALABELS,
                  colors: ['#5750F1'],
                  plotOptions: { bar: { borderRadius: 4, columnWidth: '50%', borderRadiusApplication: 'end' } },
                  tooltip: { marker: { show: true } },
                }}
                series={[{ name: 'Citas', data: data?.appointments_by_month ?? [] }]}
              />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Afiliados nuevos por mes">
          {loading ? <ChartSkeleton /> : (
            <div className="-ml-4 -mr-5">
              <ReactApexChart
                type="area"
                height={270}
                options={{
                  chart: BASE_CHART,
                  xaxis: BASE_XAXIS,
                  grid: BASE_GRID,
                  dataLabels: BASE_DATALABELS,
                  colors: ['#0ABEF9'],
                  stroke: { curve: 'smooth', width: 2 },
                  fill: { gradient: { opacityFrom: 0.45, opacityTo: 0 } },
                  markers: { size: 4 },
                  tooltip: { marker: { show: true } },
                }}
                series={[{ name: 'Afiliados', data: data?.affiliates_by_month ?? [] }]}
              />
            </div>
          )}
        </ChartCard>
      </div>

      {user?.type === 1 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ChartCard title="Citas por franquicia">
            {loading || !data?.by_franchise ? <ChartSkeleton /> : (
              <div className="-ml-4 -mr-5">
                <ReactApexChart
                  type="line"
                  height={270}
                  options={{
                    chart: BASE_CHART,
                    xaxis: BASE_XAXIS,
                    grid: BASE_GRID,
                    dataLabels: BASE_DATALABELS,
                    stroke: { curve: 'smooth', width: 2 },
                    legend: {
                      position: 'top',
                      horizontalAlign: 'left',
                      fontFamily: 'inherit',
                      fontWeight: 500,
                      fontSize: '14px',
                      markers: { size: 9, shape: 'circle' as const },
                    },
                    markers: { size: 3 },
                    tooltip: { marker: { show: true } },
                  }}
                  series={data.by_franchise.users.map((u, i) => ({
                    name: u.name,
                    data: data.by_franchise!.appointments_by_franchise[i],
                  }))}
                />
              </div>
            )}
          </ChartCard>

          <ChartCard title="Afiliados nuevos por franquicia">
            {loading || !data?.by_franchise ? <ChartSkeleton /> : (
              <div className="-ml-3.5">
                <ReactApexChart
                  type="bar"
                  height={270}
                  options={{
                    chart: BASE_CHART,
                    xaxis: BASE_XAXIS,
                    grid: BASE_GRID,
                    dataLabels: BASE_DATALABELS,
                    plotOptions: { bar: { borderRadius: 3, columnWidth: '50%', borderRadiusApplication: 'end' } },
                    legend: {
                      position: 'top',
                      horizontalAlign: 'left',
                      fontFamily: 'inherit',
                      fontWeight: 500,
                      fontSize: '14px',
                      markers: { size: 9, shape: 'circle' as const },
                    },
                    tooltip: { marker: { show: true } },
                  }}
                  series={data.by_franchise.users.map((u, i) => ({
                    name: u.name,
                    data: data.by_franchise!.affiliates_by_franchise[i],
                  }))}
                />
              </div>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

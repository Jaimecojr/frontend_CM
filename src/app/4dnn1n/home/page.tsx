import { ExpiringTodayCard } from './_components/expiring-today-card';
import { TodayAppointmentsCard } from './_components/today-appointments-card';
import { StatsCards } from './_components/stats-cards';
import { ChartsSection } from './_components/charts-section';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Fila 1: Contratos que vencen hoy + Citas del día */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ExpiringTodayCard />
        <TodayAppointmentsCard />
      </div>

      {/* Fila 2: Métricas globales — se oculta automáticamente si no es type=1 */}
      <StatsCards />

      {/* Filas 3 y 4: Gráficas generales + por franquicia */}
      <ChartsSection />
    </div>
  );
}

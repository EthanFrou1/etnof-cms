import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import StatTile from "../../components/charts/StatTile";
import HorizontalBarChart from "../../components/charts/HorizontalBarChart";

type Stats = {
  totalSites: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byModule: Record<string, number>;
};

export default function OverviewSection({ password }: { password: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminFetch(API_BASE_URL, "/api/admin/stats", password)
      .then((res) => res.json())
      .then(setStats);
  }, [password]);

  const toBars = (record: Record<string, number>) =>
    Object.entries(record).map(([label, value]) => ({ label, value }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">Tableau de bord</h1>
        <p className="text-sm text-gray-text">Statistiques agrégées sur l'ensemble de vos projets clients.</p>
      </div>

      {!stats ? (
        <p className="text-sm text-gray-text">Chargement des statistiques…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Sites au total" value={stats.totalSites} />
            <StatTile label="Livrés" value={stats.byStatus["Livré"] ?? 0} tone="green" />
            <StatTile label="En cours" value={stats.byStatus["En cours"] ?? 0} tone="blue" />
            <StatTile label="En maintenance" value={stats.byStatus["En maintenance"] ?? 0} tone="amber" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <HorizontalBarChart title="Modules utilisés" data={toBars(stats.byModule)} />
            <HorizontalBarChart title="Types de site" data={toBars(stats.byType)} />
          </div>
        </div>
      )}
    </div>
  );
}

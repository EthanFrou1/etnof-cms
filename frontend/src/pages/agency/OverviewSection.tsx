import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { adminFetch } from "../../hooks/useAdminSession";
import StatTile from "../../components/charts/StatTile";
import HorizontalBarChart from "../../components/charts/HorizontalBarChart";

type UpcomingBooking = {
  id: string;
  clientSiteId: string;
  siteName: string;
  startsAt: string;
  customerName: string;
};

type Stats = {
  totalSites: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byModule: Record<string, number>;
  revenueThisMonth: number;
  overdueInvoicesCount: number;
  overdueInvoicesTotal: number;
  upcomingBookings: UpcomingBooking[];
};

const formatPrice = (value: number) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function UpcomingBookingsCard({ bookings }: { bookings: UpcomingBooking[] }) {
  return (
    <section className="rounded-card bg-white p-6 shadow-card">
      <h2 className="mb-4 text-lg font-bold text-navy">Rendez-vous à venir (tous sites)</h2>
      {bookings.length === 0 ? (
        <p className="text-sm text-gray-text">Aucun rendez-vous à venir.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => (
            <div key={b.id} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-navy">
                  {b.customerName} <span className="font-normal text-gray-text">— {b.siteName}</span>
                </span>
                <span className="shrink-0 text-xs text-gray-text">
                  {new Date(b.startsAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

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
            <StatTile label="CA encaissé ce mois" value={formatPrice(stats.revenueThisMonth)} tone="green" />
            <StatTile
              label="Factures en retard"
              value={stats.overdueInvoicesCount > 0 ? `${stats.overdueInvoicesCount} · ${formatPrice(stats.overdueInvoicesTotal)}` : 0}
              tone={stats.overdueInvoicesCount > 0 ? "amber" : "navy"}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <UpcomingBookingsCard bookings={stats.upcomingBookings} />
            <HorizontalBarChart title="Modules utilisés" data={toBars(stats.byModule)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <HorizontalBarChart title="Types de site" data={toBars(stats.byType)} />
          </div>
        </div>
      )}
    </div>
  );
}

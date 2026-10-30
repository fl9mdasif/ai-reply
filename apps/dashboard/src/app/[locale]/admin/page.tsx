export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Admin Overview</h1>
      <p className="text-[#6B7280] text-sm mb-6">Platform statistics and quick actions</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Sellers', value: '—' },
          { label: 'Active Sellers', value: '—' },
          { label: 'Orders Today', value: '—' },
          { label: 'High Risk Orders', value: '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#141414] rounded-xl border border-[#1F1F1F] p-4">
            <p className="text-xs text-[#6B7280] mb-1">{label}</p>
            <p className="text-2xl font-bold text-[#C6FF33]">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#141414] rounded-xl border border-[#1F1F1F] p-6">
        <h2 className="font-semibold text-white mb-4">Recent Signups</h2>
        <p className="text-[#4B5563] text-sm text-center py-8">No data yet.</p>
      </div>
    </div>
  );
}

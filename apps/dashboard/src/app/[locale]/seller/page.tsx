export default function SellerOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#09090B] mb-1">Overview</h1>
      <p className="text-[#6B7280] text-sm mb-6">Welcome to your jobabai dashboard</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Orders', value: '—', color: '#7D39EB' },
          { label: 'Pending', value: '—', color: '#F59E0B' },
          { label: 'Confirmed', value: '—', color: '#22C55E' },
          { label: 'Cancelled', value: '—', color: '#6B7280' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-[#EDE9FE] p-4"
          >
            <p className="text-xs text-[#6B7280] mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#EDE9FE] p-6">
        <h2 className="font-semibold text-[#09090B] mb-4">Recent Orders</h2>
        <p className="text-[#9CA3AF] text-sm text-center py-8">
          No orders yet. Connect your Facebook Page to start receiving orders.
        </p>
      </div>
    </div>
  );
}

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const data = [
  { month: "Jan", earnings: 1200 },
  { month: "Feb", earnings: 1800 },
  { month: "Mar", earnings: 1500 },
  { month: "Apr", earnings: 2500 },
  { month: "May", earnings: 3200 },
  { month: "Jun", earnings: 4100 },
];

const EarningsChart = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">

      <h2 className="text-xl font-bold mb-6">
        Monthly Earnings
      </h2>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data}>

          <defs>
            <linearGradient id="earnings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="month" />

          <Tooltip />

          <Area
            type="monotone"
            dataKey="earnings"
            stroke="#2563eb"
            fill="url(#earnings)"
          />

        </AreaChart>
      </ResponsiveContainer>

    </div>
  );
};

export default EarningsChart;
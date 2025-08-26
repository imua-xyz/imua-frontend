// components/ui/line-chart.tsx
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from "recharts";

interface LineChartProps {
  data: Array<{
    date: string;
    value: number;
  }>;
  color?: string;
  id?: string; // Add unique ID for gradient
}

export function LineChart({
  data,
  color = "#00e5ff",
  id = "chart",
}: LineChartProps) {
  // Create unique gradient ID to avoid collisions
  const gradientId = `colorValue-${id}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart
        data={data}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9999aa" }}
          axisLine={{ stroke: "#222233" }}
          tickLine={false}
        />
        <YAxis
          hide={true}
          domain={["dataMin - 5%", "dataMax + 5%"]} // Add some padding to y-axis
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1a24",
            border: "1px solid #222233",
            borderRadius: "8px",
            color: "white",
          }}
          labelStyle={{ color: "#9999aa" }}
        />
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#222233"
          vertical={false}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function TimeSeries({ data }) {
    if (!data || data.length === 0) return null;

    return (
        <div className="bg-slate-800 p-4 rounded-xl shadow h-40 border border-slate-700">
            <h4 className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Transaction Volume (30 days)</h4>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="susp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="norm" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }}
                        itemStyle={{ color: "#f1f5f9" }}
                    />
                    <Area type="monotone" dataKey="suspicious" stroke="#ef4444" fillOpacity={1} fill="url(#susp)" strokeWidth={2} />
                    <Area type="monotone" dataKey="normal" stroke="#0ea5e9" fillOpacity={0.3} fill="url(#norm)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

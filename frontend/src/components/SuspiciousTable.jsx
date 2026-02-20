export default function SuspiciousTable({ nodes, onRowClick }) {
    // Filter only suspicious nodes
    const suspiciousNodes = nodes.filter((n) => n.suspicious || n.data?.is_suspicious);

    return (
        <div className="bg-slate-800 p-4 rounded-xl shadow h-[420px] overflow-auto border border-slate-700">
            <h4 className="text-lg font-semibold mb-3">Suspicious Accounts</h4>
            <table className="w-full text-sm table-auto text-left">
                <thead>
                    <tr className="text-xs text-gray-400 border-b border-slate-700">
                        <th className="p-2 pb-3">Account</th>
                        <th className="pb-3">Score</th>
                        <th className="pb-3">Flags</th>
                    </tr>
                </thead>
                <tbody>
                    {suspiciousNodes
                        .slice(0, 200)
                        .map((n) => (
                            <tr
                                key={n.id}
                                onClick={() => onRowClick(n)}
                                className="cursor-pointer hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 last:border-0"
                            >
                                <td className="p-2 py-3 font-mono text-gray-300">{n.id}</td>
                                <td className="py-3 font-bold text-rose-400">{n.score || n.data?.risk_score || n.suspicion_score}</td>
                                <td className="py-3 text-xs text-gray-400">
                                    {n.meta?.ring || n.data?.detected_patterns?.join(", ") || "suspicious"}
                                </td>
                            </tr>
                        ))}
                    {suspiciousNodes.length === 0 && (
                        <tr><td colSpan="3" className="text-center py-10 text-gray-500">No suspicious accounts found</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

import { motion } from "framer-motion";

export default function FraudTable({ rings }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel p-6 rounded-2xl relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <div className="bg-amber-500 w-32 h-32 rounded-full blur-3xl"></div>
            </div>

            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <span className="w-1 h-6 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)]"></span>
                Detected Fraud Rings
                <span className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50">
                    {rings?.length || 0} CLUSTERS
                </span>
            </h2>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="text-slate-400 border-b border-slate-700/50">
                            <th className="py-3 px-4 font-mono text-xs uppercase tracking-wider">Ring ID</th>
                            <th className="py-3 px-4 font-mono text-xs uppercase tracking-wider">Pattern</th>
                            <th className="py-3 px-4 font-mono text-xs uppercase tracking-wider">Risk Score</th>
                            <th className="py-3 px-4 font-mono text-xs uppercase tracking-wider">Members</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {rings?.map((ring, i) => (
                            <motion.tr
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="group/row hover:bg-slate-800/30 transition-colors"
                            >
                                <td className="py-3 px-4 font-mono text-sky-400 group-hover/row:text-sky-300">
                                    {ring.ring_id}
                                </td>
                                <td className="py-3 px-4">
                                    <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs capitalize text-slate-300 shadow-sm">
                                        {ring.pattern_type.replace(/_/g, " ")}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-rose-400 font-bold neon-text" style={{ textShadow: "0 0 10px rgba(244, 63, 94, 0.3)" }}>
                                        {ring.risk_score}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-slate-400 text-xs font-mono max-w-md truncate">
                                    {ring.member_accounts.join(", ")}
                                </td>
                            </motion.tr>
                        ))}
                        {(!rings || rings.length === 0) && (
                            <tr>
                                <td colSpan="4" className="text-center py-8 text-slate-500 italic">
                                    No fraud rings detected in current analysis.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}

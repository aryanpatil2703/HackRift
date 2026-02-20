import { motion } from "framer-motion";

export default function RingExplorer({ rings, onSelect }) {
    return (
        <div className="bg-slate-800 p-4 rounded-xl shadow h-[420px] overflow-auto border border-slate-700">
            <h4 className="text-lg font-semibold mb-3">Fraud Rings</h4>
            <div className="space-y-3">
                {rings.map((r) => (
                    <motion.div
                        key={r.id || r.ring_id}
                        whileHover={{ x: 4 }}
                        className="p-3 bg-slate-700/50 rounded flex items-center justify-between border border-slate-600/50 cursor-pointer"
                        onClick={() => onSelect(r)}
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="font-semibold">{r.id || r.ring_id}</div>
                                <div className="text-xs text-gray-300 px-2 py-1 rounded bg-slate-600 capitalize">
                                    {r.pattern || r.pattern_type?.replace(/_/g, " ")}
                                </div>
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                                Members: {r.members?.length || r.member_accounts?.length || 0}
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="text-amber-400 font-bold">{r.score || r.risk_score}</div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelect(r); }}
                                className="mt-2 bg-sky-600/20 text-sky-400 border border-sky-600/30 px-3 py-1 rounded text-xs hover:bg-sky-600 hover:text-white transition-colors"
                            >
                                Inspect
                            </button>
                        </div>
                    </motion.div>
                ))}
                {rings.length === 0 && <div className="text-gray-500 text-sm text-center py-10">No fraud rings detected</div>}
            </div>
        </div>
    );
}

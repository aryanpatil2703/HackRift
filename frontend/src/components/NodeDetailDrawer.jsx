import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function NodeDetailDrawer({ node, onClose }) {
    const isSuspicious = node?.suspicious || node?.is_suspicious;
    const score = node?.score || node?.risk_score;
    const flags = node?.meta?.ring || node?.detected_patterns?.join(", ") || (isSuspicious ? "Suspicious Activity" : "None");

    return (
        <AnimatePresence>
            {node && (
                <motion.div
                    initial={{ x: 400, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 400, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed right-6 top-24 w-96 bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-2xl z-50"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-semibold text-lg text-white font-mono">{node.id || node.account_id}</h4>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg">
                            <span className="text-sm text-gray-400">Risk Score</span>
                            <span className={`font-bold text-xl ${score >= 50 ? 'text-rose-400' : 'text-sky-400'}`}>
                                {score || 0}
                            </span>
                        </div>

                        <div className="bg-slate-900/50 p-3 rounded-lg">
                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Flags</div>
                            <div className="text-sm text-gray-200">{flags}</div>
                        </div>

                        <div className="mt-4">
                            <h5 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Details</h5>
                            <div className="space-y-2 text-xs">
                                {node.in_degree !== undefined && (
                                    <div className="flex justify-between text-gray-300"><div>In Degree</div><div>{node.in_degree}</div></div>
                                )}
                                {node.out_degree !== undefined && (
                                    <div className="flex justify-between text-gray-300"><div>Out Degree</div><div>{node.out_degree}</div></div>
                                )}
                                {node.total_volume !== undefined && (
                                    <div className="flex justify-between text-gray-300"><div>Total Volume</div><div>₹{node.total_volume?.toLocaleString()}</div></div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button className="flex-1 bg-rose-600/20 text-rose-400 border border-rose-600/30 py-2 rounded text-sm hover:bg-rose-600 hover:text-white transition-colors">
                            Mark Review
                        </button>
                        <button className="flex-1 bg-slate-700 text-gray-300 py-2 rounded text-sm hover:bg-slate-600 transition-colors">
                            Add Note
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

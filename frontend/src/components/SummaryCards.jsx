import { motion } from "framer-motion";

export default function SummaryCards({ summary }) {
    if (!summary) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:col-span-2">
            <motion.div
                whileHover={{ y: -4, boxShadow: "0 10px 40px -10px rgba(244, 63, 94, 0.4)" }}
                className="bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden group transition-all duration-300"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity duration-500">
                    <div className="bg-rose-500 w-24 h-24 rounded-full blur-2xl"></div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                    <p className="text-xs text-rose-200 uppercase tracking-widest font-semibold">High Risk</p>
                </div>

                <div className="mt-2 flex items-baseline gap-2 relative z-10">
                    <h3 className="text-4xl font-bold text-white neon-text" style={{ textShadow: "0 0 20px rgba(244, 63, 94, 0.5)" }}>
                        {summary.suspicious_accounts || 0}
                    </h3>
                    <span className="text-xs text-slate-400">accounts flagged</span>
                </div>

                <div className="w-full bg-slate-700/50 h-1.5 mt-6 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "40%" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="bg-gradient-to-r from-rose-600 to-rose-400 h-full shadow-[0_0_10px_rgba(244,63,94,0.7)]"
                    ></motion.div>
                </div>
            </motion.div>

            <motion.div
                whileHover={{ y: -4, boxShadow: "0 10px 40px -10px rgba(245, 158, 11, 0.4)" }}
                className="bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden group transition-all duration-300"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity duration-500">
                    <div className="bg-amber-500 w-24 h-24 rounded-full blur-2xl"></div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <p className="text-xs text-amber-200 uppercase tracking-widest font-semibold">Fraud Rings</p>
                </div>

                <div className="mt-2 flex items-baseline gap-2 relative z-10">
                    <h3 className="text-4xl font-bold text-white neon-text" style={{ textShadow: "0 0 20px rgba(245, 158, 11, 0.5)" }}>
                        {summary.fraud_rings || 0}
                    </h3>
                    <span className="text-xs text-slate-400">active clusters</span>
                </div>

                <div className="w-full bg-slate-700/50 h-1.5 mt-6 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "25%" }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                        className="bg-gradient-to-r from-amber-600 to-amber-400 h-full shadow-[0_0_10px_rgba(245,158,11,0.7)]"
                    ></motion.div>
                </div>
            </motion.div>

            <motion.div
                whileHover={{ y: -4, boxShadow: "0 10px 40px -10px rgba(59, 130, 246, 0.4)" }}
                className="bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden group transition-all duration-300"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity duration-500">
                    <div className="bg-sky-500 w-24 h-24 rounded-full blur-2xl"></div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                    <p className="text-xs text-sky-200 uppercase tracking-widest font-semibold">Total Scanned</p>
                </div>

                <div className="mt-2 flex items-baseline gap-2 relative z-10">
                    <h3 className="text-4xl font-bold text-white neon-text" style={{ textShadow: "0 0 20px rgba(59, 130, 246, 0.5)" }}>
                        {summary.total_analyzed || 0}
                    </h3>
                    <span className="text-xs text-slate-400">entities</span>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 text-xs text-slate-400 font-mono">
                    <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span>{summary.processing_time_s?.toFixed(4)}s latency</span>
                </div>
            </motion.div>
        </div>
    );
}

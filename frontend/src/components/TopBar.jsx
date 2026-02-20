import { Search, UploadCloud, Layers } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function TopBar({ onUploadSample, onOpenSettings, onSearch, query, setQuery }) {
    const [file, setFile] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            onUploadSample(selectedFile);
        }
    };

    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center justify-between gap-4 mb-8 glass-panel p-4 rounded-2xl sticky top-4 z-50 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-lg"
        >
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        className="p-2.5 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-xl shadow-lg shadow-sky-900/20"
                    >
                        <UploadCloud className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                            Money Laundering Detection System
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] text-sky-400 font-mono tracking-widest uppercase opacity-80">
                                System Active
                            </span>
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex items-center bg-slate-900/50 rounded-xl px-4 py-2 border border-slate-700/50 focus-within:border-sky-500/50 focus-within:ring-1 focus-within:ring-sky-500/20 transition-all w-96">
                    <Search className="h-4 w-4 text-slate-400 mr-3" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search account ID, ring ID..."
                        className="bg-transparent outline-none w-full text-sm text-slate-200 placeholder-slate-500"
                    />
                    {query && (
                        <button onClick={() => setQuery("")} className="text-xs text-slate-500 hover:text-white transition-colors">
                            ESC
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Hidden file input controlled by the button */}
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".csv"
                />
                <motion.label
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    htmlFor="file-upload"
                    className="bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-sky-500/20 flex items-center gap-2 text-sm font-semibold cursor-pointer transition-all border border-sky-500/20"
                >
                    <UploadCloud className="h-4 w-4" />
                    Upload Dataset
                </motion.label>

                <motion.button
                    whileHover={{ scale: 1.05, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onOpenSettings}
                    className="bg-slate-800 p-2.5 rounded-xl hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                    <Layers className="h-5 w-5 text-slate-300" />
                </motion.button>
            </div>
        </motion.div>
    );
}

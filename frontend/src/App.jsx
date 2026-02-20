import { useState, useEffect } from "react";
import axios from "axios";
import TopBar from "./components/TopBar";
import SummaryCards from "./components/SummaryCards";
import TransactionGraph from "./components/TransactionGraph";
import TimeSeries from "./components/TimeSeries";
import RingExplorer from "./components/RingExplorer";
import SuspiciousTable from "./components/SuspiciousTable";
import NodeDetailDrawer from "./components/NodeDetailDrawer";
import FraudTable from "./components/FraudTable";

import ParticleBackground from "./components/ParticleBackground";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
    const [analysis, setAnalysis] = useState(null);
    const [query, setQuery] = useState("");
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedRing, setSelectedRing] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Boot Sequence State
    const [booting, setBooting] = useState(true);
    const [bootStep, setBootStep] = useState(0);

    useEffect(() => {
        const steps = [
            "Initializing Secure Environment...",
            "Loading Graph Engines...",
            "Connecting to AML Neural Net...",
            "System Ready."
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep >= steps.length - 1) {
                clearInterval(interval);
                setTimeout(() => setBooting(false), 800);
            } else {
                currentStep++;
                setBootStep(currentStep);
            }
        }, 600);

        return () => clearInterval(interval);
    }, []);

    const bootText = [
        "Initializing Secure Environment...",
        "Loading Graph Engines...",
        "Connecting to AML Neural Net...",
        "System Ready."
    ];

    const handleUploadSample = async (file) => {
        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const API_URL = import.meta.env.VITE_API_URL || "/api"; // Fallback to proxy if not set
            const res = await axios.post(`${API_URL}/upload`, formData);
            const data = res.data;

            // Transform Backend Data (Cytoscape format) to Frontend Format (React Flow)
            // Backend nodes: [{ data: { id: "ACC_A", ... } }]
            // Backend edges: [{ data: { source: "ACC_A", target: "ACC_B", ... } }]

            const nodes = data.graph_data.nodes.map(n => {
                const nodeData = n.data; // Unwrap Cytoscape 'data' wrapper
                const susp = data.suspicious_accounts.find(sa => sa.account_id === nodeData.id);
                return {
                    id: nodeData.id,
                    ...nodeData,
                    suspicious: !!susp || nodeData.is_suspicious,
                    score: (susp ? susp.suspicion_score : 0) || nodeData.suspicion_score || 0,
                    meta: { ring: susp?.detected_patterns?.join(", ") || nodeData.patterns?.join(", ") }
                };
            });

            const edges = data.graph_data.edges.map(e => {
                const edgeData = e.data; // Unwrap Cytoscape 'data' wrapper
                return {
                    id: edgeData.id,
                    source: edgeData.source,
                    target: edgeData.target,
                    ...edgeData
                };
            });

            // Generate dummy timeseries (since backend doesn't provide it yet)
            const timeseries = Array.from({ length: 30 }, (_, i) => ({
                date: `2025-02-${String(i + 1).padStart(2, "0")}`,
                suspicious: Math.round(Math.random() * 50),
                normal: Math.round(50 + Math.random() * 400),
            }));

            setAnalysis({
                nodes: nodes,
                edges: edges,
                rings: data.fraud_rings,
                summary: {
                    suspicious_accounts: data.summary.suspicious_accounts_flagged,
                    fraud_rings: data.summary.fraud_rings_detected,
                    total_analyzed: data.summary.total_accounts_analyzed,
                    processing_time_s: data.summary.processing_time_seconds
                },
                timeseries: timeseries
            });

        } catch (err) {
            console.error(err);
            setError("Analysis failed. Please check the backend connection or file format.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (q) => {
        if (!q || !analysis) return;
        const node = analysis.nodes.find((n) => n.id.toLowerCase() === q.toLowerCase());
        if (node) {
            setSelectedNode(node);
            return;
        }
        const ring = analysis.rings.find((r) => (r.id || r.ring_id).toLowerCase() === q.toLowerCase());
        if (ring) {
            // Automatically select the ring's first member to visualize it
            onSelectRing(ring);
        }
    };

    const onSelectRing = (r) => {
        // Find the first member node to inspect
        if (r.member_accounts && r.member_accounts.length > 0) {
            const firstMemberId = r.member_accounts[0];
            const node = analysis.nodes.find(n => n.id === firstMemberId);
            if (node) setSelectedNode(node);
        }
    };

    const onNodeClick = (n) => {
        // n coming from ReactFlow node.data
        const fullNode = analysis.nodes.find((x) => x.id === n.id);
        setSelectedNode(fullNode);
    };

    return (
        <div className="min-h-screen text-slate-100 p-6 font-sans selection:bg-sky-500/30 relative">
            <ParticleBackground />

            <AnimatePresence>
                {booting && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                        transition={{ duration: 0.8 }}
                        className="fixed inset-0 z-[100] bg-[#050B14] flex flex-col items-center justify-center font-mono"
                    >
                        <div className="w-64">
                            <div className="flex justify-between text-xs text-sky-500 mb-1">
                                <span>SYSTEM_BOOT</span>
                                <span>v2026.1.0</span>
                            </div>
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 2.5, ease: "easeInOut" }}
                                    className="h-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.8)]"
                                ></motion.div>
                            </div>
                            <div className="mt-4 text-center">
                                <p className="text-sky-400 text-sm animate-pulse">
                                    {bootText[bootStep]}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-[-1]">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.8, duration: 0.8 }}
            >
                <TopBar
                    onUploadSample={handleUploadSample}
                    onOpenSettings={() => alert("Settings panel placeholder")}
                    onSearch={handleSearch}
                    query={query}
                    setQuery={setQuery}
                />

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
                        <span className="ml-4 text-sky-400">Analyzing transaction graph...</span>
                    </div>
                )}
            </motion.div>

            {analysis && !loading && (
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-4">
                        <SummaryCards summary={analysis.summary} />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2 space-y-4">
                                <TransactionGraph
                                    nodes={analysis.nodes}
                                    edges={analysis.edges}
                                    onNodeClick={onNodeClick}
                                    selectedNode={selectedNode}
                                />
                                <FraudTable rings={analysis.rings} />
                            </div>

                            <div className="flex flex-col gap-4">
                                <TimeSeries data={analysis.timeseries} />

                                <div className="bg-slate-800/80 backdrop-blur-xl p-4 rounded-xl shadow border border-slate-700/50">
                                    <h4 className="text-sm text-gray-300">Quick Actions</h4>
                                    <div className="mt-3 flex flex-col gap-2">
                                        <button className="bg-rose-600 py-2 rounded flex items-center justify-center gap-2 hover:bg-rose-700 transition">Flag Selected</button>
                                        <button className="bg-slate-700 py-2 rounded hover:bg-slate-600 transition">Export Report (PDF)</button>
                                        <a
                                            href={`${import.meta.env.VITE_API_URL || "/api"}/download-json`}
                                            download
                                            className="bg-slate-700 py-2 rounded hover:bg-slate-600 transition text-center block"
                                        >
                                            Export JSON
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <RingExplorer rings={analysis.rings} onSelect={onSelectRing} />
                        <SuspiciousTable nodes={analysis.nodes} onRowClick={(n) => setSelectedNode(n)} />
                    </div>
                </div>
            )}

            {!analysis && !loading && (
                <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/20">
                    <p className="text-xl">Upload a transaction CSV to detecting money muling rings.</p>
                    <p className="text-sm mt-2">Supports Smurfing, Cycles, and Layered Shell verification.</p>
                </div>
            )}

            <NodeDetailDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />
        </div>
    );
}

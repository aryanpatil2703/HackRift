import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    MarkerType
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 180;
const nodeHeight = 50;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? 'left' : 'top';
        node.sourcePosition = isHorizontal ? 'right' : 'bottom';

        // Shift top-left
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes, edges };
};


const nodeColor = (score, suspicious) => {
    if (!suspicious) return "#0ea5e9"; // sky-500
    if (score >= 80) return "#f43f5e"; // rose-500
    if (score >= 50) return "#f59e0b"; // amber-500
    return "#eab308"; // yellow-500
};

// Debugging: Log initial nodes/edges to confirm props
export default function TransactionGraph({ nodes: initialNodes, edges: initialEdges, onNodeClick, selectedNode }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [layoutDirection, setLayoutDirection] = useState('TB'); // TB = Hierarchical, LR = Flow

    // React Flow Instance to control viewport
    const [reactFlowInstance, setReactFlowInstance] = useState(null);

    // Transform raw data into React Flow format with enhanced styling
    useLayoutEffect(() => {
        if (!initialNodes || !initialEdges) return;

        try {
            const rfNodes = initialNodes.slice(0, 400).map((n) => {
                const isSelected = selectedNode?.id === n.id;
                return {
                    id: n.id,
                    data: { label: n.id, ...n },
                    position: { x: 0, y: 0 }, // Placeholder, will be layouted
                    style: {
                        background: isSelected
                            ? "var(--node-selected-bg, rgba(14, 165, 233, 0.9))"
                            : "rgba(15, 23, 42, 0.9)", // slate-900/90 or sky-500
                        backdropFilter: "blur(10px)",
                        color: "#f1f5f9", // slate-100
                        width: nodeWidth,
                        border: isSelected
                            ? "2px solid #38bdf8"
                            : (n.suspicious || n.data?.is_suspicious
                                ? `2px solid ${nodeColor(n.score || n.data?.risk_score, true)}`
                                : "1px solid rgba(56, 189, 248, 0.3)"), // sky-400/30
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontFamily: "monospace",
                        boxShadow: isSelected
                            ? "0 0 30px rgba(56, 189, 248, 0.6)" // Strong Glow
                            : (n.suspicious
                                ? `0 0 15px -2px ${nodeColor(n.score, true)}`
                                : "0 4px 6px -1px rgba(0, 0, 0, 0.3)"),
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: nodeHeight,
                        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                        cursor: "pointer",
                        zIndex: isSelected ? 1000 : 1
                    },
                };
            });

            const rfEdges = initialEdges.slice(0, 1200).map((e, i) => ({
                id: e.id || `e${i}`,
                source: e.source,
                target: e.target,
                animated: true, // Always animated for "flow" feel
                style: {
                    stroke: "#38bdf8", // sky-400
                    strokeWidth: 1.5,
                    opacity: 0.6
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: "#38bdf8",
                },
            }));

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                rfNodes,
                rfEdges,
                layoutDirection // Dynamic layout direction!
            );

            setNodes([...layoutedNodes]);
            setEdges([...layoutedEdges]);
        } catch (error) {
            console.error("TransactionGraph: Layout Error", error);
        }
    }, [initialNodes, initialEdges, setNodes, setEdges, selectedNode, layoutDirection]); // Re-run on layout change or selection

    // Hover Interaction Logic
    const onNodeMouseEnter = useCallback((event, node) => {
        // Highlight this node and its neighbors
        const connectedEdgeIds = new Set();
        const connectedNodeIds = new Set();
        connectedNodeIds.add(node.id);

        edges.forEach((edge) => {
            if (edge.source === node.id || edge.target === node.id) {
                connectedEdgeIds.add(edge.id);
                connectedNodeIds.add(edge.source);
                connectedNodeIds.add(edge.target);
            }
        });

        setNodes((nds) => nds.map((n) => {
            if (connectedNodeIds.has(n.id)) {
                return {
                    ...n,
                    style: { ...n.style, opacity: 1, filter: 'brightness(1.2)' }
                };
            } else {
                return {
                    ...n,
                    style: { ...n.style, opacity: 0.2 }
                };
            }
        }));

        setEdges((eds) => eds.map((e) => {
            if (connectedEdgeIds.has(e.id)) {
                return {
                    ...e,
                    animated: true,
                    style: { ...e.style, stroke: "#38bdf8", strokeWidth: 2.5, opacity: 1 }
                };
            } else {
                return {
                    ...e,
                    animated: false,
                    style: { ...e.style, opacity: 0.1 }
                };
            }
        }));
    }, [edges, setNodes, setEdges]);

    const onNodeMouseLeave = useCallback(() => {
        // Reset styles
        // We need to re-apply the selected node style if it exists!
        // But doing a full re-render is expensive.
        // Simplification: Just reset opacity and let the effect above handle selection style on next render?
        // Or manually reset to base state.

        setNodes((nds) => nds.map((n) => {
            const isSelected = selectedNode?.id === n.id;
            return {
                ...n,
                style: {
                    ...n.style,
                    opacity: 1,
                    filter: 'none',
                    // Re-apply selection glow if needed? (Actually the style object is mutated by hover, so we just reset opacity)
                }
            };
        }));

        setEdges((eds) => eds.map((e) => ({
            ...e,
            animated: true,
            style: { stroke: "#38bdf8", strokeWidth: 1.5, opacity: 0.6 }
        })));
    }, [setNodes, setEdges, selectedNode]);

    // Smart Focus Logic
    useEffect(() => {
        if (!selectedNode || !reactFlowInstance || nodes.length === 0) return;

        const targetNode = nodes.find(n => n.id === selectedNode.id);
        if (!targetNode) return;

        // Calculate bounds of the node and its neighbors
        const neighborIds = new Set();
        edges.forEach(e => {
            if (e.source === targetNode.id) neighborIds.add(e.target);
            if (e.target === targetNode.id) neighborIds.add(e.source);
        });

        const nodesToFocus = nodes.filter(n => n.id === targetNode.id || neighborIds.has(n.id));

        if (nodesToFocus.length > 0) {
            reactFlowInstance.fitView({
                nodes: nodesToFocus,
                padding: 0.2,
                duration: 1000,
            });
        }
    }, [selectedNode, reactFlowInstance, nodes, edges]);

    // Auto-Focus/Fit View on Upload (Initial Only)
    useEffect(() => {
        if (nodes.length > 0 && reactFlowInstance && !selectedNode) {
            reactFlowInstance.fitView({ padding: 0.2 });
        }
    }, [nodes.length, reactFlowInstance]); // Removed selectedNode to avoid re-fitting on selection unless logic above handles it

    return (
        <div className={`bg-slate-900/40 backdrop-blur-xl p-1 rounded-2xl shadow-2xl border border-white/10 relative overflow-hidden group transition-all duration-500 ease-in-out ${isFullscreen ? 'fixed inset-0 z-50 h-[100vh] w-screen m-0 rounded-none' : 'h-[600px]'}`}>
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

            <div className="absolute top-6 left-6 z-10 pointer-events-none select-none">
                <h3 className="text-xl font-bold text-white flex items-center gap-3 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]">
                    <span className="w-2 h-8 bg-sky-500 rounded-full shadow-[0_0_15px_rgba(14,165,233,1)] animate-pulse"></span>
                    Neural Transaction Net
                </h3>
                <div className="text-xs text-sky-400 mt-1 ml-5 font-mono opacity-80 pl-2 border-l border-sky-500/30">
                    {layoutDirection === 'TB' ? 'Hierarchical (Tree)' : 'Flow (Left-Right)'} • Live
                </div>
            </div>



            {/* View Controls (Top Right) */}
            <div className="absolute top-6 right-6 z-10 flex gap-2 bg-black/60 backdrop-blur p-2 rounded-lg border border-white/10 shadow-xl">
                <button
                    onClick={() => setLayoutDirection(d => d === 'TB' ? 'LR' : 'TB')}
                    className="px-3 py-1 text-xs rounded-md border border-slate-700 text-slate-400 hover:text-white hover:border-sky-500 transition-all flex items-center gap-2"
                    title="Toggle Layout Direction"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {layoutDirection === 'TB' ? 'Vertical' : 'Horizontal'}
                </button>

                <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className={`px-3 py-1 text-xs rounded-md border border-slate-700 text-slate-400 hover:text-white hover:border-sky-500 transition-all flex items-center gap-2 ${isFullscreen ? 'bg-sky-500/10 text-sky-400' : ''}`}
                    title="Toggle Fullscreen"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {isFullscreen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        )}
                    </svg>
                    {isFullscreen ? 'Exit' : 'Expand'}
                </button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2 bg-black/60 backdrop-blur p-3 rounded-lg border border-white/10 shadow-xl pointer-events-none">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"></span>
                    <span>High Risk (&gt;80)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></span>
                    <span>Med Risk (&gt;50)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-3 h-3 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.8)]"></span>
                    <span>Normal Account</span>
                </div>
            </div>

            <div className="absolute bottom-6 right-6 z-10 flex gap-2">
                <div className="bg-black/60 backdrop-blur px-3 py-1 rounded-md text-[10px] text-slate-400 border border-white/10 font-mono shadow-lg">
                    <span className="text-sky-400 font-bold">{nodes.length}</span> NODES
                </div>
                <div className="bg-black/60 backdrop-blur px-3 py-1 rounded-md text-[10px] text-slate-400 border border-white/10 font-mono shadow-lg">
                    <span className="text-sky-400 font-bold">{edges.length}</span> LINKS
                </div>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onInit={setReactFlowInstance}
                fitView
                onNodeDoubleClick={(e, n) => onNodeClick(n.data)}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                className="rounded-xl"
                attributionPosition="bottom-left"
            >
                <Background color="#94a3b8" gap={30} size={1} style={{ opacity: 0.1 }} />
                <Controls className="bg-slate-800 border-slate-700 text-white shadow-xl hover:bg-slate-700 rounded-lg overflow-hidden" showInteractive={false} />
                <MiniMap
                    nodeStrokeColor={() => "transparent"}
                    nodeColor={(n) => {
                        if (n.style?.border?.includes("#f43f5e") || n.style?.border?.includes("#ef4444")) return "#f43f5e";
                        return "#475569";
                    }}
                    maskColor="rgba(2, 6, 23, 0.8)"
                    className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl !bottom-20 !right-6" // Move it up above stats
                />
            </ReactFlow>
        </div >
    );
}

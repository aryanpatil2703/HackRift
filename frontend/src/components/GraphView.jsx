import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import { useEffect, useState } from "react";

export default function GraphView({ graphData }) {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    useEffect(() => {
        if (graphData) {
            // Simple random layout for now (force-directed would be better but requires d3-force or layout engine)
            // Adjusting positions slightly to spread them out
            const newNodes = graphData.nodes?.map((n) => ({
                id: n.data.id,
                data: { label: n.data.id },
                position: { x: Math.random() * 800, y: Math.random() * 600 },
                style: {
                    background: n.data.is_suspicious ? "#ef4444" : "#3b82f6",
                    color: "white",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px"
                },
            })) || [];

            const newEdges = graphData.edges?.map((e) => ({
                id: e.data.id,
                source: e.data.source,
                target: e.data.target,
                animated: true,
                style: { stroke: "#64748b" }
            })) || [];

            setNodes(newNodes);
            setEdges(newEdges);
        }
    }, [graphData]);

    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow h-[600px]">
            <h2 className="text-xl font-semibold mb-4">
                Transaction Graph
            </h2>
            <div style={{ height: "100%", width: "100%" }}>
                <ReactFlow nodes={nodes} edges={edges} fitView>
                    <Background color="#aaa" gap={16} />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
}

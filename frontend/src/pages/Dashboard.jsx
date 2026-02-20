import UploadPanel from "../components/UploadPanel";
import SummaryCards from "../components/SummaryCards";
import GraphView from "../components/GraphView";
import FraudTable from "../components/FraudTable";
import { useState } from "react";

export default function Dashboard() {
    const [data, setData] = useState(null);

    // Callback to update dashboard data from UploadPanel
    const handleAnalysisComplete = (analysisData) => {
        setData(analysisData);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <h1 className="text-3xl font-bold mb-6">
                Money Laundering Detection System
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <UploadPanel onAnalysisComplete={handleAnalysisComplete} />
                <SummaryCards data={data?.summary} />
            </div>

            <div className="mt-6">
                {/* Pass nodes and edges if available in data */}
                <GraphView graphData={data?.graph_data} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <FraudTable rings={data?.fraud_rings} />
                <div className="bg-slate-800 p-6 rounded-xl shadow">
                    <h2 className="text-xl font-semibold mb-4">Suspicious Accounts</h2>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left border-b border-gray-600">
                                <th>Account ID</th>
                                <th>Score</th>
                                <th>Patterns</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.suspicious_accounts?.map((acc, i) => (
                                <tr key={i} className="border-b border-gray-700">
                                    <td>{acc.account_id}</td>
                                    <td className="text-red-400">{acc.suspicion_score}</td>
                                    <td>{acc.detected_patterns.join(", ")}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

import axios from "axios";
import { useState } from "react";

export default function UploadPanel({ onAnalysisComplete }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const API_URL = import.meta.env.VITE_API_URL || "/api";
            const res = await axios.post(
                `${API_URL}/upload`, // backend URL
                formData
            );
            console.log(res.data);
            if (onAnalysisComplete) {
                onAnalysisComplete(res.data);
            }
        } catch (err) {
            console.error(err);
            setError("Upload failed. Check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-4">Upload Transactions</h2>
            <input
                type="file"
                className="mb-4 block w-full text-sm text-slate-500
        file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0
        file:text-sm file:font-semibold
        file:bg-blue-50 file:text-blue-700
        hover:file:bg-blue-100"
                onChange={(e) => setFile(e.target.files[0])}
            />
            {error && <p className="text-red-400 mb-2">{error}</p>}
            <button
                onClick={handleUpload}
                disabled={loading}
                className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
                {loading ? "Analyzing..." : "Analyze"}
            </button>
        </div>
    );
}

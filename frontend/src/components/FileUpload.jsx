import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import axios from 'axios';

const FileUpload = ({ onUploadSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        const API_URL = import.meta.env.VITE_API_URL || "/api";
        try {
            const response = await axios.post(`${API_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onUploadSuccess(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Upload failed. Ensure CSV format is correct.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-10">
            <div className="flex flex-col items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">CSV file with transactions</p>
                    </div>
                    <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} disabled={loading} />
                </label>
            </div>

            {loading && (
                <div className="mt-4 text-center text-blue-600 font-medium animate-pulse">
                    Processing transactions... (This may take a few seconds)
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    <span className="font-medium">Error:</span> {error}
                </div>
            )}
        </div>
    );
};

export default FileUpload;

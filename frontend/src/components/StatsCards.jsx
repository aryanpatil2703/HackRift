import React from 'react';
import { Activity, AlertTriangle, Users, Clock } from 'lucide-react';

export const StatsCards = ({ summary }) => {
    const cards = [
        {
            title: 'Suspicious Accounts',
            value: summary.suspicious_accounts_flagged,
            icon: Users,
            color: 'bg-red-500',
        },
        {
            title: 'Fraud Rings',
            value: summary.fraud_rings_detected,
            icon: Activity,
            color: 'bg-orange-500',
        },
        {
            title: 'Total Analyzed',
            value: summary.total_accounts_analyzed,
            icon: AlertTriangle,
            color: 'bg-blue-500',
        },
        {
            title: 'Processing Time',
            value: `${summary.processing_time_seconds.toFixed(4)}s`,
            icon: Clock,
            color: 'bg-green-500',
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card) => (
                <div key={card.title} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium">{card.title}</p>
                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${card.color} text-white`}>
                        <card.icon size={24} />
                    </div>
                </div>
            ))}
        </div>
    );
};

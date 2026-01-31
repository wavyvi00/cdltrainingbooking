'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, Clock, Calendar as CalIcon } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { DashboardStats3D } from '@/components/DashboardStats3D';

const TIMEZONE = 'America/Chicago';

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState({
        revenueMonth: 0,
        appointmentsWeek: 0,
        pendingRequests: 0,
        totalClients: 0
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [rateLimitHits, setRateLimitHits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch('/api/admin/dashboard');
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setLoading(false);
                return;
            }
            setMetrics(data.metrics || metrics);
            setRecentActivity(data.recentActivity || []);
            setRateLimitHits(data.rateLimitHits || []);
            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading) return <div>Loading dashboard...</div>;

    const cards = [
        { title: 'Revenue (Month)', value: `$${metrics.revenueMonth.toFixed(2)}`, icon: DollarSign, color: 'text-green-400' },
        { title: 'Appts (This Week)', value: metrics.appointmentsWeek, icon: CalIcon, color: 'text-blue-400' },
        { title: 'Pending Requests', value: metrics.pendingRequests, icon: Clock, color: 'text-orange-400' },
        { title: 'Total Clients', value: metrics.totalClients, icon: Users, color: 'text-purple-400' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold">Dashboard</h2>
                    <p className="text-zinc-500">Business overview and recent activity.</p>
                </div>
            </div>

            {/* 3D Stats Visualization - Full Width Hero */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full"
            >
                <DashboardStats3D metrics={metrics} />
            </motion.div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-zinc-900 border border-white/5 rounded-2xl p-6 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />

                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-zinc-500 mb-1">{card.title}</p>
                                <h3 className="text-2xl font-bold text-white">{card.value}</h3>
                            </div>
                            <div className={`p-3 bg-white/5 rounded-xl ${card.color}`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Recent Activity */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Recent Activity</h3>
                    <button className="text-sm text-indigo-400 hover:text-indigo-300">View All</button>
                </div>
                <div className="divide-y divide-white/5">
                    {recentActivity.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${item.status === 'confirmed' || item.status === 'accepted' ? 'bg-green-500' :
                                    item.status === 'requested' ? 'bg-orange-500' : 'bg-red-500'
                                    }`} />
                                <div>
                                    <p className="font-medium text-white">{item.services?.name || 'Service'}</p>
                                    <p className="text-xs text-zinc-500">
                                        by {item.profiles?.full_name || 'Unknown'} • {formatInTimeZone(item.created_at, TIMEZONE, 'MMM d, h:mm a')}
                                    </p>
                                </div>
                            </div>
                            <span className="text-sm font-code text-zinc-400 uppercase tracking-wider">
                                {item.status}
                            </span>
                        </div>
                    ))}
                    {recentActivity.length === 0 && (
                        <div className="p-8 text-center text-zinc-500">No recent activity.</div>
                    )}
                </div>
            </motion.div>

            {/* Rate Limit Hits */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Rate Limit Hits</h3>
                    <span className="text-xs text-zinc-500">Last 10 events</span>
                </div>
                <div className="divide-y divide-white/5">
                    {rateLimitHits.map((hit) => (
                        <div key={hit.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-sm text-white">{hit.prefix} • {hit.method} {hit.endpoint}</span>
                                <span className="text-xs text-zinc-500">
                                    {hit.ip || 'unknown ip'} • {hit.user_id ? `${hit.user_id.slice(0, 8)}…` : 'anon'} • {formatInTimeZone(hit.created_at, TIMEZONE, 'MMM d, h:mm a')}
                                </span>
                            </div>
                        </div>
                    ))}
                    {rateLimitHits.length === 0 && (
                        <div className="p-8 text-center text-zinc-500">No rate limit hits.</div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Clock, DollarSign, ToggleLeft, ToggleRight, Edit2, Plus, X, Save } from 'lucide-react';
import { Toast } from '@/components/Toast';

export default function ServicesPage() {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});

    // New Service State
    const [isCreating, setIsCreating] = useState(false);
    const [newService, setNewService] = useState<any>({ name: '', duration_min: 30, price: '', description: '' });
    const [toast, setToast] = useState({ show: false, message: '' });

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        const res = await fetch('/api/admin/services');
        const data = await res.json().catch(() => ({}));
        setServices(data.services || []);
        setLoading(false);
    };

    const toggleService = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setServices(services.map(s => s.id === id ? { ...s, active: !currentStatus } : s));

        await fetch(`/api/admin/services/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !currentStatus })
        });
        setToast({ show: true, message: !currentStatus ? 'Service activated' : 'Service deactivated' });
    };

    const startEdit = (service: any) => {
        setEditingId(service.id);
        setEditForm({ ...service, price: service.price_cents / 100 });
    };

    const saveEdit = async () => {
        if (!editingId) return;

        // Optimistic
        setServices(services.map(s => s.id === editingId ? { ...s, ...editForm } : s));
        setEditingId(null);

        await fetch(`/api/admin/services/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: editForm.name,
                price: editForm.price,
                duration_min: editForm.duration_min,
                description: editForm.description
            })
        });
        setToast({ show: true, message: 'Service updated' });
    };

    const createService = async () => {
        setIsCreating(false);
        const res = await fetch('/api/admin/services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newService.name,
                description: newService.description,
                duration_min: newService.duration_min,
                price: newService.price
            })
        });
        const payload = await res.json().catch(() => ({}));

        if (payload.service) {
            setServices([...services, payload.service]);
            setNewService({ name: '', duration_min: 30, price: '', description: '' });
            setToast({ show: true, message: 'Service created successfully' });
        }
    };

    if (loading) return <div>Loading services...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold">Services</h2>
                    <p className="text-zinc-500">Manage your service menu and pricing.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-white text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-zinc-200 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add Service
                </button>
            </div>

            {/* Create Modal Area (Simplified inline for now) */}
            {isCreating && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-indigo-500/30 p-6 rounded-xl space-y-4 mb-8">
                    <h3 className="font-bold text-lg">New Service</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Service Name" className="bg-black border border-white/10 rounded p-2 text-white"
                            value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} />
                        <input type="text" placeholder="Description" className="bg-black border border-white/10 rounded p-2 text-white"
                            value={newService.description} onChange={e => setNewService({ ...newService, description: e.target.value })} />
                        <div className="flex items-center gap-2 bg-black border border-white/10 rounded p-2">
                            <DollarSign className="w-4 h-4 text-zinc-500" />
                            <input type="number" placeholder="Price ($)" className="bg-transparent text-white w-full focus:outline-none"
                                value={newService.price} onChange={e => setNewService({ ...newService, price: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2 bg-black border border-white/10 rounded p-2">
                            <Clock className="w-4 h-4 text-zinc-500" />
                            <input type="number" placeholder="Minutes" className="bg-transparent text-white w-full focus:outline-none"
                                value={newService.duration_min} onChange={e => setNewService({ ...newService, duration_min: parseInt(e.target.value) })} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={createService} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold">Create</button>
                        <button onClick={() => setIsCreating(false)} className="text-zinc-400 px-4 py-2">Cancel</button>
                    </div>
                </motion.div>
            )}

            <div className="grid gap-4">
                {services.map((service) => (
                    <motion.div
                        key={service.id}
                        layout
                        className={`bg-zinc-900 border ${service.active ? 'border-white/5' : 'border-red-500/10'} rounded-xl p-6 flex flex-col md:flex-row items-center gap-6`}
                    >
                        {editingId === service.id ? (
                            <div className="flex-1 w-full grid gap-4">
                                <input className="bg-black border border-white/10 p-2 rounded text-white font-bold" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                <div className="flex gap-4">
                                    <input type="number" className="bg-black border border-white/10 p-2 rounded text-white" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} />
                                    <input type="number" className="bg-black border border-white/10 p-2 rounded text-white" value={editForm.duration_min} onChange={e => setEditForm({ ...editForm, duration_min: parseInt(e.target.value) })} />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={saveEdit} className="bg-green-500/20 text-green-400 p-2 rounded hover:bg-green-500/30"><Save className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingId(null)} className="bg-white/5 text-zinc-400 p-2 rounded hover:bg-white/10"><X className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                                        <h3 className={`text-xl font-bold ${service.active ? 'text-white' : 'text-zinc-500 line-through'}`}>{service.name}</h3>
                                        {!service.active && <span className="text-xs text-red-400 uppercase font-bold tracking-wider">Inactive</span>}
                                    </div>
                                    <p className="text-zinc-500 text-sm mb-3">{service.description || 'No description'}</p>
                                    <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-zinc-400">
                                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${(service.price_cents / 100).toFixed(2)}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{service.duration_min}m</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button onClick={() => startEdit(service)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => toggleService(service.id, service.active)} className={`p-2 rounded-lg transition-colors ${service.active ? 'text-green-400 hover:bg-green-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                        {service.active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                ))}
            </div>

            <Toast
                message={toast.message}
                isVisible={toast.show}
                onClose={() => setToast({ ...toast, show: false })}
            />
        </div >
    );
}

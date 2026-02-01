'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Truck, Plus, Edit, Trash2, Check, X,
    Calendar, Star, Phone, Mail
} from 'lucide-react';
import { Toast } from '@/components/Toast';

interface Instructor {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    active: boolean;
    specialties?: string[];
}

interface TrainingTruck {
    id: string;
    name: string;
    license_plate?: string;
    truck_type: 'manual' | 'automatic';
    active: boolean;
    notes?: string;
}

type Tab = 'instructors' | 'trucks';

export default function ResourcesPage() {
    const [tab, setTab] = useState<Tab>('instructors');
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [trucks, setTrucks] = useState<TrainingTruck[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({});
    const [saving, setSaving] = useState(false);

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '', type: 'success', isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, isVisible: true });
    };

    useEffect(() => {
        fetchResources();
    }, [tab]);

    const fetchResources = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/resources?type=${tab}`);
            const data = await res.json();
            if (tab === 'instructors') {
                setInstructors(data.instructors || []);
            } else {
                setTrucks(data.trucks || []);
            }
        } catch (err) {
            console.error('Failed to fetch resources:', err);
            showToast('Failed to load resources', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingId(null);
        setFormData(tab === 'instructors'
            ? { full_name: '', email: '', phone: '', active: true }
            : { name: '', license_plate: '', truck_type: 'automatic', active: true, notes: '' }
        );
        setShowForm(true);
    };

    const handleEdit = (item: Instructor | TrainingTruck) => {
        setEditingId(item.id);
        setFormData(item);
        setShowForm(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId
                ? `/api/admin/resources/${editingId}?type=${tab}`
                : `/api/admin/resources?type=${tab}`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to save');

            showToast(editingId ? 'Updated successfully' : 'Added successfully');
            setShowForm(false);
            fetchResources();
        } catch (err) {
            showToast('Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this?')) return;

        try {
            const res = await fetch(`/api/admin/resources/${id}?type=${tab}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');

            showToast('Deleted successfully');
            fetchResources();
        } catch (err) {
            showToast('Failed to delete', 'error');
        }
    };

    const handleToggleActive = async (id: string, active: boolean) => {
        try {
            const res = await fetch(`/api/admin/resources/${id}?type=${tab}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !active })
            });
            if (!res.ok) throw new Error('Failed to update');

            if (tab === 'instructors') {
                setInstructors(prev => prev.map(i =>
                    i.id === id ? { ...i, active: !active } : i
                ));
            } else {
                setTrucks(prev => prev.map(t =>
                    t.id === id ? { ...t, active: !active } : t
                ));
            }
        } catch (err) {
            showToast('Failed to update status', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-pulse text-zinc-500">Loading resources...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Resources</h2>
                    <p className="text-zinc-500">Manage instructors and training trucks.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-white text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-200 transition"
                >
                    <Plus className="w-4 h-4" />
                    Add {tab === 'instructors' ? 'Instructor' : 'Truck'}
                </button>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-xl border border-white/5 w-fit">
                <button
                    onClick={() => setTab('instructors')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === 'instructors'
                            ? 'bg-white text-black shadow-lg'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <User className="w-4 h-4" />
                    Instructors
                </button>
                <button
                    onClick={() => setTab('trucks')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === 'trucks'
                            ? 'bg-white text-black shadow-lg'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Truck className="w-4 h-4" />
                    Trucks
                </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {tab === 'instructors' ? (
                    <motion.div
                        key="instructors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {instructors.length === 0 ? (
                            <div className="col-span-full bg-zinc-900/50 border border-white/5 rounded-xl p-8 text-center">
                                <User className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                <p className="text-zinc-500">No instructors added yet.</p>
                            </div>
                        ) : (
                            instructors.map((instructor) => (
                                <div
                                    key={instructor.id}
                                    className={`bg-zinc-900 border rounded-xl p-5 ${instructor.active ? 'border-white/10' : 'border-red-500/20 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center font-bold text-lg">
                                                {instructor.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{instructor.full_name}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded ${instructor.active
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {instructor.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {instructor.email && (
                                        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                                            <Mail className="w-3 h-3" />
                                            {instructor.email}
                                        </div>
                                    )}
                                    {instructor.phone && (
                                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <Phone className="w-3 h-3" />
                                            {instructor.phone}
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => handleEdit(instructor)}
                                            className="flex-1 bg-white/5 text-zinc-400 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition flex items-center justify-center gap-1"
                                        >
                                            <Edit className="w-3 h-3" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(instructor.id, instructor.active)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${instructor.active
                                                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                }`}
                                        >
                                            {instructor.active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="trucks"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {trucks.length === 0 ? (
                            <div className="col-span-full bg-zinc-900/50 border border-white/5 rounded-xl p-8 text-center">
                                <Truck className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                <p className="text-zinc-500">No trucks added yet.</p>
                            </div>
                        ) : (
                            trucks.map((truck) => (
                                <div
                                    key={truck.id}
                                    className={`bg-zinc-900 border rounded-xl p-5 ${truck.active ? 'border-white/10' : 'border-red-500/20 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center">
                                                <Truck className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{truck.name}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded ${truck.active
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {truck.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-sm text-zinc-400">
                                        {truck.license_plate && (
                                            <div>Plate: <span className="text-white">{truck.license_plate}</span></div>
                                        )}
                                        <div>Type: <span className="text-white capitalize">{truck.truck_type}</span></div>
                                    </div>

                                    {truck.notes && (
                                        <p className="text-xs text-zinc-500 mt-2">{truck.notes}</p>
                                    )}

                                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => handleEdit(truck)}
                                            className="flex-1 bg-white/5 text-zinc-400 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition flex items-center justify-center gap-1"
                                        >
                                            <Edit className="w-3 h-3" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(truck.id, truck.active)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${truck.active
                                                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                                                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                }`}
                                        >
                                            {truck.active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                        onClick={() => setShowForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
                        >
                            <h3 className="text-xl font-bold text-white mb-4">
                                {editingId ? 'Edit' : 'Add'} {tab === 'instructors' ? 'Instructor' : 'Truck'}
                            </h3>

                            <div className="space-y-4">
                                {tab === 'instructors' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-1">Full Name *</label>
                                            <input
                                                type="text"
                                                value={formData.full_name || ''}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                                                placeholder="John Smith"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email || ''}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-1">Phone</label>
                                            <input
                                                type="tel"
                                                value={formData.phone || ''}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                                                placeholder="(555) 123-4567"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-1">Truck Name *</label>
                                            <input
                                                type="text"
                                                value={formData.name || ''}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                                                placeholder="Truck #1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-1">License Plate</label>
                                            <input
                                                type="text"
                                                value={formData.license_plate || ''}
                                                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                                                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                                                placeholder="ABC-1234"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-1">Transmission</label>
                                            <select
                                                value={formData.truck_type || 'automatic'}
                                                onChange={(e) => setFormData({ ...formData, truck_type: e.target.value })}
                                                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                                            >
                                                <option value="automatic">Automatic</option>
                                                <option value="manual">Manual</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-1">Notes</label>
                                            <textarea
                                                value={formData.notes || ''}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                                                rows={2}
                                                placeholder="Any notes about this truck..."
                                            />
                                        </div>
                                    </>
                                )}

                                <label className="flex items-center gap-2 text-zinc-300">
                                    <input
                                        type="checkbox"
                                        checked={formData.active !== false}
                                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                        className="rounded"
                                    />
                                    Active
                                </label>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 bg-white/5 text-zinc-400 py-2 rounded-lg font-medium hover:bg-white/10 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 bg-white text-black py-2 rounded-lg font-bold hover:bg-zinc-200 transition disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
}

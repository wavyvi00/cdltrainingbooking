'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, Save, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { supabase } from '@/lib/supabaseClient';
import { UserMenu } from '@/components/UserMenu';
import { Toast } from '@/components/Toast';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [toast, setToast] = useState({ show: false, message: '' });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                // Fetch profile
                const { data: profile } = await (supabase
                    .from('profiles') as any)
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setFullName(profile.full_name || user.user_metadata.full_name || '');
                    setPhone(profile.phone || '');
                } else {
                    setFullName(user.user_metadata.full_name || '');
                }
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    const performSave = async () => {
        try {
            if (!user) throw new Error('No user');

            const updates = {
                id: user.id,
                full_name: fullName,
                phone: phone,
                updated_at: new Date().toISOString(),
            };
            console.log('Sending updates to profiles:', updates);

            // 1. Update Profile Table
            const { error: profileError } = await (supabase
                .from('profiles') as any)
                .upsert(updates);

            if (profileError) throw profileError;
            console.log('Profile table updated.');

            // 2. Update Auth Metadata
            console.log('Updating auth metadata (background)...');
            supabase.auth.updateUser({
                data: { full_name: fullName, phone: phone }
            });

            setToast({ show: true, message: 'Profile updated successfully' });
            setMessage(null);
        } catch (error: any) {
            console.error('Save failed:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setSaving(true);
        await performSave();
    };

    const formatPhoneNumber = (value: string) => {
        if (!value) return value;
        const phoneNumber = value.replace(/[^\d]/g, '');
        const phoneNumberLength = phoneNumber.length;
        if (phoneNumberLength < 4) return phoneNumber;
        if (phoneNumberLength < 7) {
            return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
        }
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhone(formatted);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
                <p className="mb-4">Please sign in to view your profile.</p>
                <Link href="/" className="text-zinc-400 hover:text-white underline">Return Home</Link>
            </div>
        );
    }

    return (
        <main className="min-h-screen text-white relative">
            <header className="fixed top-0 left-0 right-0 z-40 p-6 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    <Link href="/" className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-wider backdrop-blur-md bg-black/20 px-4 py-2 rounded-full border border-white/5">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                </div>
                <div className="pointer-events-auto">
                    <UserMenu />
                </div>
            </header>

            <div className="container mx-auto px-4 pt-24 max-w-2xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
                >
                    {/* Glow effect */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

                    <h1 className="text-3xl font-bold mb-2 relative z-10">Your Profile</h1>
                    <p className="text-zinc-400 mb-8 relative z-10">Manage your personal information.</p>

                    <form onSubmit={handleSave} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                                Email Address
                            </label>
                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3 text-zinc-400 cursor-not-allowed">
                                <Mail className="w-4 h-4" />
                                <span>{user.email}</span>
                            </div>
                            <p className="text-xs text-zinc-600">Email cannot be changed.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                                    placeholder="Enter your name"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                                Phone Number
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                            <p className="text-xs text-zinc-500">Used only for appointment communication.</p>
                        </div>

                        {message && message.type === 'error' && (
                            <div className="p-3 rounded-lg text-sm text-center bg-red-500/10 text-red-400">
                                {message.text}
                            </div>
                        )}

                        <button
                            disabled={saving}
                            type="submit"
                            className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </form>
                </motion.div>
            </div>

            <Toast
                message={toast.message}
                isVisible={toast.show}
                onClose={() => setToast({ ...toast, show: false })}
            />
        </main>
    );
}

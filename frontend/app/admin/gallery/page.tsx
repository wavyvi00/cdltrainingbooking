'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function AdminGalleryPage() {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Fetch Images
    const fetchImages = async () => {
        const res = await fetch('/api/admin/gallery');
        const data = await res.json().catch(() => ({}));
        setImages(data.images || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchImages();
    }, []);

    // Handle Upload
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/gallery', {
            method: 'POST',
            body: formData
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
            console.error('Upload error:', payload?.error);
            alert('Error uploading image');
            setUploading(false);
            return;
        }

        if (payload.image) {
            setImages([payload.image, ...images]);
        }
        setUploading(false);
    };

    // Handle Delete
    const handleDelete = async (id: string, imageUrl: string) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        await fetch('/api/admin/gallery', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, image_url: imageUrl })
        });

        setImages(images.filter(img => img.id !== id));
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-white">Gallery Manager</h2>
                    <p className="text-zinc-400 mt-1">Upload and manage portfolio photos.</p>
                </div>
                <label className={`cursor-pointer group flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-bold text-sm tracking-wide hover:scale-105 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                        // @ts-ignore 
                        <iconify-icon icon="ph:plus-bold"></iconify-icon>
                    }
                    <span>{uploading ? 'UPLOADING...' : 'UPLOAD PHOTO'}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                </label>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => <div key={i} className="aspect-square bg-white/5 rounded-2xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {images.map((img) => (
                        <motion.div
                            key={img.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="group relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden border border-white/10"
                        >
                            <img src={img.image_url} alt="Gallery" className="w-full h-full object-cover" />

                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => handleDelete(img.id, img.image_url)}
                                    className="p-3 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors border border-red-500/30"
                                    title="Delete"
                                >
                                    {/* @ts-ignore */}
                                    <iconify-icon icon="ph:trash-light" width="20"></iconify-icon>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                    {images.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                            {/* @ts-ignore */}
                            <iconify-icon icon="ph:image-light" width="48"></iconify-icon>
                            <p className="mt-4 font-medium">No images yet</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { useRouter } from 'next/navigation'

export default function AddDeviceButton() {
    const [isOpen, setIsOpen] = useState(false)
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const supabase = createClient()
    const { ToastContainer, ...toast } = useToast()
    const router = useRouter()

    const handlePair = async () => {
        if (!code || code.length < 6) return
        
        setLoading(true)
        try {
            const { data, error } = await supabase.rpc('claim_device_by_code', {
                p_code: code
            })

            if (error) throw error

            if (data === true) {
                toast.success('Cihaz başarıyla eklendi!')
                setIsOpen(false)
                setCode('')
                router.refresh()
            } else {
                toast.error('Geçersiz veya süresi dolmuş kod.')
            }
        } catch (e: any) {
            console.error('Pairing Error:', JSON.stringify(e, null, 2))
            toast.error(`Bir hata oluştu: ${e?.message || 'Bilinmeyen hata'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <ToastContainer />
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors font-medium"
            >
                <Plus className="w-4 h-4" />
                Cihaz Ekle
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">Yeni Cihaz Ekle</h3>
                        <p className="text-slate-400 text-sm mb-6">
                            Agent uygulamasında gösterilen 6 haneli eşleştirme kodunu girin.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="KODU GİRİN (ÖRN: ABC123)"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono text-center text-lg tracking-widest"
                                    maxLength={6}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors font-medium"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handlePair}
                                    disabled={loading || code.length < 6}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Eşleştir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Plus, X, Loader2, Check, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'

interface AllowedApp {
    id: string
    app_name: string
    description: string | null
    added_at: string
}

interface AllowlistManagerProps {
    deviceId: string
    isOnline: boolean
}

export default function AllowlistManager({ deviceId, isOnline }: AllowlistManagerProps) {
    const toast = useToast()
    const confirmDialog = useConfirm()
    const [enabled, setEnabled] = useState(false)
    const [apps, setApps] = useState<AllowedApp[]>([])
    const [loading, setLoading] = useState(false)
    const [newAppName, setNewAppName] = useState('')
    const [newAppDesc, setNewAppDesc] = useState('')
    const supabase = createClient()

    const fetchAllowlistStatus = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('devices')
                .select('allowlist_enabled')
                .eq('device_id', deviceId)
                .single()

            if (data) {
                setEnabled(data.allowlist_enabled || false)
            }
        } catch (e) {
            console.error('Failed to fetch allowlist status:', e)
        }
    }, [deviceId, supabase])

    const fetchAllowedApps = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await supabase
                .from('allowed_apps')
                .select('*')
                .eq('device_id', deviceId)
                .order('app_name', { ascending: true })

            if (data) {
                setApps(data)
            }
        } catch (e) {
            console.error('Failed to fetch allowed apps:', e)
        } finally {
            setLoading(false)
        }
    }, [deviceId, supabase])

    useEffect(() => {
        fetchAllowlistStatus()
        fetchAllowedApps()
    }, [fetchAllowlistStatus, fetchAllowedApps])

    const toggleAllowlist = async () => {
        try {
            const newState = !enabled
            await supabase
                .from('devices')
                .update({ allowlist_enabled: newState })
                .eq('id', deviceId)

            setEnabled(newState)

            if (newState) {
                toast.success('🛡️ İzin Listesi Modu AKTİF! Sadece onaylı uygulamalar çalışabilir!')
            } else {
                toast.info('İzin Listesi modu devre dışı bırakıldı')
            }
        } catch (e: unknown) {
            const error = e as Error
            toast.error('İzin listesi değiştirilemedi: ' + error.message)
        }
    }

    const addApp = async () => {
        if (!newAppName.trim()) {
            toast.warning('Lütfen bir uygulama adı girin (örn: chrome.exe)')
            return
        }

        try {
            const { error } = await supabase.from('allowed_apps').insert({
                device_id: deviceId,
                app_name: newAppName.trim().toLowerCase(),
                description: newAppDesc.trim() || null
            })

            if (error) throw error

            setNewAppName('')
            setNewAppDesc('')
            fetchAllowedApps()
            toast.success(`✅ "${newAppName}" izin listesine eklendi`)
        } catch (e: unknown) {
            const error = e as Error
            toast.error('Uygulama eklenemedi: ' + error.message)
        }
    }

    const removeApp = async (id: string, appName: string) => {
        confirmDialog.showConfirm(
            {
                title: 'Uygulamayı Kaldır',
                message: `"${appName}" izin listesinden kaldırılacak. Devam edilsin mi?`,
                type: 'warning',
                confirmText: 'Kaldır',
                cancelText: 'İptal'
            },
            async () => {
                try {
                    const { error } = await supabase
                        .from('allowed_apps')
                        .delete()
                        .eq('id', id)

                    if (error) throw error

                    fetchAllowedApps()
                    toast.success(`"${appName}" kaldırıldı`)
                } catch (e: unknown) {
                    const error = e as Error
                    toast.error('Uygulama kaldırılamadı: ' + error.message)
                }
            }
        )
    }

    return (
        <>
            <toast.ToastContainer />
            <confirmDialog.ConfirmDialog />

            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${enabled ? 'bg-red-500/20' : 'bg-slate-500/20'}`}>
                            <Shield className={`w-6 h-6 ${enabled ? 'text-red-400' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">İzin Listesi Modu</h2>
                            <p className="text-sm text-slate-400">Sıkı uygulama kontrolü - Sadece onaylı uygulamalar çalışabilir</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleAllowlist}
                        disabled={!isOnline || loading}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${enabled
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-green-500 text-white hover:bg-green-600'
                            } disabled:opacity-50`}
                    >
                        {enabled ? '🛡️ AKTİF' : 'Etkinleştir'}
                    </button>
                </div>

                {/* Warning Banner */}
                {enabled && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="text-red-400 font-semibold">⚠️ SIKI MOD AKTİF</p>
                            <p className="text-slate-300 mt-1">
                                Aşağıdaki listede OLMAYAN tüm uygulamalar otomatik olarak anında sonlandırılacaktır.
                            </p>
                        </div>
                    </div>
                )}

                {/* Add New App Form */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                    <h3 className="text-sm font-semibold text-white mb-3">İzin Verilen Uygulama Ekle</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Uygulama adı (örn: chrome.exe, teams.exe)"
                            value={newAppName}
                            onChange={(e) => setNewAppName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addApp()}
                            className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                        <input
                            type="text"
                            placeholder="Açıklama (opsiyonel, örn: Google Chrome)"
                            value={newAppDesc}
                            onChange={(e) => setNewAppDesc(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addApp()}
                            className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                        <button
                            onClick={addApp}
                            disabled={!newAppName.trim() || loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                            İzin Listesine Ekle
                        </button>
                    </div>
                </div>

                {/* Allowed Apps List */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        Onaylı Uygulamalar ({apps.length})
                    </h3>
                    <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                        {loading && apps.length === 0 && (
                            <div className="flex items-center justify-center py-8 text-slate-500">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        )}
                        {!loading && apps.length === 0 && (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                İzin listesinde uygulama yok. Sıkı modu etkinleştirmek için uygulama ekleyin.
                            </div>
                        )}
                        {apps.map((app) => (
                            <div
                                key={app.id}
                                className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all group"
                            >
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">{app.app_name}</p>
                                    {app.description && (
                                        <p className="text-xs text-slate-400">{app.description}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => removeApp(app.id, app.app_name)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="İzin listesinden kaldır"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}

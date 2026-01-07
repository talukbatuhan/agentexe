'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Plus, X, Loader2, Check, AlertTriangle, Ban, ListPlus } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'

interface AllowedApp {
    id: string
    app_name: string
    description: string | null
    added_at: string
}
interface BlockedApp {
    id: string
    app_name: string
    description: string | null
    added_at: string
}

interface AllowlistManagerProps {
    deviceId: string
}

export default function AllowlistManager({ deviceId }: AllowlistManagerProps) {
    const toast = useToast()
    const confirmDialog = useConfirm()
    const [enabled, setEnabled] = useState(false)
    const [apps, setApps] = useState<AllowedApp[]>([])
    const [blockedApps, setBlockedApps] = useState<BlockedApp[]>([])
    const [loading, setLoading] = useState(false)
    const [newAppName, setNewAppName] = useState('')
    const [newAppDesc, setNewAppDesc] = useState('')
    const [newBlockedName, setNewBlockedName] = useState('')
    const [processPickerOpen, setProcessPickerOpen] = useState(false)
    const [processes, setProcesses] = useState<Array<{ pid: number; name: string; memory: number }>>([])
    const [procLoading, setProcLoading] = useState(false)
    const supabase = createClient()
    const SYSTEM_PROTECTED = new Set<string>([
        'system','registry','smss.exe','csrss.exe','wininit.exe','services.exe',
        'lsass.exe','svchost.exe','fontdrvhost.exe','memory compression',
        'spoolsv.exe','explorer.exe','winlogon.exe','dwm.exe','rdpclip.exe',
        'sihost.exe','taskhostw.exe','ctfmon.exe','searchui.exe','runtimebroker.exe',
        'lockapp.exe','audiodg.exe','wudfhost.exe','werfault.exe','smartscreen.exe'
    ].map(x => x.toLowerCase()))

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
        } catch {
            console.error('Failed to fetch allowlist status')
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
            // Fetch blocked apps in parallel
            const { data: blocked } = await supabase
                .from('blocked_apps')
                .select('*')
                .eq('device_id', deviceId)
                .order('app_name', { ascending: true })
            if (blocked) {
                setBlockedApps(blocked)
            }
        } catch {
            console.error('Failed to fetch allowed apps')
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
            const { error } = await supabase
                .from('devices')
                .update({ allowlist_enabled: newState })
                .eq('device_id', deviceId)

            if (error) throw error

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
        const name = newAppName.trim().toLowerCase()
        if (SYSTEM_PROTECTED.has(name)) {
            toast.warning('Bu uygulama sistem tarafından zaten muaf tutuluyor')
            return
        }

        try {
            const { error } = await supabase.from('allowed_apps').insert({
                device_id: deviceId,
                app_name: name,
                description: newAppDesc.trim() || null
            })

            if (error) throw error

            setNewAppName('')
            setNewAppDesc('')
            fetchAllowedApps()
            toast.success(`✅ "${newAppName}" izin listesine eklendi`)
        } catch (e: unknown) {
            const error = e as Error
            // Handle duplicate entry gracefully
            if (error.message.includes('unique_device_app') || error.message.includes('duplicate key')) {
                toast.info(`ℹ️ "${name}" zaten listede mevcut.`)
                setNewAppName('')
                setNewAppDesc('')
            } else {
                toast.error('Uygulama eklenemedi: ' + error.message)
            }
        }
    }

    const addBlocked = async () => {
        if (!newBlockedName.trim()) {
            toast.warning('Lütfen yasaklanacak uygulama adı girin (örn: discord.exe)')
            return
        }
        const name = newBlockedName.trim().toLowerCase()
        if (SYSTEM_PROTECTED.has(name)) {
            toast.warning('Sistem uygulamaları yasaklanamaz')
            return
        }
        try {
            const { error } = await supabase.from('blocked_apps').insert({
                device_id: deviceId,
                app_name: name,
                description: null
            })
            if (error) throw error
            setNewBlockedName('')
            fetchAllowedApps()
            toast.success(`⛔ "${name}" yasaklandı`)
        } catch (e: unknown) {
            const error = e as Error
            toast.error('Yasaklama eklenemedi: ' + error.message)
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

    const removeBlocked = async (id: string, appName: string) => {
        confirmDialog.showConfirm(
            {
                title: 'Yasaklamayı Kaldır',
                message: `"${appName}" yasağı kaldırılacak. Devam edilsin mi?`,
                type: 'warning',
                confirmText: 'Kaldır',
                cancelText: 'İptal'
            },
            async () => {
                try {
                    const { error } = await supabase
                        .from('blocked_apps')
                        .delete()
                        .eq('id', id)
                    if (error) throw error
                    fetchAllowedApps()
                    toast.success(`"${appName}" yasağı kaldırıldı`)
                } catch (e: unknown) {
                    const error = e as Error
                    toast.error('Yasak kaldırılamadı: ' + error.message)
                }
            }
        )
    }

    const openProcessPicker = async () => {
        setProcessPickerOpen(true)
        setProcLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const commandSentTime = new Date()
            await supabase.from('commands').insert({
                device_id: deviceId,
                parent_id: user?.id || '00000000-0000-0000-0000-000000000000',
                command_type: 'get_running_processes',
                status: 'pending'
            })
            let attempts = 0
            const maxAttempts = 30
            const poll = setInterval(async () => {
                attempts++
                if (attempts > maxAttempts) {
                    clearInterval(poll)
                    setProcLoading(false)
                    toast.error('Süreç listesi zaman aşımı')
                    return
                }
                const { data, error } = await supabase
                    .from('device_logs')
                    .select('*')
                    .eq('device_id', deviceId)
                    .eq('log_type', 'info')
                    .contains('metadata', { subtype: 'process_list' })
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
                if (error) return
                if (data && new Date(data.created_at) > commandSentTime) {
                    clearInterval(poll)
                    let content = data.content
                    try {
                        if (typeof content === 'string') content = JSON.parse(content)
                    } catch {}
                    if (content?.processes && Array.isArray(content.processes)) {
                        setProcesses(content.processes)
                    }
                    setProcLoading(false)
                }
            }, 1000)
        } catch (e) {
            console.error('Failed to fetch processes:', e)
            setProcLoading(false)
            toast.error('Süreçler alınamadı')
        }
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
                        disabled={loading}
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
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white">İzin Verilen Uygulama Ekle</h3>
                        <button
                            onClick={openProcessPicker}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                            title="Çalışan süreçlerden ekle"
                        >
                            <ListPlus className="w-4 h-4" />
                            Çalışan süreçlerden ekle
                        </button>
                    </div>
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
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Shield className="w-4 h-4 text-yellow-400" />
                            Windows sistem uygulamaları her zaman izinlidir ve düzenlenemez.
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                            Örnek: {Array.from(SYSTEM_PROTECTED).slice(0,6).join(', ')} ...
                        </div>
                    </div>
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

                {/* Blocked Apps (Denylıst) */}
                <div className="mt-8">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Ban className="w-4 h-4 text-red-400" />
                        Yasaklı Uygulamalar ({blockedApps.length})
                    </h3>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Yasaklanacak uygulama (örn: discord.exe)"
                                value={newBlockedName}
                                onChange={(e) => setNewBlockedName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addBlocked()}
                                className="flex-1 px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                            />
                            <button
                                onClick={addBlocked}
                                disabled={!newBlockedName.trim() || loading}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                            >
                                Yasakla
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Not: Sistem uygulamaları yasaklanamaz.</p>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
                        {blockedApps.map(app => (
                            <div
                                key={app.id}
                                className="flex items-center justify-between p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all group"
                            >
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">{app.app_name}</p>
                                </div>
                                <button
                                    onClick={() => removeBlocked(app.id, app.app_name)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-red-500/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Yasağı kaldır"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {!blockedApps.length && (
                            <div className="text-center py-4 text-slate-500 text-sm">Yasaklı uygulama yok</div>
                        )}
                    </div>
                </div>

                {/* Process Picker Modal */}
                {processPickerOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-white font-semibold text-sm">Çalışan Süreçler</h4>
                                <button
                                    onClick={() => setProcessPickerOpen(false)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                {procLoading ? (
                                    <div className="py-10 text-center text-slate-500">
                                        <Loader2 className="w-6 h-6 animate-spin inline-block" />
                                    </div>
                                ) : (
                                    processes.map(p => (
                                        <div key={`${p.pid}-${p.name}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                                            <div className="text-sm text-white">{p.name}</div>
                                            <div className="flex gap-2">
                                                <button
                                                    className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded"
                                                    onClick={async () => {
                                                        setProcessPickerOpen(false)
                                                        setNewAppName(p.name)
                                                        await addApp()
                                                    }}
                                                >
                                                    İzin ver
                                                </button>
                                                <button
                                                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                                                    onClick={async () => {
                                                        setProcessPickerOpen(false)
                                                        setNewBlockedName(p.name)
                                                        await addBlocked()
                                                    }}
                                                >
                                                    Yasakla
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-3 text-right">
                                <button
                                    onClick={() => {
                                        setProcessPickerOpen(false)
                                        setProcesses([])
                                    }}
                                    className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

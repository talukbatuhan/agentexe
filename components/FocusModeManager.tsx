import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Unlock, RefreshCw, Monitor } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface FocusModeManagerProps {
    deviceId: string
}

interface WindowInfo {
    title: string
    process: string
    pid: number
}

export default function FocusModeManager({ deviceId }: FocusModeManagerProps) {
    const supabase = createClient()
    const toast = useToast()
    const [isEnabled, setIsEnabled] = useState(false)
    const [targetTitle, setTargetTitle] = useState<string | null>(null)
    const [windows, setWindows] = useState<WindowInfo[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        fetchStatus()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId])

    const fetchStatus = async () => {
        const { data } = await supabase
            .from('devices')
            .select('focus_mode_enabled, focus_window_title')
            .eq('device_id', deviceId)
            .single()
        
        if (data) {
            setIsEnabled(data.focus_mode_enabled)
            setTargetTitle(data.focus_window_title)
        }
    }

    const fetchWindows = async () => {
        setRefreshing(true)
        try {
            // Send command to agent to get windows
            const { data: cmdData, error: cmdError } = await supabase
                .from('commands')
                .insert({
                    device_id: deviceId,
                    command_type: 'get_open_windows',
                    payload: {},
                    status: 'pending'
                })
                .select()
                .single()

            if (cmdError) throw cmdError

            // Poll for result
            let retries = 0
            while (retries < 10) {
                await new Promise(r => setTimeout(r, 1000))
                const { data: res } = await supabase
                    .from('commands')
                    .select('status, result')
                    .eq('id', cmdData.id)
                    .single()
                
                if (res?.status === 'completed' && res.result) {
                    const resultJson = typeof res.result === 'string' ? JSON.parse(res.result) : res.result
                    if (resultJson.windows) {
                        setWindows(resultJson.windows)
                    }
                    break
                }
                retries++
            }
        } catch {
            toast.error('Pencere listesi alınamadı')
        } finally {
            setRefreshing(false)
        }
    }

    const toggleFocusMode = async (enable: boolean, title: string | null = null) => {
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('devices')
                .update({
                    focus_mode_enabled: enable,
                    focus_window_title: title
                })
                .eq('device_id', deviceId)

            if (error) throw error

            setIsEnabled(enable)
            setTargetTitle(title)
            toast.success(enable ? `Odak modu aktif: ${title}` : 'Odak modu kapatıldı')
        } catch {
            toast.error('İşlem başarısız')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <toast.ToastContainer />
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Monitor className="w-6 h-6 text-blue-400" />
                        Odak Modu (Focus Lock)
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Kullanıcıyı tek bir pencereye kilitleyin. Diğer pencerelere geçiş engellenir.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isEnabled ? (
                        <button
                            onClick={() => toggleFocusMode(false)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            <Unlock className="w-4 h-4" />
                            Kilidi Kaldır
                        </button>
                    ) : (
                        <div className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-sm">
                            Pasif
                        </div>
                    )}
                </div>
            </div>

            {isEnabled && targetTitle ? (
                <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Lock className="w-8 h-8 text-blue-400" />
                        <div>
                            <h3 className="font-bold text-blue-100">Kilitlendi: {targetTitle}</h3>
                            <p className="text-blue-300 text-sm">Kullanıcı sadece bu pencereyi kullanabilir.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium">Açık Pencereler</h3>
                        <button
                            onClick={fetchWindows}
                            disabled={refreshing}
                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Listeyi Yenile
                        </button>
                    </div>

                    <div className="grid gap-2 max-h-96 overflow-y-auto">
                        {windows.length === 0 && !refreshing && (
                            <div className="text-center py-8 text-slate-500">
                                Açık pencere bulunamadı veya liste henüz çekilmedi.
                                <br />
                                Listeyi Yenile butonuna basın.
                            </div>
                        )}
                        
                        {windows.map((win, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg hover:bg-slate-800 transition-colors group">
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-slate-200 font-medium truncate" title={win.title}>
                                        {win.title}
                                    </span>
                                    <span className="text-slate-500 text-xs font-mono">
                                        {win.process} (PID: {win.pid})
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleFocusMode(true, win.title)}
                                    className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-all"
                                >
                                    Buna Kilitle
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

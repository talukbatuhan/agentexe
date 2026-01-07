'use client'

import { useEffect, useState } from 'react'
import {
    Monitor, Activity, Lock, X, MessageSquare, Loader2,
    Camera, Mic, Ban, Globe, Volume2, Maximize, Minimize,
    Power, BookOpen, Video, Folder, RotateCcw, Trash2, Home, ArrowUp, Shield
} from 'lucide-react'
import { Database } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import AllowlistManager from './AllowlistManager'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'

type Device = Database['public']['Tables']['devices']['Row']
type Heartbeat = Database['public']['Tables']['heartbeat']['Row']

interface DeviceCardProps {
    device: Device
    heartbeat?: Heartbeat | null
}

export default function DeviceCard({ device, heartbeat }: DeviceCardProps) {
    const toast = useToast()
    const confirm = useConfirm()
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState<'none' | 'message' | 'kill' | 'speak' | 'block_site' | 'screenshot_view' | 'volume' | 'file_explorer' | 'process_manager' | 'allowlist'>('none')
    const [inputValue, setInputValue] = useState('')
    const [voiceSelection, setVoiceSelection] = useState('google_tr')
    const [screenshotData, setScreenshotData] = useState<{ base64: string, date: string } | null>(null)
    const [isFullScreen, setIsFullScreen] = useState(false)
    const [fileList, setFileList] = useState<any[]>([])
    const [currentPath, setCurrentPath] = useState<string>('')
    const [viewSource, setViewSource] = useState<'screenshot' | 'webcam' | null>(null)
    const [isLive, setIsLive] = useState(false)
    const [runningProcesses, setRunningProcesses] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    const filteredProcesses = runningProcesses.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.pid).includes(searchTerm)
    )

    const supabase = createClient()

    // Live Mode Loop
    useEffect(() => {
        let timeout: NodeJS.Timeout
        if (isLive && !loading && dialogOpen === 'screenshot_view') {
            timeout = setTimeout(() => {
                if (viewSource === 'webcam') handleWebcam(true)
                else if (viewSource === 'screenshot') handleScreenshot(true)
            }, 500)
        }
        return () => clearTimeout(timeout)
    }, [loading, isLive, dialogOpen, viewSource]) // eslint-disable-line


    const lastSeenOk = heartbeat?.last_seen
        ? new Date(heartbeat.last_seen) > new Date(Date.now() - 2 * 60 * 1000)
        : false
    const isOnline = Boolean(heartbeat?.is_online) && lastSeenOk

    const handleScreenshot = async (silent: boolean = false) => {
        if (!silent) {
            setViewSource('screenshot')
            setIsLive(false)
        }
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // 1. Send Command
            await supabase.from('commands').insert({
                device_id: device.device_id,
                parent_id: user?.id || '00000000-0000-0000-0000-000000000000',
                command_type: 'screenshot',
                status: 'pending'
            })

            // 2. Poll for Result
            pollForImage('screenshot')

        } catch (e) {
            console.error(e)
            setLoading(false)
        }
    }

    const handleWebcam = async (silent: boolean = false) => {
        if (!silent) {
            setViewSource('webcam')
            setIsLive(true)
        }
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // 1. Send Command
            await supabase.from('commands').insert({
                device_id: device.device_id,
                parent_id: user?.id || '00000000-0000-0000-0000-000000000000',
                command_type: 'webcam_shot',
                status: 'pending'
            })

            // 2. Poll for Result
            pollForImage('webcam')

        } catch (e) {
            console.error(e)
            setLoading(false)
        }
    }

    const handleGetProcesses = async () => {
        setLoading(true)
        setRunningProcesses([]) // Clear previous
        setSearchTerm('') // Clear search

        try {
            const { data: { user } } = await supabase.auth.getUser()

            // Timestamp BEFORE sending command
            const commandSentTime = new Date()
            console.log('📤 Sending get_running_processes command at:', commandSentTime.toISOString())

            const { error: insertError } = await supabase.from('commands').insert({
                device_id: device.device_id,
                parent_id: user?.id || '00000000-0000-0000-0000-000000000000',
                command_type: 'get_running_processes',
                command_data: {}, // Empty payload but field must exist
                status: 'pending'
            })

            if (insertError) {
                console.error('❌ Command insert failed:', insertError)
                alert('Failed to send command: ' + insertError.message)
                setLoading(false)
                return
            }

            console.log('✅ Command sent successfully, starting to poll...')

            let attempts = 0
            const maxAttempts = 60
            const poll = setInterval(async () => {
                attempts++
                console.log(`🔍 Polling attempt ${attempts}/${maxAttempts}`)

                if (attempts > maxAttempts) {
                    clearInterval(poll)
                    setLoading(false)
                    alert('Process list timeout. Agent may be offline or busy.')
                    return
                }

                const { data, error: queryError } = await supabase
                    .from('device_logs')
                    .select('*')
                    .eq('device_id', device.device_id)
                    .eq('log_type', 'info')
                    .contains('metadata', { subtype: 'process_list' })
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle() // Use maybeSingle to avoid error if no results

                if (queryError) {
                    console.error('Query error:', queryError)
                    return // Continue polling
                }

                // Check if log was created AFTER command was sent
                if (data && new Date(data.created_at) > commandSentTime) {
                    console.log('✅ Found fresh process list log:', data.created_at)
                    clearInterval(poll)

                    let content = data.content
                    if (typeof content === 'string') {
                        try {
                            content = JSON.parse(content)
                        } catch (parseError) {
                            console.error('Parse error:', parseError)
                        }
                    }

                    if (content && content.processes && Array.isArray(content.processes)) {
                        console.log(`📋 Loaded ${content.processes.length} processes`)
                        setRunningProcesses(content.processes)
                        setDialogOpen('process_manager')
                    } else {
                        console.warn('Invalid process list format:', content)
                        alert('Received invalid process list format')
                    }
                    setLoading(false)
                } else if (data) {
                    console.log('⏳ Found old log, still waiting... (log time:', data.created_at, ')')
                }
            }, 1000)

        } catch (e) {
            console.error('❌ handleGetProcesses error:', e)
            alert('Error: ' + (e as Error).message)
            setLoading(false)
        }
    }

    const handleListFiles = async (path?: string) => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            await supabase.from('commands').insert({
                device_id: device.device_id,
                parent_id: user?.id || '00000000-0000-0000-0000-000000000000',
                command_type: 'list_directory',
                command_data: { payload: path },
                status: 'pending'
            })

            let attempts = 0
            const maxAttempts = 30
            const poll = setInterval(async () => {
                attempts++
                if (attempts > maxAttempts) {
                    clearInterval(poll)
                    setLoading(false)
                    alert('File list timeout.')
                    return
                }

                const { data } = await supabase
                    .from('device_logs')
                    .select('*')
                    .eq('device_id', device.device_id)
                    .eq('log_type', 'info')
                    .contains('metadata', { subtype: 'file_list' })
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                if (data && new Date(data.created_at) > new Date(Date.now() - 40000)) {
                    clearInterval(poll)
                    let content = data.content
                    if (typeof content === 'string') {
                        try { content = JSON.parse(content) } catch (e) { }
                    }

                    if (content.files) {
                        setFileList(content.files)
                        setCurrentPath(content.current_path)
                        setDialogOpen('file_explorer')
                    }
                    setLoading(false)
                }
            }, 1000)

        } catch (e) {
            console.error(e)
            setLoading(false)
        }
    }

    const handleDeleteFile = async (path: string) => {
        confirm.showConfirm(
            {
                title: 'Dosyayı Sil',
                message: `"${path}" kalıcı olarak silinecek. Emin misiniz?`,
                type: 'danger',
                confirmText: 'Sil',
                cancelText: 'İptal'
            },
            async () => {
                setFileList(prev => prev.filter(f => f.path !== path))

                // Use sendCommand if available, or manual insert
                const { data: { user } } = await supabase.auth.getUser()
                await supabase.from('commands').insert({
                    device_id: device.device_id,
                    parent_id: user?.id || '00000000-0000-0000-0000-000000000000',
                    command_type: 'delete_file',
                    command_data: { payload: path },
                    status: 'pending'
                })

                setTimeout(() => handleListFiles(currentPath || undefined), 2000)
            }
        )
    }

    const pollForImage = (logType: string) => {
        let attempts = 0
        const maxAttempts = 30
        const poll = setInterval(async () => {
            attempts++
            if (attempts > maxAttempts) {
                clearInterval(poll)
                setLoading(false)
                alert(`${logType} timeout (Check Agent Logs).`)
                return
            }

            const { data } = await supabase
                .from('device_logs')
                .select('*')
                .eq('device_id', device.device_id)
                .eq('log_type', logType)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (data && new Date(data.created_at) > new Date(Date.now() - 60000)) {
                clearInterval(poll)
                const meta = data.metadata || {}
                setScreenshotData({
                    base64: data.content,
                    date: new Date(data.created_at).toLocaleString()
                })
                setDialogOpen('screenshot_view')
                setLoading(false)
            }
        }, 2000)
    }

    const downloadScreenshot = () => {
        if (!screenshotData) return
        const link = document.createElement('a')
        link.href = `data:image/png;base64,${screenshotData.base64}`
        link.download = `screenshot_${device.device_id}.png`
        link.click()
    }

    const [localVolume, setLocalVolume] = useState(50)

    const sendCommand = async (
        commandType: string,
        payload?: any,
        silent: boolean = false // Yeni parametre: Sessiz mod
    ) => {
        if (commandType === 'screenshot') {
            return handleScreenshot()
        }

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            let finalPayload = payload
            if (commandType === 'speak') {
                finalPayload = {
                    text: payload,
                    voice: voiceSelection
                }
            }

            const { error } = await supabase
                .from('commands')
                .insert({
                    device_id: device.device_id,
                    parent_id: user?.id || '00000000-0000-0000-0000-000000000000',
                    command_type: commandType,
                    command_data: { payload: finalPayload },
                    status: 'pending'
                })

            if (error) throw error

            if (!silent) {
                toast.success('Komut başarıyla gönderildi!')
                if (dialogOpen !== 'process_manager') setDialogOpen('none') // Keep process manager open
                setInputValue('')
            }

        } catch (error: any) {
            console.error(error)
            toast.error('Komut gönderilemedi: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* Toast Notifications */}
            <toast.ToastContainer />

            {/* Confirmation Dialogs */}
            <confirm.ConfirmDialog />

            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500/20 p-3 rounded-xl">
                            <Monitor className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-lg">{device.device_name}</h3>
                            <p className="text-slate-400 text-sm">{device.device_id}</p>
                        </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${isOnline
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                        {isOnline ? '● Online' : '○ Offline'}
                    </div>
                </div>

                {/* Status Info */}
                {heartbeat && isOnline && (
                    <div className="mb-4 p-3 bg-black/20 rounded-xl space-y-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-400" />
                                <span className="text-xs text-slate-400">Active Window</span>
                            </div>
                            <p className="text-sm text-white font-medium truncate mt-1">
                                {heartbeat.active_window_title || 'Unknown'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                            <div>
                                <div className="text-xs text-slate-400">CPU</div>
                                <div className="text-sm font-semibold text-white">{heartbeat.cpu_usage?.toFixed(1) || 0}%</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400">RAM</div>
                                <div className="text-sm font-semibold text-white">{heartbeat.memory_usage?.toFixed(1) || 0}%</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid Layout for Buttons */}
                <div className="grid grid-cols-4 gap-2">
                    {/* Row 1 */}
                    <ActionButton
                        icon={<Lock className="w-4 h-4" />}
                        label="Kilitle"
                        color="red"
                        onClick={() => sendCommand('lock_pc')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Camera className="w-4 h-4" />}
                        label="Ekran"
                        color="purple"
                        onClick={() => handleScreenshot()}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Video className="w-4 h-4" />}
                        label="Kamera"
                        color="pink"
                        onClick={() => handleWebcam()}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Volume2 className="w-4 h-4" />}
                        label="Ses"
                        color="green"
                        onClick={() => setDialogOpen('volume')}
                        disabled={!isOnline || loading}
                    />

                    {/* Row 2 */}
                    <ActionButton
                        icon={<MessageSquare className="w-4 h-4" />}
                        label="Mesaj"
                        color="blue"
                        onClick={() => setDialogOpen('message')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Mic className="w-4 h-4" />}
                        label="Konuş"
                        color="pink"
                        onClick={() => setDialogOpen('speak')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Folder className="w-4 h-4" />}
                        label="Dosyalar"
                        color="orange"
                        onClick={() => window.location.href = `/dashboard/files/${device.device_id}`}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Activity className="w-4 h-4" />}
                        label="Görev Yön."
                        color="red"
                        onClick={() => handleGetProcesses()}
                        disabled={!isOnline || loading}
                    />

                    {/* Row 3 */}
                    <ActionButton
                        icon={<Globe className="w-4 h-4" />}
                        label="Site Engelle"
                        color="indigo"
                        onClick={() => setDialogOpen('block_site')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Shield className="w-4 h-4" />}
                        label="İzin Listesi"
                        color="red"
                        onClick={() => setDialogOpen('allowlist')}
                        disabled={loading}
                    />
                    <ActionButton
                        icon={<Power className="w-4 h-4" />}
                        label="Kapat"
                        color="red"
                        onClick={() => confirm.showConfirm(
                            {
                                title: 'Bilgisayarı Kapat',
                                message: 'Bilgisayar kapatılacak. Emin misiniz?',
                                type: 'danger',
                                confirmText: 'Kapat',
                                cancelText: 'İptal'
                            },
                            () => sendCommand('shutdown')
                        )}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<RotateCcw className="w-4 h-4" />}
                        label="Yeniden Başlat"
                        color="red"
                        onClick={() => confirm.showConfirm(
                            {
                                title: 'Bilgisayarı Yeniden Başlat',
                                message: 'Bilgisayar yeniden başlatılacak. Emin misiniz?',
                                type: 'warning',
                                confirmText: 'Yeniden Başlat',
                                cancelText: 'İptal'
                            },
                            () => sendCommand('restart')
                        )}
                        disabled={!isOnline || loading}
                    />

                    {/* Row 4 */}
                    <a href="/guide" className="block w-full col-span-2">
                        <button className="w-full flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all text-xs font-medium h-16 bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20">
                            <BookOpen className="w-4 h-4" />
                            <span>Kılavuz</span>
                        </button>
                    </a>

                    <div className="col-span-2">
                        <ActionButton
                            icon={<Power className="w-4 h-4" />}
                            label="Agent'ı Durdur"
                            color="red"
                            onClick={() => confirm.showConfirm(
                                {
                                    title: 'Agent\'ı Durdur',
                                    message: 'Bu, agent ve watchdog\'u tamamen durduracaktır. Emin misiniz?',
                                    type: 'danger',
                                    confirmText: 'Durdur',
                                    cancelText: 'İptal'
                                },
                                () => sendCommand('stop_agent')
                            )}
                            disabled={!isOnline || loading}
                        />
                    </div>
                </div>

                {/* File Explorer Dialog */}
                {dialogOpen === 'file_explorer' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-2xl text-center max-h-[80vh] flex flex-col shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-sm text-slate-300 truncate max-w-[80%]">
                                    <Folder className="w-4 h-4 text-orange-400" />
                                    <span className="font-mono">{currentPath || 'Home'}</span>
                                </div>
                                <button onClick={() => setDialogOpen('none')} className="p-2 hover:bg-white/10 rounded-full">
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => handleListFiles()}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-slate-700 transition border border-slate-700"
                                >
                                    <Home className="w-3 h-3" /> Home
                                </button>
                                <button
                                    onClick={() => {
                                        const parts = currentPath.split(/[/\\]/);
                                        parts.pop();
                                        const newPath = parts.join('\\') || '/';
                                        handleListFiles(newPath);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg text-xs hover:bg-slate-700 transition border border-slate-700"
                                >
                                    <ArrowUp className="w-3 h-3" /> Up
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                {fileList.map((file: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group border border-transparent hover:border-white/5 transition-all">
                                        <button
                                            className="flex items-center gap-3 flex-1 text-left"
                                            onClick={() => file.type === 'dir' && handleListFiles(file.path)}
                                        >
                                            {file.type === 'dir' ? (
                                                <Folder className="w-4 h-4 text-orange-400 fill-orange-400/20" />
                                            ) : (
                                                <Monitor className="w-4 h-4 text-blue-400" />
                                            )}
                                            <div className="flex flex-col">
                                                <span className="text-sm text-slate-200">{file.name}</span>
                                                <span className="text-[10px] text-slate-500">
                                                    {file.type === 'dir' ? 'Folder' : `${(file.size / 1024).toFixed(1)} KB`}
                                                </span>
                                            </div>
                                        </button>

                                        {file.type !== 'dir' && (
                                            <button
                                                onClick={() => handleDeleteFile(file.path)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition"
                                                title="Delete File"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {fileList.length === 0 && (
                                    <div className="text-slate-500 py-8 text-sm flex flex-col items-center gap-2">
                                        <Folder className="w-8 h-8 opacity-20" />
                                        Empty Directory
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}



                {/* Process Manager Dialog */}
                {dialogOpen === 'process_manager' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-2xl text-center max-h-[80vh] flex flex-col shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-red-400" />
                                    Process Manager
                                </h3>
                                <button onClick={() => setDialogOpen('none')} className="p-2 hover:bg-white/10 rounded-full">
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            <input
                                type="text"
                                placeholder="Search apps (e.g. chrome)..."
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white mb-4 focus:outline-none focus:border-red-500 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />

                            <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                                <div className="grid grid-cols-12 text-xs text-slate-500 mb-2 px-2 uppercase font-semibold">
                                    <div className="col-span-6 text-left">Name</div>
                                    <div className="col-span-3 text-right">PID</div>
                                    <div className="col-span-3 text-right">Memory</div>
                                </div>
                                {loading && runningProcesses.length === 0 && (
                                    <div className="py-8 text-center text-slate-500">Loading processes...</div>
                                )}
                                {filteredProcesses.map((proc: any, i: number) => (
                                    <div key={i} className="grid grid-cols-12 items-center p-2 rounded-lg hover:bg-white/5 group border border-transparent hover:border-white/5 transition-all text-sm">
                                        <div className="col-span-6 text-left font-medium text-slate-200 truncate pr-2" title={proc.name}>
                                            <span className={proc.name.toLowerCase().includes('code') ? 'text-blue-400' : ''}>{proc.name}</span>
                                        </div>
                                        <div className="col-span-3 text-right text-slate-500 font-mono">
                                            {proc.pid}
                                        </div>
                                        <div className="col-span-3 text-right flex items-center justify-end gap-3">
                                            <span className="text-slate-400 text-xs">{(proc.memory / 1024 / 1024).toFixed(0)} MB</span>

                                            <button
                                                onClick={() => {
                                                    confirm.showConfirm(
                                                        {
                                                            title: 'İşlemi Sonlandır',
                                                            message: `"${proc.name}" (PID: ${proc.pid}) sonlandırılacak. Bu işlem veri kaybına neden olabilir. Devam edilsin mi?`,
                                                            type: 'danger',
                                                            confirmText: 'Sonlandır',
                                                            cancelText: 'İptal'
                                                        },
                                                        () => {
                                                            sendCommand('kill_process', proc.name);
                                                            // Optimistic remove
                                                            setRunningProcesses(prev => prev.filter(p => p.pid !== proc.pid));
                                                        }
                                                    )
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition opacity-0 group-hover:opacity-100"
                                                title="Kill Process"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {!loading && filteredProcesses.length === 0 && runningProcesses.length > 0 && (
                                    <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                                        <Activity className="w-8 h-8 opacity-20" />
                                        <p>No processes match &ldquo;{searchTerm}&rdquo;</p>
                                    </div>
                                )}
                                {!loading && runningProcesses.length === 0 && (
                                    <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                                        <Activity className="w-8 h-8 opacity-20" />
                                        <p>No processes loaded</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="text-xs text-slate-500">
                                    {searchTerm ? `${filteredProcesses.length} / ${runningProcesses.length}` : `${runningProcesses.length}`} Processes
                                </span>
                                <button
                                    onClick={() => handleGetProcesses()}
                                    disabled={loading}
                                    className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 disabled:opacity-50"
                                >
                                    <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing...
                    </div>
                )}
            </div>

            {/* Universal Dialog - Refined */}
            {dialogOpen !== 'none' && dialogOpen !== 'screenshot_view' && dialogOpen !== 'volume' && dialogOpen !== 'file_explorer' && dialogOpen !== 'process_manager' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-slate-900/90 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl backdrop-blur-md transform scale-100 transition-all">

                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-3 rounded-xl ${dialogOpen === 'kill' ? 'bg-red-500/20 text-red-400' :
                                dialogOpen === 'block_site' ? 'bg-indigo-500/20 text-indigo-400' :
                                    dialogOpen === 'speak' ? 'bg-pink-500/20 text-pink-400' :
                                        'bg-blue-500/20 text-blue-400'
                                }`}>
                                {dialogOpen === 'kill' && <X className="w-6 h-6" />}
                                {dialogOpen === 'block_site' && <Globe className="w-6 h-6" />}
                                {dialogOpen === 'speak' && <Mic className="w-6 h-6" />}
                                {dialogOpen === 'message' && <MessageSquare className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white capitalize">
                                    {dialogOpen.replace('_', ' ')}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {dialogOpen === 'kill' ? 'Force stop a running application' :
                                        dialogOpen === 'block_site' ? 'Restrict access to a website' :
                                            dialogOpen === 'speak' ? 'Send voice command to device' :
                                                'Send a popup notification'}
                                </p>
                            </div>
                        </div>

                        {dialogOpen === 'speak' && (
                            <div className="mb-4">
                                <label className="text-xs font-semibold text-slate-400 mb-2 block uppercase tracking-wider">Voice Profile</label>
                                <div className="relative">
                                    <select
                                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-pink-500/50 transition-colors"
                                        value={voiceSelection}
                                        onChange={(e) => setVoiceSelection(e.target.value)}
                                    >
                                        <option value="google_tr">Google TR (Neural - High Quality)</option>
                                        <option value="offline_male">System Male (Offline)</option>
                                        <option value="offline_female">System Female (Offline)</option>
                                    </select>
                                    <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400">
                                        <ArrowUp className="w-4 h-4 rotate-180" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="text-xs font-semibold text-slate-400 mb-2 block uppercase tracking-wider">
                                {dialogOpen === 'kill' ? 'Process Name' :
                                    dialogOpen === 'block_site' ? 'Website URL' :
                                        dialogOpen === 'speak' ? 'Message to Speak' :
                                            'Message Content'}
                            </label>
                            <input
                                type="text"
                                placeholder={
                                    dialogOpen === 'message' ? "Type your alert message..." :
                                        dialogOpen === 'speak' ? "Type what the PC should say..." :
                                            dialogOpen === 'kill' ? "e.g. chrome.exe, notepad.exe" :
                                                "e.g. youtube.com, facebook.com"
                                }
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all font-medium"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && inputValue && !loading) {
                                        sendCommand(
                                            dialogOpen === 'message' ? 'send_message' :
                                                dialogOpen === 'kill' ? 'kill_process' :
                                                    dialogOpen,
                                            inputValue
                                        )
                                    }
                                }}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDialogOpen('none')}
                                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-slate-300 transition-colors border border-transparent hover:border-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => sendCommand(
                                    dialogOpen === 'message' ? 'send_message' :
                                        dialogOpen === 'kill' ? 'kill_process' :
                                            dialogOpen, // speak, block_site match command_type
                                    inputValue
                                )}
                                disabled={!inputValue || loading}
                                className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${dialogOpen === 'kill' ? 'bg-gradient-to-r from-red-600 to-orange-600' :
                                    dialogOpen === 'block_site' ? 'bg-gradient-to-r from-indigo-600 to-blue-600' :
                                        'bg-gradient-to-r from-purple-600 to-pink-600'
                                    }`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending...
                                    </div>
                                ) : (
                                    <>
                                        {dialogOpen === 'kill' ? 'Terminate' :
                                            dialogOpen === 'block_site' ? 'Block Access' :
                                                'Send Command'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Volume Control Dialog */}
            {dialogOpen === 'volume' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl relative">
                        <button
                            onClick={() => setDialogOpen('none')}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Volume2 className="w-5 h-5 text-green-400" />
                            Volume Control
                        </h3>

                        <div className="mb-8 px-2">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500 hover:accent-green-400"
                                value={localVolume}
                                onChange={(e) => setLocalVolume(Number(e.target.value))}
                                onMouseUp={() => sendCommand('set_volume', localVolume.toString(), true)}
                                onTouchEnd={() => sendCommand('set_volume', localVolume.toString(), true)} // Mobil için
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                                <span>Mute</span>
                                <span>{localVolume}%</span>
                                <span>Max</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            <button type="button" onClick={() => { setLocalVolume(0); sendCommand('set_volume', '0', true); }} className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-colors">MUTE</button>
                            <button type="button" onClick={() => { setLocalVolume(25); sendCommand('set_volume', '25', true); }} className="p-3 bg-white/5 text-white border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors">25%</button>
                            <button type="button" onClick={() => { setLocalVolume(50); sendCommand('set_volume', '50', true); }} className="p-3 bg-white/5 text-white border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors">50%</button>
                            <button type="button" onClick={() => { setLocalVolume(100); sendCommand('set_volume', '100', true); }} className="p-3 bg-white/5 text-white border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors">MAX</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Screenshot/Webcam Viewer */}
            {dialogOpen === 'screenshot_view' && screenshotData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className={`relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${isFullScreen ? 'w-full h-full' : 'max-w-4xl w-full'}`}>

                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg backdrop-blur-md ${viewSource === 'webcam' ? 'bg-pink-500/20' : 'bg-purple-500/20'}`}>
                                    {viewSource === 'webcam' ? <Video className="w-4 h-4 text-pink-400" /> : <Camera className="w-4 h-4 text-purple-400" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-white shadow-sm">
                                        {viewSource === 'webcam' ? 'Webcam Feed' : 'Desktop Screenshot'}
                                    </span>
                                    <span className="text-[10px] text-white/60">{screenshotData.date}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsLive(!isLive)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md transition-all ${isLive
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                                        : 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10'
                                        }`}
                                >
                                    {isLive ? (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                            LIVE
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw className="w-3 h-3" />
                                            Auto-Refresh
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => setIsFullScreen(!isFullScreen)}
                                    className="p-2 hover:bg-white/10 rounded-full text-white/80 transition-colors backdrop-blur-md"
                                >
                                    {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={() => {
                                        setDialogOpen('none')
                                        setIsLive(false)
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-full text-white transition-colors backdrop-blur-md"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Image */}
                        <div className="flex items-center justify-center bg-black w-full h-full min-h-[400px]">
                            <img
                                src={`data:image/jpeg;base64,${screenshotData.base64}`}
                                alt="Capture"
                                className={`object-contain ${isFullScreen ? 'max-h-screen' : 'max-h-[80vh]'}`}
                            />
                        </div>

                        {/* Footer Actions */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-4 z-10">
                            <button
                                onClick={downloadScreenshot}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-xs text-white transition-all border border-white/10 font-medium"
                            >
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Allowlist Dialog */}
            {dialogOpen === 'allowlist' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-4 flex items-center justify-between z-10">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-red-400" />
                                Application Allowlist Manager
                            </h3>
                            <button onClick={() => setDialogOpen('none')} className="p-2 hover:bg-white/10 rounded-full">
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div className="p-6">
                            <AllowlistManager deviceId={device.device_id} isOnline={isOnline} />
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function ActionButton({ icon, label, onClick, disabled, color }: any) {
    const colorClasses: any = {
        red: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
        orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20',
        pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/20',
        green: 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20',
        yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20',
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20',
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all text-xs font-medium h-16
                ${colorClasses[color]}
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
            `}
        >
            {icon}
            <span>{label}</span>
        </button>
    )
}

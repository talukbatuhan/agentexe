'use client'

import { useEffect, useState } from 'react'
import {
    Monitor, Activity, Lock, X, MessageSquare, Loader2,
    Camera, Mic, Ban, Globe, Volume2, Maximize, Minimize,
    Power, BookOpen, Video, Folder, RotateCcw, Trash2, Home, ArrowUp
} from 'lucide-react'
import { Database } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

type Device = Database['public']['Tables']['devices']['Row']
type Heartbeat = Database['public']['Tables']['heartbeat']['Row']

interface DeviceCardProps {
    device: Device
    heartbeat?: Heartbeat | null
}

export default function DeviceCard({ device, heartbeat }: DeviceCardProps) {
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState<'none' | 'message' | 'kill' | 'speak' | 'block_site' | 'screenshot_view' | 'volume' | 'file_explorer'>('none')
    const [inputValue, setInputValue] = useState('')
    const [voiceSelection, setVoiceSelection] = useState('google_tr')
    const [screenshotData, setScreenshotData] = useState<{ base64: string, date: string } | null>(null)
    const [isFullScreen, setIsFullScreen] = useState(false)
    const [fileList, setFileList] = useState<any[]>([])
    const [currentPath, setCurrentPath] = useState<string>('')
    const [viewSource, setViewSource] = useState<'screenshot' | 'webcam' | null>(null)
    const [isLive, setIsLive] = useState(false)

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


    const isOnline = heartbeat?.is_online &&
        heartbeat?.last_seen &&
        new Date(heartbeat.last_seen) > new Date(Date.now() - 2 * 60 * 1000)

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
            const maxAttempts = 15
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
                    .eq('log_type', 'file_list')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                if (data && new Date(data.created_at) > new Date(Date.now() - 30000)) {
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
        if (!confirm(`Permanently delete: ${path}?`)) return

        setFileList(prev => prev.filter(f => f.path !== path))

        // Use sendCommand if available, or manual insert
        // Assuming sendCommand is available below. 
        // If not, I'll use manual insert to be safe.
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
                alert('Command sent successfully!')
                setDialogOpen('none')
                setInputValue('')
            }

        } catch (error: any) {
            console.error(error)
            alert('Failed to send command: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
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
                        label="Lock"
                        color="red"
                        onClick={() => sendCommand('lock_pc')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Camera className="w-4 h-4" />}
                        label="Shot"
                        color="purple"
                        onClick={() => handleScreenshot()}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Video className="w-4 h-4" />}
                        label="Cam"
                        color="pink"
                        onClick={() => handleWebcam()}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Volume2 className="w-4 h-4" />}
                        label="Sound"
                        color="green"
                        onClick={() => setDialogOpen('volume')}
                        disabled={!isOnline || loading}
                    />

                    {/* Row 2 */}
                    <ActionButton
                        icon={<MessageSquare className="w-4 h-4" />}
                        label="Msg"
                        color="blue"
                        onClick={() => setDialogOpen('message')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Mic className="w-4 h-4" />}
                        label="Speak"
                        color="pink"
                        onClick={() => setDialogOpen('speak')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Folder className="w-4 h-4" />}
                        label="Files"
                        color="orange"
                        onClick={() => handleListFiles()}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<X className="w-4 h-4" />}
                        label="Kill"
                        color="orange"
                        onClick={() => setDialogOpen('kill')}
                        disabled={!isOnline || loading}
                    />

                    {/* Row 3 */}
                    <ActionButton
                        icon={<Globe className="w-4 h-4" />}
                        label="Block Site"
                        color="indigo"
                        onClick={() => setDialogOpen('block_site')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Ban className="w-4 h-4" />}
                        label="Block Inp"
                        color="yellow"
                        onClick={() => sendCommand('block_input', '15')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Power className="w-4 h-4" />}
                        label="Shutdown"
                        color="red"
                        onClick={() => confirm("Shutdown PC?") && sendCommand('shutdown')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<RotateCcw className="w-4 h-4" />}
                        label="Restart"
                        color="red"
                        onClick={() => confirm("Restart PC?") && sendCommand('restart')}
                        disabled={!isOnline || loading}
                    />

                    {/* Row 4 */}
                    <a href="/guide" className="block w-full col-span-2">
                        <button className="w-full flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all text-xs font-medium h-16 bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20">
                            <BookOpen className="w-4 h-4" />
                            <span>Guide</span>
                        </button>
                    </a>

                    <div className="col-span-2">
                        <ActionButton
                            icon={<Power className="w-4 h-4" />}
                            label="Stop Agent"
                            color="red"
                            onClick={() => {
                                if (confirm("Are you sure? This will stop the agent and watchdog completely.")) {
                                    sendCommand('stop_agent')
                                }
                            }}
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

                {loading && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing...
                    </div>
                )}
            </div>

            {/* Universal Dialog */}
            {dialogOpen !== 'none' && dialogOpen !== 'screenshot_view' && dialogOpen !== 'volume' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 capitalize">
                            {dialogOpen.replace('_', ' ')}
                        </h3>

                        {dialogOpen === 'speak' && (
                            <div className="mb-4">
                                <label className="text-xs text-slate-400 mb-2 block">Select Voice</label>
                                <select
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 mb-2"
                                    value={voiceSelection}
                                    onChange={(e) => setVoiceSelection(e.target.value)}
                                >
                                    <option value="google_tr">Google TR (Best Quality - Female)</option>
                                    <option value="offline_male">System Male (Offline)</option>
                                    <option value="offline_female">System Female (Offline)</option>
                                </select>
                            </div>
                        )}

                        <input
                            type="text"
                            placeholder={
                                dialogOpen === 'message' ? "Enter message..." :
                                    dialogOpen === 'speak' ? "Text to speech..." :
                                        dialogOpen === 'kill' ? "Process name (e.g. notepad.exe)..." :
                                            "Domain (e.g. youtube.com)..."
                            }
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white mb-4 focus:outline-none focus:border-purple-500"
                            autoFocus
                        />

                        <div className="flex gap-2">
                            <button
                                onClick={() => setDialogOpen('none')}
                                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-slate-300 transition-colors"
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
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                Send
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

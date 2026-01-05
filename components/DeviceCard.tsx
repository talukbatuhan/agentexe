'use client'

import { useState } from 'react'
import {
    Monitor, Activity, Lock, X, MessageSquare, Loader2,
    Camera, Mic, Ban, Globe, Volume2
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
    const [dialogOpen, setDialogOpen] = useState<'none' | 'message' | 'kill' | 'speak' | 'block_site' | 'screenshot_view'>('none')
    const [inputValue, setInputValue] = useState('')

    const [screenshotData, setScreenshotData] = useState<{ base64: string, date: string } | null>(null)

    const supabase = createClient()

    const isOnline = heartbeat?.is_online &&
        heartbeat?.last_seen &&
        new Date(heartbeat.last_seen) > new Date(Date.now() - 2 * 60 * 1000)

    const handleScreenshot = async () => {
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

            // 2. Poll for Result (wait for agent to upload)
            let attempts = 0
            const maxAttempts = 30 // Extended to 60 seconds
            const poll = setInterval(async () => {
                attempts++
                if (attempts > maxAttempts) {
                    clearInterval(poll)
                    setLoading(false)
                    alert('Screenshot timeout (Check Agent Logs).')
                    return
                }

                const { data } = await supabase
                    .from('device_logs')
                    .select('*')
                    .eq('device_id', device.device_id)
                    .eq('log_type', 'screenshot')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                if (data && new Date(data.created_at) > new Date(Date.now() - 60000)) { // 60s window
                    clearInterval(poll)
                    setScreenshotData({
                        base64: data.content,
                        date: new Date(data.created_at).toLocaleString()
                    })
                    setDialogOpen('screenshot_view')
                    setLoading(false)
                }
            }, 2000)

        } catch (e) {
            console.error(e)
            setLoading(false)
        }
    }

    const downloadScreenshot = () => {
        if (!screenshotData) return
        const link = document.createElement('a')
        link.href = `data:image/png;base64,${screenshotData.base64}`
        link.download = `screenshot_${device.device_id}.png`
        link.click()
    }

    const sendCommand = async (
        commandType: string,
        payload?: any
    ) => {
        if (commandType === 'screenshot') {
            return handleScreenshot()
        }

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                console.warn('Not authenticated, command might fail if RLS enforces auth.')
            }

            const { error } = await supabase
                .from('commands')
                .insert({
                    device_id: device.device_id,
                    parent_id: user?.id || '00000000-0000-0000-0000-000000000000', // Fallback for dev
                    command_type: commandType,
                    command_data: { payload },
                    status: 'pending'
                })

            if (error) throw error

            alert('Command sent successfully!')
            setDialogOpen('none')
            setInputValue('')
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
                        onClick={() => sendCommand('screenshot')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<X className="w-4 h-4" />}
                        label="Kill"
                        color="orange"
                        onClick={() => setDialogOpen('kill')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Volume2 className="w-4 h-4" />}
                        label="Vol 50"
                        color="green"
                        onClick={() => sendCommand('set_volume', '50')}
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
                        icon={<Ban className="w-4 h-4" />}
                        label="Block Inp"
                        color="yellow"
                        onClick={() => sendCommand('block_input', '15')}
                        disabled={!isOnline || loading}
                    />
                    <ActionButton
                        icon={<Globe className="w-4 h-4" />}
                        label="Block Site"
                        color="indigo"
                        onClick={() => setDialogOpen('block_site')}
                        disabled={!isOnline || loading}
                    />
                </div>

                {loading && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing...
                    </div>
                )}
            </div>

            {/* Universal Dialog */}
            {dialogOpen !== 'none' && dialogOpen !== 'screenshot_view' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 capitalize">
                            {dialogOpen.replace('_', ' ')}
                        </h3>

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

            {/* Screenshot Viewer Dialog */}
            {dialogOpen === 'screenshot_view' && screenshotData && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-2xl p-4 max-w-4xl w-full border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <div>
                                <h3 className="text-lg font-bold text-white">📸 Screenshot</h3>
                                <p className="text-xs text-slate-400">{screenshotData.date}</p>
                            </div>
                            <button onClick={() => setDialogOpen('none')} className="p-2 hover:bg-white/10 rounded-full">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto bg-black rounded-xl border border-white/5 flex items-center justify-center p-2">
                            <img
                                src={`data:image/png;base64,${screenshotData.base64}`}
                                alt="Screen Capture"
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>

                        <div className="mt-4 flex justify-end gap-3 px-2">
                            <button
                                onClick={() => setDialogOpen('none')}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-slate-300 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={downloadScreenshot}
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold text-white hover:opacity-90 shadow-lg flex items-center gap-2"
                            >
                                <Camera className="w-4 h-4" />
                                Download Image
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

import {
    Monitor, Lock, Camera, Volume2, MessageSquare,
    Mic, Ban, Globe, Shield, Clock, Eye, Power, FileText,
    Video, Folder, RotateCcw
} from 'lucide-react'

export default function GuidePage() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Features & Usage Guide
                    </h1>
                    <p className="text-slate-400 mt-2">Documentation for HomeGuardian Agent v2.0</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. Core Controls */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-purple-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <Monitor className="w-6 h-6 text-purple-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Visual & Audio</h2>
                    </div>

                    <FeatureItem
                        icon={<Lock className="w-4 h-4 text-red-400" />}
                        title="Lock PC"
                        desc="Instantly locks the Windows session. User must re-enter password."
                    />
                    <FeatureItem
                        icon={<Camera className="w-4 h-4 text-purple-400" />}
                        title="Screenshot"
                        desc="Take a real-time screenshot of the desktop."
                    />
                    <FeatureItem
                        icon={<Video className="w-4 h-4 text-pink-400" />}
                        title="Webcam"
                        desc="Capture a photo from the computer's webcam instantly."
                    />
                    <FeatureItem
                        icon={<Volume2 className="w-4 h-4 text-green-400" />}
                        title="Volume Control"
                        desc="Adjust system volume remotely, or mute completely."
                    />
                </div>

                {/* 2. Communication & Input */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <MessageSquare className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Interactive</h2>
                    </div>

                    <FeatureItem
                        icon={<MessageSquare className="w-4 h-4 text-blue-400" />}
                        title="Send Message"
                        desc="Shows a popup message dialog on the user's screen."
                    />
                    <FeatureItem
                        icon={<Mic className="w-4 h-4 text-pink-400" />}
                        title="Text to Speech"
                        desc="Speaks text aloud using Google Cloud or Offline System Voices."
                    />
                    <FeatureItem
                        icon={<Ban className="w-4 h-4 text-yellow-400" />}
                        title="Block Input"
                        desc="Freezes Mouse and Keyboard for 15 seconds."
                    />
                </div>

                {/* 3. Advanced Security */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-red-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-red-500/20 rounded-xl">
                            <Shield className="w-6 h-6 text-red-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Security & Filtering</h2>
                    </div>

                    <FeatureItem
                        icon={<Shield className="w-4 h-4 text-emerald-400" />}
                        title="Safe DNS"
                        desc="Forced AdGuard Family Protection (94.140.14.15)."
                    />
                    <FeatureItem
                        icon={<Eye className="w-4 h-4 text-orange-400" />}
                        title="Content Monitor"
                        desc="Detects bad keywords, kills app, and captures evidence."
                    />
                    <FeatureItem
                        icon={<FileText className="w-4 h-4 text-slate-400" />}
                        title="App Allowlist"
                        desc="Optional mode to block ALL apps except allowed ones."
                    />
                </div>

                {/* 4. Time Management & Files */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-yellow-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-yellow-500/20 rounded-xl">
                            <Folder className="w-6 h-6 text-orange-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Files & Time</h2>
                    </div>

                    <FeatureItem
                        icon={<Folder className="w-4 h-4 text-orange-400" />}
                        title="File Explorer"
                        desc="Browse folders remotely. View files and delete unwanted content."
                    />
                    <FeatureItem
                        icon={<Clock className="w-4 h-4 text-yellow-400" />}
                        title="Time Quotas"
                        desc="Automatically locks PC between 23:00 - 07:00."
                    />
                    <FeatureItem
                        icon={<Globe className="w-4 h-4 text-indigo-400" />}
                        title="Block Site"
                        desc="Blocks specific domains via HOSTS file."
                    />
                </div>

                {/* 5. System Control */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-slate-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-slate-500/20 rounded-xl">
                            <Power className="w-6 h-6 text-slate-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">System Control</h2>
                    </div>

                    <FeatureItem
                        icon={<Power className="w-4 h-4 text-red-400" />}
                        title="Shutdown / Restart"
                        desc="Remotely turn off or reboot the computer."
                    />
                    <FeatureItem
                        icon={<Power className="w-4 h-4 text-red-400" />}
                        title="Stop Agent"
                        desc="Safely shuts down the Agent and Watchdog service."
                    />
                    <FeatureItem
                        icon={<Shield className="w-4 h-4 text-green-400" />}
                        title="Watchdog & Tamper"
                        desc="Auto-restarts agent if killed. Blocks Task Manager."
                    />
                </div>

            </div>
        </div>
    )
}

function FeatureItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="mt-1 shrink-0">{icon}</div>
            <div>
                <h4 className="text-sm font-medium text-white">{title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}

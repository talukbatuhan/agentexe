'use client'

import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react'

interface ConfirmDialogProps {
    title: string
    message: string
    type?: 'info' | 'warning' | 'danger' | 'success'
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
}

export default function ConfirmDialog({
    title,
    message,
    type = 'info',
    confirmText = 'Tamam',
    cancelText = 'İptal',
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    const config = {
        info: {
            icon: <Info className="w-12 h-12" />,
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-400',
            confirmBg: 'bg-blue-600 hover:bg-blue-700'
        },
        warning: {
            icon: <AlertTriangle className="w-12 h-12" />,
            iconBg: 'bg-yellow-500/20',
            iconColor: 'text-yellow-400',
            confirmBg: 'bg-yellow-600 hover:bg-yellow-700'
        },
        danger: {
            icon: <XCircle className="w-12 h-12" />,
            iconBg: 'bg-red-500/20',
            iconColor: 'text-red-400',
            confirmBg: 'bg-red-600 hover:bg-red-700'
        },
        success: {
            icon: <CheckCircle className="w-12 h-12" />,
            iconBg: 'bg-green-500/20',
            iconColor: 'text-green-400',
            confirmBg: 'bg-green-600 hover:bg-green-700'
        }
    }

    const { icon, iconBg, iconColor, confirmBg } = config[type]

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-white/10">
                    <div className="flex items-start gap-4">
                        <div className={`${iconBg} ${iconColor} p-3 rounded-xl`}>
                            {icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                            <p className="text-slate-300 mt-2 leading-relaxed">{message}</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 bg-white/5">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-all"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-3 ${confirmBg} text-white rounded-xl font-medium transition-all shadow-lg`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}

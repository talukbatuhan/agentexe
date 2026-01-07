'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
    message: string
    type: ToastType
    duration?: number
    onClose: () => void
}

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isLeaving, setIsLeaving] = useState(false)

    const handleClose = () => {
        setIsLeaving(true)
        setTimeout(() => {
            onClose()
        }, 300) // Match animation duration
    }

    useEffect(() => {
        // Fade in
        setTimeout(() => setIsVisible(true), 10)

        // Auto dismiss
        const timer = setTimeout(() => {
            handleClose()
        }, duration)

        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration])

    const config = {
        success: {
            icon: <CheckCircle className="w-5 h-5" />,
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/30',
            textColor: 'text-green-400',
            iconColor: 'text-green-400'
        },
        error: {
            icon: <XCircle className="w-5 h-5" />,
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/30',
            textColor: 'text-red-400',
            iconColor: 'text-red-400'
        },
        warning: {
            icon: <AlertTriangle className="w-5 h-5" />,
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/30',
            textColor: 'text-yellow-400',
            iconColor: 'text-yellow-400'
        },
        info: {
            icon: <Info className="w-5 h-5" />,
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/30',
            textColor: 'text-blue-400',
            iconColor: 'text-blue-400'
        }
    }

    const { icon, bgColor, borderColor, textColor, iconColor } = config[type]

    return (
        <div
            className={`
                fixed top-4 right-4 z-[9999] 
                ${bgColor} ${borderColor} border
                backdrop-blur-xl rounded-xl shadow-2xl
                p-4 min-w-[300px] max-w-md
                flex items-center gap-3
                transition-all duration-300
                ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
            `}
        >
            <div className={iconColor}>
                {icon}
            </div>
            <p className={`flex-1 text-sm font-medium ${textColor}`}>
                {message}
            </p>
            <button
                onClick={handleClose}
                className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}

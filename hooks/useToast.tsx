'use client'

import { useState, useCallback } from 'react'
import Toast, { ToastType } from '@/components/Toast'

interface ToastMessage {
    id: number
    message: string
    type: ToastType
}

export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
    }, [])

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])

    const ToastContainer = () => (
        <>
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </>
    )

    return {
        showToast,
        ToastContainer,
        success: (msg: string) => showToast(msg, 'success'),
        error: (msg: string) => showToast(msg, 'error'),
        warning: (msg: string) => showToast(msg, 'warning'),
        info: (msg: string) => showToast(msg, 'info'),
    }
}

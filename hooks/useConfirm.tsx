'use client'

import { useState, useCallback } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'

interface ConfirmOptions {
    title: string
    message: string
    type?: 'info' | 'warning' | 'danger' | 'success'
    confirmText?: string
    cancelText?: string
}

export function useConfirm() {
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean
        options: ConfirmOptions
        onConfirm: () => void
        onCancel: () => void
    } | null>(null)

    const showConfirm = useCallback((
        options: ConfirmOptions,
        onConfirm: () => void,
        onCancel?: () => void
    ) => {
        setConfirmState({
            isOpen: true,
            options,
            onConfirm: () => {
                onConfirm()
                setConfirmState(null)
            },
            onCancel: () => {
                if (onCancel) onCancel()
                setConfirmState(null)
            }
        })
    }, [])

    const ConfirmDialogComponent = () => {
        if (!confirmState?.isOpen) return null

        return (
            <ConfirmDialog
                title={confirmState.options.title}
                message={confirmState.options.message}
                type={confirmState.options.type}
                confirmText={confirmState.options.confirmText}
                cancelText={confirmState.options.cancelText}
                onConfirm={confirmState.onConfirm}
                onCancel={confirmState.onCancel}
            />
        )
    }

    return {
        showConfirm,
        ConfirmDialog: ConfirmDialogComponent
    }
}

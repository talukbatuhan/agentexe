export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            commands: {
                Row: {
                    id: string
                    created_at: string
                    updated_at: string
                    command_type: 'lock_pc' | 'kill_process' | 'send_message'
                    command_data: Json | null
                    device_id: string
                    parent_id: string
                    status: 'pending' | 'executing' | 'completed' | 'failed'
                    executed_at: string | null
                    error_message: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    command_type: 'lock_pc' | 'kill_process' | 'send_message'
                    command_data?: Json | null
                    device_id: string
                    parent_id: string
                    status?: 'pending' | 'executing' | 'completed' | 'failed'
                    executed_at?: string | null
                    error_message?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    command_type?: 'lock_pc' | 'kill_process' | 'send_message'
                    command_data?: Json | null
                    device_id?: string
                    parent_id?: string
                    status?: 'pending' | 'executing' | 'completed' | 'failed'
                    executed_at?: string | null
                    error_message?: string | null
                }
            }
            devices: {
                Row: {
                    id: string
                    created_at: string
                    device_id: string
                    device_name: string
                    parent_id: string
                    os_version: string | null
                    agent_version: string | null
                    registration_code: string | null
                    is_active: boolean
                }
                Insert: {
                    id?: string
                    created_at?: string
                    device_id: string
                    device_name: string
                    parent_id: string
                    os_version?: string | null
                    agent_version?: string | null
                    registration_code?: string | null
                    is_active?: boolean
                }
                Update: {
                    id?: string
                    created_at?: string
                    device_id?: string
                    device_name?: string
                    parent_id?: string
                    os_version?: string | null
                    agent_version?: string | null
                    registration_code?: string | null
                    is_active?: boolean
                }
            }
            heartbeat: {
                Row: {
                    id: string
                    created_at: string
                    device_id: string
                    device_name: string | null
                    parent_id: string | null
                    is_online: boolean
                    last_seen: string
                    active_window_title: string | null
                    active_process_name: string | null
                    cpu_usage: number | null
                    memory_usage: number | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    device_id: string
                    device_name?: string | null
                    parent_id?: string | null
                    is_online?: boolean
                    last_seen?: string
                    active_window_title?: string | null
                    active_process_name?: string | null
                    cpu_usage?: number | null
                    memory_usage?: number | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    device_id?: string
                    device_name?: string | null
                    parent_id?: string | null
                    is_online?: boolean
                    last_seen?: string
                    active_window_title?: string | null
                    active_process_name?: string | null
                    cpu_usage?: number | null
                    memory_usage?: number | null
                }
            }
        }
    }
}

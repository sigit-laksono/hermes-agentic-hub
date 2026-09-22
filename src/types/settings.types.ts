/**
 * Settings & System Configuration Types — Hermes Agentic Hub
 */

export type SettingsSection = 'general' | 'env' | 'models' | 'gateway' | 'credentials' | 'memory' | 'doctor'

export interface EnvVariable {
  key: string
  value: string
  is_secret: boolean
  source?: string
}

export interface GatewayStatus {
  running: boolean
  pid?: number
  uptime?: string
  platforms: GatewayPlatform[]
}

export interface GatewayPlatform {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  type: string
}

export interface DoctorCheck {
  name: string
  status: 'ok' | 'warning' | 'error'
  detail?: string
}

export interface SystemDoctorResult {
  checks: DoctorCheck[]
  overall: 'healthy' | 'warning' | 'critical'
}

export interface MemoryProviderInfo {
  name: string
  active: boolean
  config: Record<string, any>
}

export interface CredentialEntry {
  provider: string
  key_prefix: string
  status: 'active' | 'expired' | 'rate_limited'
  last_used?: string
}

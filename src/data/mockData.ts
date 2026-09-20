import { Task, Project, AutopilotJob, AIAgent, Squad, Skill } from '../types'

export const initialTasks: Task[] = [
  {
    id: 'DIK-55',
    title: 'Cek static Routing',
    description: `[17/09, 10:37] Goemie Kpc: mas
[17/09, 10:37] Goemie Kpc: ada request akses aws kpc (hses) ke segmen jakarta
[17/09, 10:38] Sigit: Segmen jakarta boleh di info mas
[17/09, 10:38] Sigit: Biar aku cek static route di awsnya mas
[17/09, 10:41] Goemie Kpc: 10.6.0.0/16
10.100.105.0/24
10.2.1.0/24
10.2.10.0/24
10.7.1.0/24
10.70.10.0/24
[17/09, 10:41] Sigit: Aku cek dulu ya mas

Bantu saya cek routing static di vpc kpc bukan yang kimper,`,
    status: 'in_review',
    priority: 'medium',
    assigneeType: 'agent',
    assigneeName: 'AWS Cloud Operations',
    assigneeProfile: 'sa-aws',
    assigneeAvatar: '⚡',
    projectName: 'KPC-Cloud-Managed Services',
    updatedAt: '2d ago',
    reviewReport: '### Laporan Hasil Verifikasi Static Routing\n- **Status Peering:** Active\n- **Route Table ID:** rtb-03ab921c\n- **Target CIDR:** 10.200.0.0/16 via tgw-0987af\n- **Rekomendasi:** Konfigurasi telah sesuai standar keamanan DikstraCloud.',
    attachments: [
      {
        id: 101,
        task_id: 'DIK-55',
        filename: 'vpc-peering-routes.tf',
        content_type: 'text/plain',
        size: 3420,
        uploaded_by: 'sa-aws',
        created_at: Math.floor(Date.now() / 1000) - 86400
      },
      {
        id: 102,
        task_id: 'DIK-55',
        filename: 'route-table-verification.md',
        content_type: 'text/markdown',
        size: 1840,
        uploaded_by: 'sa-aws',
        created_at: Math.floor(Date.now() / 1000) - 86000
      }
    ]
  },
  {
    id: 'DIK-35',
    title: '[Email] Jadwal & Persiapan Sharing Knowledge Arsitektur...',
    description: 'Koordinasi jadwal internal session migrasi multi-account AWS.',
    status: 'in_review',
    priority: 'high',
    assigneeType: 'agent',
    assigneeName: 'Outlook Email Agent',
    assigneeAvatar: '📧',
    projectName: 'Email Management',
    projectTag: 'Email Management',
    updatedAt: '2d ago',
    reviewReport: 'Draft undangan email telah disiapkan untuk dikirim ke seluruh Solution Architect.'
  },
  {
    id: 'DIK-32',
    title: '[Email] Re: Doc-MAP-TMS (Revisi ASSA AWS Migration Strategy &...',
    description: 'Review revisi dokumen strategi migrasi pelanggan ASSA.',
    status: 'blocked',
    priority: 'urgent',
    assigneeType: 'agent',
    assigneeName: 'Outlook Email Agent',
    assigneeAvatar: '📧',
    projectName: 'Email Management',
    projectTag: 'Email Management',
    updatedAt: '3d ago',
    reviewReport: 'Membutuhkan klarifikasi budget AWS dari pihak finance sebelum melanjutkan.'
  },
  {
    id: 'DIK-58',
    title: 'Buatkan Topology',
    description: 'Desain diagram topologi multi-VPC dengan AWS Transit Gateway dan firewall inspection.',
    status: 'done',
    priority: 'high',
    assigneeType: 'agent',
    assigneeName: 'AWS Solution Architect',
    assigneeAvatar: '🤖',
    projectName: 'KPC-Cloud-Managed Services',
    updatedAt: '1d ago',
    reviewReport: 'Diagram topologi arsitektur telah selesai dibuat dalam format Mermaid & Excalidraw.',
    attachments: [
      {
        id: 103,
        task_id: 'DIK-58',
        filename: 'aws-transit-gateway-topology.svg',
        content_type: 'image/svg+xml',
        size: 15200,
        uploaded_by: 'sa-aws',
        created_at: Math.floor(Date.now() / 1000) - 43200
      },
      {
        id: 104,
        task_id: 'DIK-58',
        filename: 'tgw-attachment-config.yaml',
        content_type: 'text/yaml',
        size: 2150,
        uploaded_by: 'sa-aws',
        created_at: Math.floor(Date.now() / 1000) - 43000
      }
    ]
  },
  {
    id: 'DIK-56',
    title: 'Cost Report',
    description: 'Analisa anomali lonjakan tagihan EC2 dan NAT Gateway bulan ini.',
    status: 'done',
    priority: 'medium',
    assigneeType: 'agent',
    assigneeName: 'AWS Cloud Operations',
    assigneeAvatar: '📊',
    projectName: 'KPC-Cloud-Managed Services',
    updatedAt: '1d ago',
    reviewReport: 'Maksud dari Aktual Cost vs Estimasi: Penghematan $450/bulan setelah reserved instances.'
  },
  {
    id: 'DIK-54',
    title: 'Template Assessment Server',
    description: 'Standardisasi checklist assessment workload sebelum migrasi ke AWS Cloud.',
    status: 'done',
    priority: 'none',
    assigneeType: 'agent',
    assigneeName: 'AWS Cloud Operations',
    assigneeAvatar: '📋',
    projectName: 'KPC-Cloud-Managed Services',
    updatedAt: '1d ago',
    reviewReport: 'Template spreadsheet dan formulir asesmen telah diperbarui di repository.'
  },
  {
    id: 'DIK-52',
    title: 'AWS Rightsizing Recomendasi',
    description: 'Identifikasi idle instances dan overprovisioned RDS instances.',
    status: 'done',
    priority: 'medium',
    assigneeType: 'agent',
    assigneeName: 'AWS Cloud Operations',
    assigneeAvatar: '⚙️',
    projectName: 'KPC-Cloud-Managed Services',
    updatedAt: '1d ago',
    reviewReport: 'Berikut terlampir file rekomendasi rightsizing untuk 12 instance EC2.'
  },
  {
    id: 'DIK-41',
    title: 'Assesment Account',
    description: 'Audit postur keamanan IAM dan logging CloudTrail.',
    status: 'done',
    priority: 'none',
    assigneeType: 'agent',
    assigneeName: 'AWS Solution Architect',
    assigneeAvatar: '🤖',
    projectName: 'KPC-Cloud-Managed Services',
    updatedAt: '4d ago',
    reviewReport: 'Security score AWS Foundations Benchmark: 88% compliance.'
  }
]

export const initialProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'KPC-Cloud-Managed Services',
    status: 'paused',
    priority: 'none',
    progressDone: 1,
    progressTotal: 1,
    lead: 'Muhammad Sigit',
    leadAvatar: '👤',
    createdAt: '4d ago',
    description: 'Managed Services KPC Cloud Account. Shared with agents as context for every run in this project.'
  },
  {
    id: 'proj-2',
    name: 'Email Management',
    status: 'paused',
    priority: 'none',
    progressDone: 0,
    progressTotal: 8,
    lead: 'Outlook Email Agent',
    leadAvatar: '🦊',
    createdAt: '4d ago',
    description: 'Automasi klasifikasi, triase, dan drafting balasan email teknis tim DikstraCloud.'
  }
]

export const initialAutopilots: AutopilotJob[] = [
  {
    id: 'auto-1',
    name: 'Cek Email Outlook (2 Jam Sekali)',
    assignee: 'Outlook Email Agent',
    assigneeAvatar: '🦊',
    trigger: 'Schedule (every 2h)',
    lastRun: '35m ago',
    nextRun: 'Today, 06:00 PM',
    status: 'active'
  }
]

export const initialAgents: AIAgent[] = [
  {
    id: 'agent-1',
    name: 'Outlook Email Agent',
    description: 'Menganalisa dan mengkategorikan email Outlook masuk.',
    status: 'online',
    owner: 'Muhammad Sigit',
    access: 'Owner only',
    runtime: 'Claude (DCS-LAN-9router)',
    lastActive: 'Today',
    avatar: '🦊'
  },
  {
    id: 'agent-2',
    name: 'AWS Solution Architect',
    description: 'Senior AWS Solutions Architect untuk desain arsitektur.',
    status: 'online',
    owner: 'Muhammad Sigit',
    access: 'Workspace',
    runtime: 'Claude (DCS-LAN-9router)',
    lastActive: '1 day ago',
    avatar: '🤖'
  },
  {
    id: 'agent-3',
    name: 'AWS Team Lead',
    description: 'Orchestrator dan Squad Lead untuk AWS Cloud Operations.',
    status: 'online',
    owner: 'Muhammad Sigit',
    access: 'Workspace',
    runtime: 'Claude (DCS-LAN-9router)',
    lastActive: '2 days ago',
    avatar: '👑'
  },
  {
    id: 'agent-4',
    name: 'KPC Cloud - Ops',
    description: 'Dedicated AWS Cloud Operations untuk klien KPC.',
    status: 'online',
    owner: 'Muhammad Sigit',
    access: 'Workspace',
    runtime: 'Claude (DCS-LAN-9router)',
    lastActive: '2 days ago',
    avatar: '⚡'
  },
  {
    id: 'agent-5',
    name: 'TLI - AWS Engineer',
    description: 'Dedicated AWS Cloud Engineer untuk TLI.',
    status: 'online',
    owner: 'Muhammad Sigit',
    access: 'Workspace',
    runtime: 'Claude (DCS-LAN-9router)',
    lastActive: '2 days ago',
    avatar: '🛠️'
  }
]

export const initialSquads: Squad[] = [
  {
    id: 'sq-1',
    name: 'AWS Cloud Operations',
    description: 'Squad operasional AWS multi-customer. Menangani monitoring, asesmen, IaC, dan perbaikan insiden.',
    leader: 'AWS Team Lead',
    leaderAvatar: '👑',
    memberCount: 8,
    members: ['AWS Solution Architect', 'KPC Cloud - Ops', 'TLI - AWS Engineer', 'Outlook Email Agent'],
    createdBy: 'Muhammad Sigit'
  }
]

export const initialSkills: Skill[] = [
  { id: 'sk-1', name: 'aws-architecture-diagram', usedBy: 'AWS Team Lead', addedBy: 'Muhammad Sigit', updatedAt: '5d ago' },
  { id: 'sk-2', name: 'aws-cloudformation', usedBy: 'AWS Solution Architect', addedBy: 'Muhammad Sigit', updatedAt: '5d ago' },
  { id: 'sk-3', name: 'aws-cdk', usedBy: 'AWS Solution Architect', addedBy: 'Muhammad Sigit', updatedAt: '5d ago' },
  { id: 'sk-4', name: 'aws-containers', usedBy: '+7 agents', addedBy: 'Muhammad Sigit', updatedAt: '5d ago' },
  { id: 'sk-5', name: 'aws-serverless', usedBy: '+7 agents', addedBy: 'Muhammad Sigit', updatedAt: '5d ago' },
  { id: 'sk-6', name: 'aws-billing-and-cost-management', usedBy: '+8 agents', addedBy: 'Muhammad Sigit', updatedAt: '5d ago' },
  { id: 'sk-7', name: 'aws-observability', usedBy: '+7 agents', addedBy: 'Muhammad Sigit', updatedAt: '5d ago' },
  { id: 'sk-8', name: 'aws-security', usedBy: '+7 agents', addedBy: 'Muhammad Sigit', updatedAt: '5d ago' },
  { id: 'sk-9', name: 'aws-iam', usedBy: '+7 agents', addedBy: 'Muhammad Sigit', updatedAt: '5d ago' },
  { id: 'sk-10', name: 'aws-database', usedBy: '+7 agents', addedBy: 'Muhammad Sigit', updatedAt: '5d ago' },
  { id: 'sk-11', name: 'aws-storage', usedBy: '+7 agents', addedBy: 'Muhammad Sigit', updatedAt: '5d ago' }
]

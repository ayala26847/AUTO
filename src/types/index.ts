export interface Organization {
  id: string
  name: string
  join_code?: string
  created_at: string
}

export interface User {
  id: string
  org_id: string
  name: string
  email: string
  role: 'Admin' | 'Member'
  internal_rate: number
}

export interface Client {
  id: string
  org_id: string
  name: string
  contact_info: Record<string, string>
  status: string
}

export interface Lead {
  id: string
  org_id: string
  name: string
  status: 'New' | 'Negotiating' | 'Closed' | 'Lost'
  contact_info?: Record<string, string>
  notes?: string
  created_at: string
}

export interface Project {
  id: string
  org_id: string
  client_id: string
  name: string
  status: 'Not Started' | 'Active' | 'In Review' | 'Stuck' | 'On Hold' | 'Completed' | 'Cancelled'
  stage?: 'Not Started' | 'In Progress' | 'Done' | 'Cancelled'
  pricing_type: 'Hourly' | 'Fixed'
  budget: number
  description?: string
  created_at: string
  client?: Client
}

export interface Task {
  id: string
  project_id: string
  org_id: string
  assigned_to: string | null
  title: string
  description?: string
  status: 'Backlog' | 'In Progress' | 'Review' | 'Done'
  due_date: string | null
  estimated_hours: number
  note: string | null
  created_at: string
  assignee?: User
}

export interface SubTask {
  id: string
  org_id: string
  task_id: string
  project_id: string
  title: string
  estimated_hours: number
  assigned_to: string | null
  status: 'Backlog' | 'In Progress' | 'Review' | 'Done'
  created_at: string
  assignee?: User
}

export interface TimeLog {
  id: string
  org_id: string
  project_id: string
  user_id: string
  task_id: string | null
  sub_task_id: string | null
  hours: number
  description: string
  attributed_to: string[]
  created_at: string
  project?: Project
  user?: User
  sub_task?: SubTask
}

export interface ActiveTimer {
  id: string
  user_id: string
  org_id: string
  project_id: string
  task_id: string | null
  sub_task_id: string | null
  start_time: string
  project?: Project
  task?: Task
  sub_task?: SubTask
}

export interface Expense {
  id: string
  org_id: string
  project_id: string
  amount: number
  description: string
  created_at: string
}

export interface ProjectFinancials {
  project: Project
  totalHours: number
  totalExpenses: number
  netProfit: number
  effectiveHourlyRate: number
  partnerBreakdown: PartnerPayout[]
}

export interface PartnerPayout {
  user: User
  hours: number
  payout: number
}

export interface ProjectLink {
  id: string
  org_id: string
  project_id: string
  name: string
  url: string
  category: string
  username: string
  password: string
  notes: string
  created_at: string
}

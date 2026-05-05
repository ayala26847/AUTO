import { supabase } from './supabase'
import type {
  Organization,
  Client,
  Lead,
  Project,
  Task,
  SubTask,
  TimeLog,
  ActiveTimer,
  Expense,
  User,
  ProjectLink,
} from '@/types'

// ── Organizations ─────────────────────────────────────────────────────────────

export async function fetchOrganization(orgId: string): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()
  if (error) throw error
  return data as Organization
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function fetchClients(orgId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('org_id', orgId)
    .order('name')
  if (error) throw error
  return data
}

export async function upsertClient(
  client: Omit<Client, 'id'> & { id?: string },
): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .upsert(client)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export async function fetchLeads(orgId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function upsertLead(
  lead: Omit<Lead, 'id' | 'created_at'> & { id?: string },
): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .upsert(lead)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function fetchProjects(orgId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, client:clients(id, name, status)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Project[]
}

export async function fetchProject(id: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, client:clients(id, name, status)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Project
}

export async function upsertProject(
  project: Omit<Project, 'id' | 'created_at' | 'client'> & { id?: string },
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .upsert(project)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

export async function fetchProjectsProgressSummary(
  orgId: string,
): Promise<Record<string, { estimated: number; logged: number }>> {
  const [{ data: taskData }, { data: logData }] = await Promise.all([
    supabase.from('tasks').select('project_id, estimated_hours').eq('org_id', orgId),
    supabase.from('time_logs').select('project_id, hours').eq('org_id', orgId),
  ])

  const result: Record<string, { estimated: number; logged: number }> = {}

  taskData?.forEach((t) => {
    if (!result[t.project_id]) result[t.project_id] = { estimated: 0, logged: 0 }
    result[t.project_id].estimated += t.estimated_hours || 0
  })

  logData?.forEach((l) => {
    if (!result[l.project_id]) result[l.project_id] = { estimated: 0, logged: 0 }
    result[l.project_id].logged += l.hours || 0
  })

  return result
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function fetchTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assignee:users(id, name, email)')
    .eq('project_id', projectId)
    .order('created_at')
  if (error) throw error
  return data as Task[]
}

export async function upsertTask(
  task: Omit<Task, 'id' | 'created_at' | 'assignee'> & { id?: string },
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .upsert(task)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ── Sub-tasks ─────────────────────────────────────────────────────────────────

export async function fetchProjectSubTasks(projectId: string): Promise<SubTask[]> {
  const { data, error } = await supabase
    .from('sub_tasks')
    .select('*, assignee:users(id, name, email)')
    .eq('project_id', projectId)
    .order('created_at')
  if (error) throw error
  return data as SubTask[]
}

export async function upsertSubTask(
  subTask: Omit<SubTask, 'id' | 'created_at' | 'assignee'> & { id?: string },
): Promise<SubTask> {
  const { data, error } = await supabase
    .from('sub_tasks')
    .upsert(subTask)
    .select('*, assignee:users(id, name, email)')
    .single()
  if (error) throw error
  return data as SubTask
}

export async function deleteSubTask(id: string): Promise<void> {
  const { error } = await supabase.from('sub_tasks').delete().eq('id', id)
  if (error) throw error
}

// ── Time Logs ─────────────────────────────────────────────────────────────────

export async function fetchTimeLogs(orgId: string): Promise<TimeLog[]> {
  const { data, error } = await supabase
    .from('time_logs')
    .select('*, project:projects(id, name, pricing_type, budget), user:users(id, name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as TimeLog[]
}

export async function fetchProjectTimeLogs(projectId: string): Promise<TimeLog[]> {
  const { data, error } = await supabase
    .from('time_logs')
    .select('*, user:users(id, name, internal_rate)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as TimeLog[]
}

export async function insertTimeLog(
  log: Omit<TimeLog, 'id' | 'created_at' | 'project' | 'user' | 'sub_task'>,
): Promise<TimeLog> {
  const { data, error } = await supabase
    .from('time_logs')
    .insert(log)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTimeLog(id: string): Promise<void> {
  const { error } = await supabase.from('time_logs').delete().eq('id', id)
  if (error) throw error
}

// ── Active Timers ─────────────────────────────────────────────────────────────

export async function fetchActiveTimer(userId: string): Promise<ActiveTimer | null> {
  const { data, error } = await supabase
    .from('active_timers')
    .select('*, project:projects(id, name), task:tasks(id, title), sub_task:sub_tasks(id, title)')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as ActiveTimer | null
}

export async function startTimer(
  timer: Omit<ActiveTimer, 'id' | 'project' | 'task' | 'sub_task'>,
): Promise<ActiveTimer> {
  const { data, error } = await supabase
    .from('active_timers')
    .insert(timer)
    .select('*, project:projects(id, name), task:tasks(id, title), sub_task:sub_tasks(id, title)')
    .single()
  if (error) throw error
  return data as ActiveTimer
}

export async function stopTimer(timerId: string): Promise<void> {
  const { error } = await supabase
    .from('active_timers')
    .delete()
    .eq('id', timerId)
  if (error) throw error
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function fetchProjectExpenses(projectId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function insertExpense(
  expense: Omit<Expense, 'id' | 'created_at'>,
): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

// ── Users / Partners ──────────────────────────────────────────────────────────

export async function fetchOrgMembers(orgId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('org_id', orgId)
    .order('name')
  if (error) throw error
  return data
}

// ── Project Links ─────────────────────────────────────────────────────────────

export async function fetchProjectLinks(projectId: string): Promise<ProjectLink[]> {
  const { data, error } = await supabase
    .from('project_links')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function insertProjectLink(
  link: Omit<ProjectLink, 'id' | 'created_at'>,
): Promise<ProjectLink> {
  const { data, error } = await supabase
    .from('project_links')
    .insert(link)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProjectLink(
  link: Partial<ProjectLink> & { id: string },
): Promise<ProjectLink> {
  const { id, ...rest } = link
  const { data, error } = await supabase
    .from('project_links')
    .update(rest)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProjectLink(id: string): Promise<void> {
  const { error } = await supabase.from('project_links').delete().eq('id', id)
  if (error) throw error
}

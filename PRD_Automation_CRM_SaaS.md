# PRD: Global Automation Business Management & CRM (SaaS)

## 1. Project Overview

A multi-tenant SaaS platform designed for automation agencies and freelancers to manage the entire business lifecycle: from lead acquisition to project delivery, real-time time tracking, and advanced profitability analysis.

### Core Objectives

- **Multi-tenancy:** Complete data isolation between different organizations.
- **Profitability Tracking:** Real-time calculation of "Effective Hourly Rate" for fixed-price projects.
- **Partner Revenue Share:** Automated calculation of payouts based on tracked hours.
- **Hybrid Time Tracking:** Real-time timers combined with manual log work.

---

## 2. Architecture & Multi-tenancy

The system follows a **Single-DB Multi-tenant** model.

- **Organization-level isolation:** Every table (except `organizations`) must contain an `organization_id`.
- **Authentication:** Google OAuth.
- **Permissions:**
  - `Admin` — Full access to financial reports and team management.
  - `Member` — Access to assigned projects, tasks, and personal time tracking.

---

## 3. Data Model (Schema)

### Core Tables

#### `organizations`
| Column | Type |
|---|---|
| `id` | UUID PK |
| `name` | TEXT |
| `created_at` | TIMESTAMP |

#### `users`
| Column | Type |
|---|---|
| `id` | UUID PK |
| `org_id` | UUID FK → organizations |
| `name` | TEXT |
| `email` | TEXT |
| `role` | ENUM('Admin', 'Member') |
| `internal_rate` | NUMERIC — cost to business |

#### `clients`
| Column | Type |
|---|---|
| `id` | UUID PK |
| `org_id` | UUID FK |
| `name` | TEXT |
| `contact_info` | JSONB |
| `status` | TEXT |

#### `leads`
| Column | Type |
|---|---|
| `id` | UUID PK |
| `org_id` | UUID FK |
| `name` | TEXT |
| `status` | ENUM('New', 'Negotiating', 'Closed', 'Lost') |

#### `projects`
| Column | Type |
|---|---|
| `id` | UUID PK |
| `org_id` | UUID FK |
| `client_id` | UUID FK → clients |
| `name` | TEXT |
| `status` | TEXT |
| `pricing_type` | ENUM('Hourly', 'Fixed') |
| `budget` | NUMERIC — total budget (Fixed) or hourly rate (Hourly) |

#### `tasks`
| Column | Type |
|---|---|
| `id` | UUID PK |
| `project_id` | UUID FK → projects |
| `assigned_to` | UUID FK → users |
| `title` | TEXT |
| `status` | TEXT — Kanban column |
| `due_date` | DATE |

#### `time_logs`
| Column | Type |
|---|---|
| `id` | UUID PK |
| `org_id` | UUID FK |
| `project_id` | UUID FK |
| `user_id` | UUID FK |
| `task_id` | UUID FK (nullable) |
| `hours` | NUMERIC |
| `description` | TEXT |
| `created_at` | TIMESTAMP |

#### `active_timers`
| Column | Type |
|---|---|
| `id` | UUID PK |
| `user_id` | UUID FK |
| `project_id` | UUID FK |
| `task_id` | UUID FK (nullable) |
| `start_time` | TIMESTAMP — for real-time tracking |

#### `expenses`
| Column | Type |
|---|---|
| `id` | UUID PK |
| `project_id` | UUID FK |
| `amount` | NUMERIC |
| `description` | TEXT |

---

## 4. The Financial Engine (Logic)

### A. Hourly Projects

```
Client Billing    = Total Hours × Project Hourly Rate
Partner Payout    = Individual Hours × Project Hourly Rate
```

### B. Fixed-Price Projects

```
Net Profit               = Total Budget - SUM(Expenses)
Effective Hourly Rate    = Net Profit / Total Hours Logged
Partner Payout           = (Individual Hours / Total Hours) × Net Profit
```

> ⚠️ **Edge Case:** When `Total Hours = 0`, EHR and Partner Payout must return `0` to avoid division-by-zero errors.

---

## 5. Key Modules & Features

### 5.1 Dashboard & Analytics

- **Total Outstanding Revenue** — Potential earnings from active projects.
- **Efficiency Matrix** — Comparison of EHR across different projects.
- **Team Capacity** — Weekly hours logged per partner.

### 5.2 Hybrid Time Tracker

- **Live Timer** — A global floating component. Saves `start_time` to DB to persist across sessions and page refreshes.
- **Manual Log** — Back-entry for forgotten timers or offline work.
- **Auto-Stop** — Safety mechanism to flag and stop timers running longer than **8 hours**.

### 5.3 Project Management

- **Kanban Board** — Drag-and-drop task management across status columns.
- **Gantt View** — Visual timeline for project scheduling and resource allocation.
- **Technical Documentation** — A rich-text / Markdown area per project to store API keys, Webhook URLs, and logic flows.

---

## 6. Technical Stack (Recommended)

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + TypeScript |
| Styling | Tailwind CSS + Shadcn/UI |
| Server State | TanStack Query |
| UI State | Zustand |
| Backend / DB | Supabase (PostgreSQL + RLS) |
| Deployment | Vercel / Netlify |

---

## 7. User Flow

```
1. Onboarding  →  Sign in via Google  →  Create or Join an Organization
2. Setup       →  Add Partners  →  Add Clients  →  Create Project (Hourly or Fixed)
3. Execution   →  Create Tasks  →  Start Live Timer or Log Work manually
4. Review      →  Dashboard  →  Project profitability + Partner payout summaries
```

---

## 8. Implementation Notes for AI Assistant

> Critical rules and constraints to follow during code generation.

### Security — Supabase RLS

- All RLS policies **must** validate `auth.uid()` against the `org_id` of the target record.
- No cross-organization data leakage is acceptable under any condition.

### Real-Time Sync — Active Timers

- The `active_timers` table should be kept in sync via **Supabase Realtime** (WebSockets preferred) or polling as a fallback.
- UI must reflect the live elapsed time without requiring a page refresh.

### Financial Calculations — Edge Cases

- All Fixed-Price payout calculations **must** guard against division by zero:

```typescript
const ehr = totalHours > 0 ? netProfit / totalHours : 0;
const partnerPayout = totalHours > 0 ? (individualHours / totalHours) * netProfit : 0;
```

### Multi-tenancy Enforcement

- Every query that reads or writes data must scope by `org_id`.
- This applies to both client-side queries (TanStack Query) and server-side RLS policies.

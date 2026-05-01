import type { User } from '@/types'

interface Props {
  members: User[]
  selected: string[]
  onChange: (ids: string[]) => void
  label: string
  selectAllLabel: string
}

export function MemberPicker({ members, selected, onChange, label, selectAllLabel }: Props) {
  const allSelected = members.length > 0 && members.every((m) => selected.includes(m.id))

  function toggleAll() {
    onChange(allSelected ? [] : members.map((m) => m.id))
  }

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {selectAllLabel}
        </button>
      </div>
      <div className="rounded-md border bg-background divide-y">
        {members.map((m) => (
          <label
            key={m.id}
            className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={() => toggle(m.id)}
              className="h-3.5 w-3.5 rounded accent-primary"
            />
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {m.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm">{m.name}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

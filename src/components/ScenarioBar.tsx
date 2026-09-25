import { useRef, useState } from 'react'
import { useScenarios } from '../store/scenarios'
import { shortDate } from '../model/format'

type DialogMode = { kind: 'create' } | { kind: 'rename'; id: string; current: string }

function NameDialog({
  mode,
  existingNames,
  onConfirm,
  onCancel,
}: {
  mode: DialogMode
  existingNames: string[]
  onConfirm: (name: string) => void
  onCancel: () => void
}) {
  const initial = mode.kind === 'rename' ? mode.current : ''
  const [value, setValue] = useState(initial)
  const trimmed = value.trim()

  const isDuplicate = existingNames.some(
    (n) =>
      n.toLowerCase() === trimmed.toLowerCase() &&
      n.toLowerCase() !== initial.toLowerCase(),
  )
  const isEmpty = trimmed.length === 0
  const error = isEmpty
    ? 'Name cannot be empty.'
    : isDuplicate
      ? 'A scenario with that name already exists.'
      : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (error) return
    onConfirm(trimmed)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel} onKeyDown={handleKey}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{mode.kind === 'create' ? 'New scenario' : 'Rename scenario'}</h3>
        <form onSubmit={handleSubmit}>
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Scenario name"
          />
          {error && trimmed.length > 0 && (
            <p className="dialog-error">{error}</p>
          )}
          <div className="btnrow" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={!!error}>
              {mode.kind === 'create' ? 'Create' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ScenarioBar() {
  const { scenarios, activeId, setActive, create, rename, duplicate, remove, loadExample } =
    useScenarios()
  const exportJson = useScenarios((s) => s.exportJson)
  const importJson = useScenarios((s) => s.importJson)
  const markExported = useScenarios((s) => s.markExported)
  const lastExportedAt = useScenarios((s) => s.lastExportedAt)
  const fileRef = useRef<HTMLInputElement>(null)

  const [dialog, setDialog] = useState<DialogMode | null>(null)

  const existingNames = scenarios.map((s) => s.name)

  const doExport = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `project-w-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    markExported()
  }

  const doImport = async (file: File) => {
    const text = await file.text()
    const res = importJson(text, 'merge')
    alert(res.message)
  }

  const handleDialogConfirm = (name: string) => {
    if (!dialog) return
    if (dialog.kind === 'create') {
      create(name)
    } else {
      rename(dialog.id, name)
    }
    setDialog(null)
  }

  const activeScenario = scenarios.find((s) => s.id === activeId)

  const staleDays = lastExportedAt
    ? Math.floor((Date.now() - lastExportedAt) / 86400000)
    : null

  return (
    <>
      {dialog && (
        <NameDialog
          mode={dialog}
          existingNames={existingNames}
          onConfirm={handleDialogConfirm}
          onCancel={() => setDialog(null)}
        />
      )}

      <div className="scenariobar">
        <select
          value={activeId ?? ''}
          onChange={(e) => setActive(e.target.value)}
          aria-label="Active scenario"
        >
          {scenarios.length === 0 && <option value="">No scenarios yet</option>}
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button onClick={() => setDialog({ kind: 'create' })}>+ New</button>
        <button
          onClick={() =>
            activeId &&
            activeScenario &&
            setDialog({ kind: 'rename', id: activeId, current: activeScenario.name })
          }
          disabled={!activeId}
        >
          Rename
        </button>
        <button onClick={() => activeId && duplicate(activeId)} disabled={!activeId}>
          Duplicate
        </button>
        <button onClick={() => loadExample()} title="Adds the illustrative 100-point model">
          Load example
        </button>

        <div className="spacer" />

        <span className="small muted">
          {lastExportedAt
            ? `Backed up ${shortDate(lastExportedAt)}${staleDays !== null && staleDays > 7 ? ' — a while ago' : ''}`
            : 'Never backed up'}
        </span>
        <button onClick={doExport} disabled={scenarios.length === 0}>
          Export
        </button>
        <button onClick={() => fileRef.current?.click()}>Import</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void doImport(f)
            e.target.value = ''
          }}
        />
        <button
          className="ghost danger"
          disabled={!activeId}
          onClick={() => {
            if (activeId && confirm('Delete this scenario? This cannot be undone.')) remove(activeId)
          }}
        >
          Delete
        </button>
      </div>
    </>
  )
}

import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { ConfirmDialog } from './ConfirmDialog'
import { ExportModal } from './ExportModal'
import { buildJsonBlob, downloadBlob } from '../utils/exportFile'

const WELCOME_KEY = 'seatinghelper_welcomed'

const TUTORIAL_STEPS = [
  {
    icon: '🪑',
    title: 'Welcome to SeatingHelper',
    body: (
      <div className="flex flex-col gap-3 text-sm text-stone-600">
        <p>SeatingHelper helps you build a seating chart step by step:</p>
        <ol className="flex flex-col gap-2 pl-5 list-decimal marker:text-violet-400 marker:font-semibold">
          <li>Add your guests (import a list or type them in)</li>
          <li>Set up tables on the floor plan</li>
          <li>Drag guests to seats — or let SeatingHelper do it automatically</li>
          <li>Review and fix any conflicts</li>
        </ol>
        <p className="text-xs text-stone-400 mt-1">This tour takes about 1 minute. You can revisit it anytime from the <strong>?</strong> button.</p>
      </div>
    ),
  },
  {
    icon: '👥',
    title: 'Add your guests',
    body: (
      <div className="flex flex-col gap-3 text-sm text-stone-600">
        <p>Click <strong className="text-stone-800">+ Add Multiple Guests</strong> in the left panel to paste names or upload a <code className="bg-stone-100 px-1 rounded text-xs">.txt</code>, <code className="bg-stone-100 px-1 rounded text-xs">.csv</code>, or <code className="bg-stone-100 px-1 rounded text-xs">.json</code> file.</p>
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 font-mono text-xs text-stone-500 leading-relaxed">
          Alice Smith<br />
          Bob Jones &amp; Carol Jones<br />
          David Brown
        </div>
        <p>Two names separated by <strong>&amp;</strong>, <strong>+</strong>, or <strong>and</strong> are automatically linked as plus-ones.</p>
        <p>Or use <strong className="text-stone-800">+ Add Guest</strong> in the left panel to add someone manually.</p>
      </div>
    ),
  },
  {
    icon: '🏷️',
    title: 'Tags and relationships',
    body: (
      <div className="flex flex-col gap-3 text-sm text-stone-600">
        <p>Click any guest to open their editor. There you can:</p>
        <ul className="flex flex-col gap-1.5 pl-5 list-disc marker:text-violet-400">
          <li>Add <strong>tags</strong> like <em>Family</em>, <em>Work</em>, or <em>College</em> to group guests</li>
          <li>Link guests as <strong>together</strong> (prefer same table) or <strong>apart</strong> (never same table)</li>
          <li>Link guests as <strong>plus-ones</strong> — they'll always be seated together</li>
        </ul>
        <p className="text-xs text-stone-400">Tip: drag one guest row onto another in the list to instantly create a plus-one link.</p>
      </div>
    ),
  },
  {
    icon: '🍽️',
    title: 'Set up tables',
    body: (
      <div className="flex flex-col gap-3 text-sm text-stone-600">
        <p>In the <strong>Floor Plan</strong> tab, click <strong className="text-stone-800">+ Add Table</strong> to place tables. You can:</p>
        <ul className="flex flex-col gap-1.5 pl-5 list-disc marker:text-violet-400">
          <li>Drag tables to arrange the room</li>
          <li>Double-click a table's name or capacity to edit inline</li>
          <li>Toggle the shape between round and rectangular</li>
        </ul>
        <p>To seat a guest, drag their name from the left panel and drop it onto any table. Their plus-one is seated automatically too.</p>
      </div>
    ),
  },
  {
    icon: '✨',
    title: 'Auto-assign and fix conflicts',
    body: (
      <div className="flex flex-col gap-3 text-sm text-stone-600">
        <p>Click <strong className="text-stone-800">✨ Suggest Seating</strong> to fill remaining seats automatically. SeatingHelper respects all tags and relationship rules.</p>
        <p>If any guests end up in the wrong spot, a red <span className="text-red-400 font-bold">⚠</span> appears on the table. Click <strong className="text-stone-800">Fix Conflicts</strong> to resolve them.</p>
        <p className="text-xs text-stone-400">Your chart saves automatically. Use <strong>Export</strong> to back it up and <strong>Import</strong> to restore it later.</p>
      </div>
    ),
  },
]

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-stone-200 dark:border-stone-700 last:border-b-0 pb-2 last:pb-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left py-1 group"
      >
        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">{title}</span>
        <span className="text-stone-400 dark:text-stone-500 text-xs transition-transform duration-150 group-hover:text-stone-600 dark:group-hover:text-stone-300">{open ? '▲' : '▼'}</span>
      </button>
      {open && <p className="leading-relaxed mt-1">{children}</p>}
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-mono">{children}</span>
}

export function TopBar() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(WELCOME_KEY))
  const [tutorialStep, setTutorialStep] = useState(0)
  const { guests, relationships, tables, resetChart, undo, redo, _history, _future, darkMode, toggleDarkMode } = useStore()

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_KEY, '1')
    setShowWelcome(false)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const [showExport, setShowExport] = useState(false)

  return (
    <>
      <header className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 shrink-0">
        <span className="text-lg font-bold text-violet-600 dark:text-violet-400">🪑 SeatingHelper</span>
        {guests.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((guests.filter((g) => g.tableId !== null).length / guests.length) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
              {guests.filter((g) => g.tableId !== null).length}/{guests.length} seated
            </span>
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={undo}
            disabled={_history.length === 0}
            title="Undo (⌘Z)"
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button
            onClick={redo}
            disabled={_future.length === 0}
            title="Redo (⌘⇧Z)"
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Redo
          </button>
          <button onClick={() => setShowExport(true)} className="btn-secondary">Export</button>
          <button onClick={() => setShowConfirm(true)} className="btn-secondary">New Chart</button>
          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600 text-sm"
          >
            {darkMode ? '☀' : '🌙'}
          </button>
          <button
            onClick={() => setShowHelp(true)}
            title="How to use SeatingHelper"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600 hover:text-stone-900 dark:hover:text-white text-sm font-bold"
          >
            ?
          </button>
        </div>
      </header>
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {showConfirm && (
        <ConfirmDialog
          message="Start a new chart? All current data will be cleared."
          onConfirm={() => { resetChart(); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
          onConfirmExport={() => { downloadBlob(buildJsonBlob({ guests, relationships, tables }), 'seating-chart.json'); resetChart(); setShowConfirm(false) }}
        />
      )}
      {showWelcome && (() => {
        const step = TUTORIAL_STEPS[tutorialStep]
        const isLast = tutorialStep === TUTORIAL_STEPS.length - 1
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0 mt-0.5">{step.icon}</span>
                <div>
                  <h2 className="text-lg font-bold text-stone-900 leading-tight">{step.title}</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Step {tutorialStep + 1} of {TUTORIAL_STEPS.length}</p>
                </div>
              </div>
              <div className="min-h-[140px]">{step.body}</div>
              <div className="flex items-center gap-2 pt-1">
                <div className="flex gap-1.5 flex-1">
                  {TUTORIAL_STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTutorialStep(i)}
                      className={`h-1.5 rounded-full transition-all ${i === tutorialStep ? 'bg-violet-500 w-4' : 'bg-stone-200 w-1.5 hover:bg-stone-300'}`}
                    />
                  ))}
                </div>
                {tutorialStep > 0 && (
                  <button onClick={() => setTutorialStep((s) => s - 1)} className="btn-ghost text-sm px-3 py-1.5">
                    Back
                  </button>
                )}
                {!isLast ? (
                  <button onClick={() => setTutorialStep((s) => s + 1)} className="btn-primary text-sm px-4 py-1.5">
                    Next
                  </button>
                ) : (
                  <button onClick={dismissWelcome} className="btn-primary text-sm px-4 py-1.5">
                    Get started
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}
      {showHelp && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHelp(false)}>
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto animate-modal-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-violet-600 dark:text-violet-400">How to use SeatingHelper</h2>
              <button onClick={() => setShowHelp(false)} className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 text-xl leading-none">✕</button>
            </div>
            <div className="flex flex-col gap-1 text-sm text-stone-600 dark:text-stone-300">
              <Section title="Guests" defaultOpen>
                Add guests with <Kbd>+ Add Guest</Kbd>. Click a guest to open their editor, where you can set their name, tags, notes, and relationships. Drag a guest row onto a table to seat them.
              </Section>
              <Section title="Relationships">
                In the guest editor, link two guests as <strong className="text-stone-900 dark:text-stone-100">together</strong> (prefer same table), <strong className="text-stone-900 dark:text-stone-100">apart</strong> (never same table), or <strong className="text-stone-900 dark:text-stone-100">plus-one</strong> (must be together). Drag one guest row onto another to quickly create a plus-one link.
              </Section>
              <Section title="Floor Plan">
                Add tables with <Kbd>+ Add Table</Kbd>. Drag tables to reposition them. Double-click a table's name or capacity to edit inline. Click the shape icon to toggle round/rectangular. Use the minimap in the bottom-right corner to navigate a large floor.
              </Section>
              <Section title="Conflict warnings">
                A red <span className="text-red-400">⚠</span> on a table means guests who should be apart are seated together, or plus-ones are split across tables. Hover the icon for details. A pink <span className="text-pink-400">⚠</span> on a guest label means their plus-one is at a different table.
              </Section>
              <Section title="Suggest Seating">
                Click <Kbd>✨ Suggest Seating</Kbd> to auto-assign unassigned guests while respecting all relationships. Review each move individually or apply them all at once.
              </Section>
              <Section title="Multi-select">
                Click <Kbd>Select</Kbd> in the guest panel to enter multi-select mode. Use checkboxes (shift-click for ranges) to bulk unassign or delete guests.
              </Section>
              <Section title="Undo / Import / Export">
                <Kbd>Undo</Kbd> / <Kbd>Redo</Kbd> reverts or replays actions (also <Kbd>⌘Z</Kbd> / <Kbd>⌘⇧Z</Kbd>). <Kbd>Export</Kbd> saves your chart as CSV or JSON. <Kbd>+ Add Multiple Guests</Kbd> in the guest panel loads a saved chart or a CSV/TXT guest list. Your chart auto-saves to your browser.
              </Section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

import { useState } from 'react'
import { FloorPlan } from './FloorPlan'
import { TableList } from './TableList'
import { SuggestModal } from '../SuggestModal'

export function ChartPanel() {
  const [tab, setTab] = useState<'floorplan' | 'tablelist'>('floorplan')
  const [showSuggest, setShowSuggest] = useState(false)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-200 bg-white shrink-0">
        <button
          onClick={() => setTab('floorplan')}
          className={`btn ${tab === 'floorplan' ? 'bg-violet-700 text-white' : 'text-stone-500 hover:text-stone-800'}`}
        >
          Floor Plan
        </button>
        <button
          onClick={() => setTab('tablelist')}
          className={`btn ${tab === 'tablelist' ? 'bg-violet-700 text-white' : 'text-stone-500 hover:text-stone-800'}`}
        >
          Table List
        </button>
        <button onClick={() => setShowSuggest(true)} className="btn-primary ml-auto">
          ✨ Suggest Seating
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'floorplan' ? <FloorPlan /> : <TableList />}
      </div>
      {showSuggest && <SuggestModal onClose={() => setShowSuggest(false)} />}
    </div>
  )
}

import { useState } from 'react'
import { FloorPlan } from './FloorPlan'
import { TableList } from './TableList'
import { SuggestModal } from '../SuggestModal'

export function ChartPanel() {
  const [tab, setTab] = useState<'floorplan' | 'tablelist'>('floorplan')
  const [showSuggest, setShowSuggest] = useState(false)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700 bg-gray-900 shrink-0">
        <button
          onClick={() => setTab('floorplan')}
          className={`px-3 py-1 text-sm rounded ${tab === 'floorplan' ? 'bg-violet-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Floor Plan
        </button>
        <button
          onClick={() => setTab('tablelist')}
          className={`px-3 py-1 text-sm rounded ${tab === 'tablelist' ? 'bg-violet-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Table List
        </button>
        <button
          onClick={() => setShowSuggest(true)}
          className="ml-auto px-3 py-1.5 text-sm bg-violet-600 text-white rounded hover:bg-violet-700"
        >
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

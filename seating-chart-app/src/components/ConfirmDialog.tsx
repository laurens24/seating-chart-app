interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
  onConfirmExport?: () => void
}

export function ConfirmDialog({ message, onConfirm, onCancel, onConfirmExport }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-sm w-full">
        <p className="text-stone-900 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          {onConfirmExport && (
            <button onClick={onConfirmExport} className="btn-secondary">
              Export &amp; Confirm
            </button>
          )}
          <button onClick={onConfirm} className="btn-danger">
            Confirm without saving
          </button>
        </div>
      </div>
    </div>
  )
}

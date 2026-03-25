export function ErrorBanner({
  message,
  onDismiss,
  onRetry,
}: {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-start gap-3"
    >
      <span className="text-error text-sm flex-1">{message}</span>
      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-error hover:text-foreground text-xs font-medium underline"
          >
            Retry
          </button>
        )}
        <button
          onClick={onDismiss}
          className="text-muted hover:text-foreground text-xs"
          aria-label="Dismiss error"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

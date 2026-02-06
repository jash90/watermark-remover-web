<script lang="ts">
  interface Props {
    message: string;
    onDismiss?: () => void;
  }

  let { message, onDismiss }: Props = $props();

  // Detect if this is a content policy error
  const isPolicyError = $derived(
    message.toLowerCase().includes('policy') ||
    message.toLowerCase().includes('declined') ||
    message.toLowerCase().includes('content policy')
  );

  // Detect if this is a retry/temporary error
  const isRetryableError = $derived(
    message.toLowerCase().includes('try again') ||
    message.toLowerCase().includes('experiencing issues')
  );
</script>

<div class="error-message" class:policy-error={isPolicyError} class:retryable-error={isRetryableError} role="alert">
  {#if isPolicyError}
    <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  {:else if isRetryableError}
    <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  {:else}
    <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  {/if}
  <div class="error-content">
    {#if isPolicyError}
      <strong class="error-title">Content Policy</strong>
    {:else if isRetryableError}
      <strong class="error-title">Temporary Issue</strong>
    {/if}
    <p>{message}</p>
  </div>
  {#if onDismiss}
    <button class="dismiss-btn" onclick={onDismiss} aria-label="Dismiss error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  {/if}
</div>

<style>
  .error-message {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--color-error, #ef4444);
    border-radius: 8px;
    color: var(--color-error, #ef4444);
  }

  .error-message.policy-error {
    background: rgba(245, 158, 11, 0.1);
    border-color: #f59e0b;
    color: #d97706;
  }

  .error-message.retryable-error {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    color: #2563eb;
  }

  .error-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-top: 2px;
  }

  .error-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .error-title {
    font-size: 0.875rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .dismiss-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .dismiss-btn:hover {
    opacity: 1;
  }

  .dismiss-btn svg {
    width: 16px;
    height: 16px;
  }
</style>

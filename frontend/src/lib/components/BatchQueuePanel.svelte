<script lang="ts">
  import { appState } from '$lib/stores/app.svelte';
  import { api } from '$lib/api/client';

  const statusIcons: Record<string, string> = {
    pending: '⏳',
    processing: '🔄',
    completed: '✅',
    failed: '❌',
  };
</script>

<div class="batch-queue">
  <h3>Batch Queue ({appState.batchFiles.length} files)</h3>

  {#if appState.batchProgress}
    <div class="progress-bar">
      <div
        class="progress-fill"
        style="width: {(appState.batchProgress.currentIndex / appState.batchProgress.totalFiles) * 100}%"
      ></div>
    </div>
    <p class="progress-text">
      Processing {appState.batchProgress.currentIndex + 1} of {appState.batchProgress.totalFiles}: {appState.batchProgress.currentFilename}
    </p>
  {/if}

  <ul class="file-list">
    {#each appState.batchFiles as file (file.id)}
      <li class="file-item" class:failed={file.status === 'failed'}>
        <span class="status-icon">{statusIcons[file.status]}</span>
        <span class="filename">{file.filename}</span>
        {#if file.status === 'completed' && file.result}
          <a
            href={api.getDownloadUrl(file.result.processedUrl)}
            download={file.filename.replace(/\.[^.]+$/, '_processed.png')}
            class="download-link"
          >
            Download
          </a>
        {/if}
        {#if file.error}
          <span class="error-text" title={file.error}>Error</span>
        {/if}
      </li>
    {/each}
  </ul>

  {#if appState.batchCompleted}
    <div class="batch-summary">
      <p>
        Completed: <strong class="success">{appState.batchSuccessCount}</strong> |
        Failed: <strong class="failed">{appState.batchFailedCount}</strong>
      </p>
    </div>
  {/if}
</div>

<style>
  .batch-queue {
    background: var(--color-surface, #1a2332);
    border-radius: 8px;
    padding: 1rem;
  }

  h3 {
    margin: 0 0 1rem;
    font-size: 1rem;
    color: var(--color-text, #e2e8f0);
  }

  .progress-bar {
    height: 6px;
    background: var(--color-border, #3a4a5c);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-primary, #6366f1);
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.75rem;
    color: var(--color-text-muted, #8892a0);
    margin: 0 0 1rem;
  }

  .file-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 200px;
    overflow-y: auto;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .file-item:hover {
    background: var(--color-surface-hover, #232d3f);
  }

  .file-item.failed {
    opacity: 0.7;
  }

  .status-icon {
    flex-shrink: 0;
  }

  .filename {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text, #e2e8f0);
  }

  .download-link {
    font-size: 0.75rem;
    color: var(--color-primary, #6366f1);
    text-decoration: none;
  }

  .download-link:hover {
    text-decoration: underline;
  }

  .error-text {
    font-size: 0.75rem;
    color: var(--color-error, #ef4444);
    cursor: help;
  }

  .batch-summary {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border, #3a4a5c);
    text-align: center;
  }

  .batch-summary p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-muted, #8892a0);
  }

  .success {
    color: var(--color-success, #22c55e);
  }

  .failed {
    color: var(--color-error, #ef4444);
  }
</style>

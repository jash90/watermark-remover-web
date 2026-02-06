<script lang="ts">
  import { api } from '$lib/api/client';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let apiKey = $state('');
  let isTesting = $state(false);
  let testResult = $state<'success' | 'error' | null>(null);
  let testMessage = $state('');

  // Load saved API key on mount
  $effect(() => {
    if (isOpen) {
      apiKey = localStorage.getItem('gemini_api_key') || '';
      testResult = null;
      testMessage = '';
    }
  });

  async function handleTestConnection() {
    if (!apiKey.trim()) {
      testResult = 'error';
      testMessage = 'Please enter an API key';
      return;
    }

    isTesting = true;
    testResult = null;

    try {
      const connected = await api.testConnectionWithKey(apiKey);
      if (connected) {
        testResult = 'success';
        testMessage = 'Connection successful!';
      } else {
        testResult = 'error';
        testMessage = 'Connection failed. Check your API key.';
      }
    } catch (error) {
      testResult = 'error';
      testMessage = error instanceof Error ? error.message : 'Connection failed';
    } finally {
      isTesting = false;
    }
  }

  function handleSave() {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      api.setApiKey(apiKey.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
      api.setApiKey(null);
    }
    onClose();
  }

  function handleClear() {
    apiKey = '';
    localStorage.removeItem('gemini_api_key');
    api.setApiKey(null);
    testResult = null;
    testMessage = '';
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <div class="modal">
      <div class="modal-header">
        <h2 id="settings-title">Settings</h2>
        <button class="close-btn" onclick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="api-key">Google Gemini API Key</label>
          <p class="help-text">
            Get your free API key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>
          </p>
          <div class="input-row">
            <input
              id="api-key"
              type="password"
              bind:value={apiKey}
              placeholder="Enter your Gemini API key"
              autocomplete="off"
            />
            <button
              class="btn btn-secondary"
              onclick={handleTestConnection}
              disabled={isTesting || !apiKey.trim()}
            >
              {isTesting ? 'Testing...' : 'Test'}
            </button>
          </div>

          {#if testResult}
            <div class="test-result" class:success={testResult === 'success'} class:error={testResult === 'error'}>
              {#if testResult === 'success'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              {:else}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              {/if}
              {testMessage}
            </div>
          {/if}
        </div>

        <div class="info-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <strong>Privacy:</strong> Your API key is stored locally in your browser and sent directly to Google's API. It is never stored on our servers.
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={handleClear}>
          Clear Key
        </button>
        <div class="spacer"></div>
        <button class="btn btn-secondary" onclick={onClose}>
          Cancel
        </button>
        <button class="btn btn-primary" onclick={handleSave}>
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal {
    background: var(--color-surface, #1a2332);
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--color-border, #3a4a5c);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--color-text, #e2e8f0);
  }

  .close-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--color-text-muted, #8892a0);
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: var(--color-text, #e2e8f0);
  }

  .close-btn svg {
    width: 20px;
    height: 20px;
  }

  .modal-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 500;
    color: var(--color-text, #e2e8f0);
  }

  .help-text {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-muted, #8892a0);
  }

  .help-text a {
    color: var(--color-primary, #6366f1);
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
  }

  .input-row input {
    flex: 1;
    padding: 0.75rem 1rem;
    background: var(--color-bg, #0f1419);
    border: 1px solid var(--color-border, #3a4a5c);
    border-radius: 8px;
    color: var(--color-text, #e2e8f0);
    font-size: 0.875rem;
  }

  .input-row input:focus {
    outline: none;
    border-color: var(--color-primary, #6366f1);
  }

  .input-row input::placeholder {
    color: var(--color-text-muted, #8892a0);
  }

  .test-result {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .test-result svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .test-result.success {
    background: rgba(34, 197, 94, 0.1);
    color: var(--color-success, #22c55e);
  }

  .test-result.error {
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-error, #ef4444);
  }

  .info-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 8px;
    font-size: 0.875rem;
    color: var(--color-text-muted, #8892a0);
  }

  .info-box svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: var(--color-primary, #6366f1);
  }

  .info-box strong {
    color: var(--color-text, #e2e8f0);
  }

  .modal-footer {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--color-border, #3a4a5c);
  }

  .spacer {
    flex: 1;
  }

  .btn {
    padding: 0.625rem 1.25rem;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-primary, #6366f1);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover, #5558e3);
  }

  .btn-secondary {
    background: var(--color-surface-hover, #232d3f);
    color: var(--color-text, #e2e8f0);
    border: 1px solid var(--color-border, #3a4a5c);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-border, #3a4a5c);
  }
</style>

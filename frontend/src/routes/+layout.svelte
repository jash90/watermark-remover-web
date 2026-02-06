<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/app.svelte';
  import { api } from '$lib/api/client';
  import SettingsModal from '$lib/components/SettingsModal.svelte';

  let { children } = $props();
  let showSettings = $state(false);
  let hasApiKey = $state(false);

  onMount(async () => {
    // Check if API key is configured in localStorage
    hasApiKey = !!api.getApiKey();

    // Check API connection on mount
    const connected = await api.healthCheck();
    appState.setApiConnected(connected);

    // If we have an API key, test the Gemini connection
    if (hasApiKey) {
      const geminiConnected = await api.testConnection();
      if (!geminiConnected) {
        hasApiKey = false;
      }
    }
  });

  function handleSettingsClose() {
    showSettings = false;
    // Refresh API key status
    hasApiKey = !!api.getApiKey();
  }
</script>

<svelte:head>
  <title>Watermark Remover - AI-Powered Image Processing</title>
  <meta name="description" content="Remove watermarks from images using Google Gemini AI" />
</svelte:head>

<div class="app-layout">
  <header class="app-header">
    <div class="container header-content">
      <h1 class="logo">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21,15 16,10 5,21" />
        </svg>
        Watermark Remover
      </h1>

      <div class="header-right">
        <div class="status-indicator" class:connected={appState.apiConnected === true && hasApiKey} class:disconnected={appState.apiConnected === false || !hasApiKey}>
          <span class="status-dot"></span>
          {#if appState.apiConnected === null}
            Checking...
          {:else if !appState.apiConnected}
            API Offline
          {:else if !hasApiKey}
            No API Key
          {:else}
            Ready
          {/if}
        </div>

        <button class="settings-btn" onclick={() => showSettings = true} aria-label="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  </header>

  <main class="app-main">
    <div class="container">
      {#if !hasApiKey && appState.apiConnected}
        <div class="api-key-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            Please configure your Gemini API key in
            <button class="link-btn" onclick={() => showSettings = true}>Settings</button>
            to start removing watermarks.
          </span>
        </div>
      {/if}
      {@render children()}
    </div>
  </main>

  <footer class="app-footer">
    <div class="container">
      <p>Powered by Google Gemini AI | Built with Svelte 5 + NestJS</p>
    </div>
  </footer>
</div>

<SettingsModal isOpen={showSettings} onClose={handleSettingsClose} />

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .app-header {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    padding: 1rem 0;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .logo-icon {
    width: 28px;
    height: 28px;
    color: var(--color-primary);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-muted);
  }

  .status-indicator.connected .status-dot {
    background: var(--color-success);
  }

  .status-indicator.disconnected .status-dot {
    background: var(--color-warning);
  }

  .settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: all 0.2s;
  }

  .settings-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
    border-color: var(--color-primary);
  }

  .settings-btn svg {
    width: 18px;
    height: 18px;
  }

  .app-main {
    flex: 1;
    padding: 2rem 0;
  }

  .api-key-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid var(--color-warning);
    border-radius: 8px;
    margin-bottom: 1.5rem;
    color: var(--color-warning);
    font-size: 0.875rem;
  }

  .api-key-banner svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .link-btn {
    background: none;
    border: none;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
    font-size: inherit;
    padding: 0;
  }

  .link-btn:hover {
    color: var(--color-text);
  }

  .app-footer {
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    padding: 1rem 0;
    text-align: center;
  }

  .app-footer p {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
</style>

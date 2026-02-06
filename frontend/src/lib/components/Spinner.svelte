<script lang="ts">
  interface Props {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
  }

  let { size = 'md', message }: Props = $props();
</script>

<div class="spinner-container" class:sm={size === 'sm'} class:md={size === 'md'} class:lg={size === 'lg'}>
  <div class="spinner"></div>
  {#if message}
    <p class="message">{message}</p>
  {/if}
</div>

<style>
  .spinner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    border-radius: 50%;
    border-style: solid;
    border-color: var(--color-primary, #6366f1);
    border-top-color: transparent;
    animation: spin 1s linear infinite;
  }

  .sm .spinner {
    width: 20px;
    height: 20px;
    border-width: 2px;
  }

  .md .spinner {
    width: 40px;
    height: 40px;
    border-width: 3px;
  }

  .lg .spinner {
    width: 60px;
    height: 60px;
    border-width: 4px;
  }

  .message {
    margin: 0;
    color: var(--color-text-muted, #8892a0);
    font-size: 0.875rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>

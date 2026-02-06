<script lang="ts">
  import { appState } from '$lib/stores/app.svelte';

  let isDragging = $state(false);
  let fileInput: HTMLInputElement;

  const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    const files = e.dataTransfer?.files;
    if (files) {
      processFiles(files);
    }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      processFiles(target.files);
    }
  }

  function processFiles(fileList: FileList) {
    const validFiles: File[] = [];

    for (const file of fileList) {
      if (acceptedTypes.includes(file.type)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      appState.setError('Please select valid image files (PNG, JPEG, WebP, GIF)');
      return;
    }

    appState.setFiles(validFiles);
  }

  function openFilePicker() {
    fileInput?.click();
  }
</script>

<div
  class="drop-zone"
  class:dragging={isDragging}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onclick={openFilePicker}
  onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
  role="button"
  tabindex="0"
>
  <input
    bind:this={fileInput}
    type="file"
    accept="image/png,image/jpeg,image/webp,image/gif"
    multiple
    onchange={handleFileSelect}
    hidden
  />

  <div class="drop-content">
    <svg
      class="upload-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17,8 12,3 7,8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
    <h2>Drop images here</h2>
    <p>or click to select files</p>
    <span class="formats">Supports PNG, JPEG, WebP, GIF (max 20MB)</span>
    <span class="batch-hint">Select multiple files for batch processing</span>
  </div>
</div>

<style>
  .drop-zone {
    border: 2px dashed var(--color-border, #3a4a5c);
    border-radius: 12px;
    padding: 3rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--color-surface, #1a2332);
  }

  .drop-zone:hover,
  .drop-zone.dragging {
    border-color: var(--color-primary, #6366f1);
    background: var(--color-surface-hover, #232d3f);
  }

  .drop-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-muted, #8892a0);
  }

  .upload-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
    color: var(--color-primary, #6366f1);
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--color-text, #e2e8f0);
  }

  p {
    margin: 0;
    font-size: 0.875rem;
  }

  .formats {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .batch-hint {
    font-size: 0.75rem;
    color: var(--color-primary, #6366f1);
    margin-top: 0.5rem;
  }
</style>

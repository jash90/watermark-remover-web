<script lang="ts">
  import { api } from '$lib/api/client';
  import type { ProcessResult } from '$lib/types/watermark';

  interface Props {
    originalUrl: string;
    result: ProcessResult;
  }

  let { originalUrl, result }: Props = $props();

  // Slider state
  let sliderPosition = $state(50);
  let container: HTMLDivElement;

  // View mode and zoom state
  type ViewMode = 'slider' | 'side-by-side' | 'overlay';
  let viewMode = $state<ViewMode>('slider');
  let zoomLevel = $state(1);
  let overlayOpacity = $state(0.5);
  let isPanning = $state(false);
  let panPosition = $state({ x: 0, y: 0 });
  let panStart = $state({ x: 0, y: 0 });

  function handleMouseMove(e: MouseEvent) {
    if (!container) return;

    if (isPanning && zoomLevel > 1) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      panPosition = { x: panPosition.x + dx, y: panPosition.y + dy };
      panStart = { x: e.clientX, y: e.clientY };
      return;
    }

    if (viewMode === 'slider') {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      sliderPosition = Math.max(0, Math.min(100, (x / rect.width) * 100));
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!container) return;
    const touch = e.touches[0];

    if (isPanning && zoomLevel > 1) {
      const dx = touch.clientX - panStart.x;
      const dy = touch.clientY - panStart.y;
      panPosition = { x: panPosition.x + dx, y: panPosition.y + dy };
      panStart = { x: touch.clientX, y: touch.clientY };
      return;
    }

    if (viewMode === 'slider') {
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      sliderPosition = Math.max(0, Math.min(100, (x / rect.width) * 100));
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (zoomLevel > 1) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
    }
  }

  function handleMouseUp() {
    isPanning = false;
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    zoomLevel = Math.max(1, Math.min(4, zoomLevel + delta));
    if (zoomLevel === 1) {
      panPosition = { x: 0, y: 0 };
    }
  }

  function zoomIn() {
    zoomLevel = Math.min(4, zoomLevel + 0.5);
  }

  function zoomOut() {
    zoomLevel = Math.max(1, zoomLevel - 0.5);
    if (zoomLevel === 1) {
      panPosition = { x: 0, y: 0 };
    }
  }

  function resetZoom() {
    zoomLevel = 1;
    panPosition = { x: 0, y: 0 };
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function calculateChange(original: number, processed: number): string {
    const change = ((processed - original) / original) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  const processedPreviewUrl = $derived(api.getPreviewUrl(result.previewUrl));
  const downloadUrl = $derived(api.getDownloadUrl(result.processedUrl));
  const sizeChange = $derived(calculateChange(result.originalSize, result.processedSize));
  const isSmaller = $derived(result.processedSize < result.originalSize);
</script>

<div class="preview-container">
  <!-- View mode toggle -->
  <div class="view-controls">
    <div class="view-toggle">
      <button class:active={viewMode === 'slider'} onclick={() => viewMode = 'slider'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="12" y1="3" x2="12" y2="21" />
        </svg>
        Slider
      </button>
      <button class:active={viewMode === 'side-by-side'} onclick={() => viewMode = 'side-by-side'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="8" height="18" rx="1" />
          <rect x="13" y="3" width="8" height="18" rx="1" />
        </svg>
        Side by Side
      </button>
      <button class:active={viewMode === 'overlay'} onclick={() => viewMode = 'overlay'}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" opacity="0.3" />
        </svg>
        Overlay
      </button>
    </div>

    <div class="zoom-controls">
      <button onclick={zoomOut} disabled={zoomLevel <= 1} title="Zoom out">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>
      <span class="zoom-level">{Math.round(zoomLevel * 100)}%</span>
      <button onclick={zoomIn} disabled={zoomLevel >= 4} title="Zoom in">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
          <line x1="11" y1="8" x2="11" y2="14" />
        </svg>
      </button>
      {#if zoomLevel > 1}
        <button onclick={resetZoom} title="Reset zoom">Reset</button>
      {/if}
    </div>
  </div>

  <!-- Comparison views -->
  {#if viewMode === 'slider'}
    <div
      class="comparison-slider"
      class:zoomed={zoomLevel > 1}
      bind:this={container}
      onmousemove={handleMouseMove}
      ontouchmove={handleTouchMove}
      onmousedown={handleMouseDown}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
      onwheel={handleWheel}
      role="slider"
      aria-label="Compare before and after"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={sliderPosition}
      tabindex="0"
    >
      <div
        class="image-container"
        style="transform: scale({zoomLevel}) translate({panPosition.x / zoomLevel}px, {panPosition.y / zoomLevel}px);"
      >
        <img src={originalUrl} alt="Original" class="original-image" />
        <div class="processed-overlay" style="clip-path: inset(0 0 0 {sliderPosition}%);">
          <img src={processedPreviewUrl} alt="Processed" />
        </div>
      </div>

      <div class="slider-handle" style="left: {sliderPosition}%;">
        <div class="handle-line"></div>
        <div class="handle-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6" />
            <polyline points="9,18 15,12 9,6" transform="translate(6, 0)" />
          </svg>
        </div>
      </div>

      <div class="label label-before">Before</div>
      <div class="label label-after">After</div>
    </div>

  {:else if viewMode === 'side-by-side'}
    <div
      class="side-by-side-view"
      role="group"
      aria-label="Side by side comparison"
      onwheel={handleWheel}
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
    >
      <div class="side-panel">
        <div class="side-label">Before</div>
        <div
          class="side-image-wrapper"
          style="transform: scale({zoomLevel}) translate({panPosition.x / zoomLevel}px, {panPosition.y / zoomLevel}px);"
        >
          <img src={originalUrl} alt="Original" />
        </div>
      </div>
      <div class="side-panel">
        <div class="side-label">After</div>
        <div
          class="side-image-wrapper"
          style="transform: scale({zoomLevel}) translate({panPosition.x / zoomLevel}px, {panPosition.y / zoomLevel}px);"
        >
          <img src={processedPreviewUrl} alt="Processed" />
        </div>
      </div>
    </div>

  {:else if viewMode === 'overlay'}
    <div
      class="overlay-view"
      role="group"
      aria-label="Overlay comparison"
      onwheel={handleWheel}
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
    >
      <div
        class="overlay-image-wrapper"
        style="transform: scale({zoomLevel}) translate({panPosition.x / zoomLevel}px, {panPosition.y / zoomLevel}px);"
      >
        <img src={originalUrl} alt="Original" class="overlay-base" />
        <img src={processedPreviewUrl} alt="Processed" class="overlay-top" style="opacity: {overlayOpacity};" />
      </div>
      <div class="overlay-slider">
        <span>Before</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          bind:value={overlayOpacity}
        />
        <span>After</span>
      </div>
    </div>
  {/if}

  <div class="stats">
    <div class="stat">
      <span class="stat-label">Original</span>
      <span class="stat-value">{formatBytes(result.originalSize)}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Processed</span>
      <span class="stat-value">{formatBytes(result.processedSize)}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Change</span>
      <span class="stat-value" class:smaller={isSmaller} class:larger={!isSmaller}>
        {sizeChange}
      </span>
    </div>
    <div class="stat">
      <span class="stat-label">Time</span>
      <span class="stat-value">{(result.processingTimeMs / 1000).toFixed(1)}s</span>
    </div>
  </div>

  <div class="actions">
    <a href={downloadUrl} download={result.originalFilename.replace(/\.[^.]+$/, '_processed.png')} class="btn btn-primary">
      Download Processed Image
    </a>
  </div>
</div>

<style>
  .preview-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  /* View controls */
  .view-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .view-toggle {
    display: flex;
    gap: 0.25rem;
    background: var(--color-surface, #1a2332);
    border-radius: 8px;
    padding: 0.25rem;
  }

  .view-toggle button {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-muted, #8892a0);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .view-toggle button:hover {
    color: var(--color-text, #e2e8f0);
  }

  .view-toggle button.active {
    background: var(--color-primary, #6366f1);
    color: white;
  }

  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .zoom-controls button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--color-border, #3a4a5c);
    border-radius: 6px;
    background: var(--color-surface, #1a2332);
    color: var(--color-text, #e2e8f0);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .zoom-controls button:hover:not(:disabled) {
    background: var(--color-primary, #6366f1);
    border-color: var(--color-primary, #6366f1);
  }

  .zoom-controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .zoom-controls button:last-child:not(:nth-child(3)) {
    width: auto;
    padding: 0 0.75rem;
    font-size: 0.75rem;
  }

  .zoom-level {
    min-width: 50px;
    text-align: center;
    font-size: 0.875rem;
    color: var(--color-text-muted, #8892a0);
  }

  /* Slider view */
  .comparison-slider {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border-radius: 8px;
    cursor: ew-resize;
    background: var(--color-surface, #1a2332);
  }

  .comparison-slider.zoomed {
    cursor: grab;
  }

  .comparison-slider.zoomed:active {
    cursor: grabbing;
  }

  .image-container {
    position: relative;
    width: 100%;
    height: 100%;
    transform-origin: center;
    transition: transform 0.1s ease-out;
  }

  .image-container img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .processed-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .slider-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    transform: translateX(-50%);
    pointer-events: none;
  }

  .handle-line {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    background: white;
    transform: translateX(-50%);
  }

  .handle-circle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    background: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .handle-circle svg {
    width: 20px;
    height: 20px;
    color: var(--color-primary, #6366f1);
  }

  .label {
    position: absolute;
    bottom: 12px;
    padding: 4px 12px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 0.75rem;
    border-radius: 4px;
  }

  .label-before {
    left: 12px;
  }

  .label-after {
    right: 12px;
  }

  /* Side by side view */
  .side-by-side-view {
    display: flex;
    gap: 1rem;
    width: 100%;
  }

  .side-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow: hidden;
    border-radius: 8px;
    background: var(--color-surface, #1a2332);
  }

  .side-label {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-muted, #8892a0);
    text-transform: uppercase;
  }

  .side-image-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    aspect-ratio: 16 / 10;
    transform-origin: center;
    transition: transform 0.1s ease-out;
  }

  .side-image-wrapper img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  /* Overlay view */
  .overlay-view {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .overlay-image-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border-radius: 8px;
    background: var(--color-surface, #1a2332);
    transform-origin: center;
    transition: transform 0.1s ease-out;
  }

  .overlay-image-wrapper img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .overlay-base {
    z-index: 1;
  }

  .overlay-top {
    z-index: 2;
    transition: opacity 0.15s ease;
  }

  .overlay-slider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--color-surface, #1a2332);
    border-radius: 8px;
  }

  .overlay-slider span {
    font-size: 0.75rem;
    color: var(--color-text-muted, #8892a0);
    min-width: 40px;
  }

  .overlay-slider span:first-child {
    text-align: right;
  }

  .overlay-slider input[type="range"] {
    flex: 1;
    max-width: 200px;
    height: 4px;
    border-radius: 2px;
    background: var(--color-border, #3a4a5c);
    appearance: none;
    cursor: pointer;
  }

  .overlay-slider input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-primary, #6366f1);
    cursor: pointer;
  }

  .stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--color-text-muted, #8892a0);
    text-transform: uppercase;
  }

  .stat-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text, #e2e8f0);
  }

  .stat-value.smaller {
    color: var(--color-success, #22c55e);
  }

  .stat-value.larger {
    color: var(--color-warning, #f59e0b);
  }

  .actions {
    display: flex;
    justify-content: center;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: var(--color-primary, #6366f1);
    color: white;
    border: none;
  }

  .btn-primary:hover {
    background: var(--color-primary-hover, #5558e3);
  }
</style>

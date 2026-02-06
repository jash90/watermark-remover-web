<script lang="ts">
  import { onMount } from 'svelte';
  import type { WatermarkRegion } from '$lib/types/watermark';

  interface Props {
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    onRegionChange: (region: WatermarkRegion) => void;
    initialRegion?: WatermarkRegion | null;
  }

  let { imageUrl, imageWidth, imageHeight, onRegionChange, initialRegion = null }: Props = $props();

  let container: HTMLDivElement;
  let imageWrapper: HTMLDivElement;
  let containerWidth = $state(0);
  let containerHeight = $state(0);
  let scale = $state(1);

  let isDrawing = $state(false);
  let startX = $state(0);
  let startY = $state(0);
  let currentRegion = $state<WatermarkRegion | null>(initialRegion);

  // Manual coordinate input mode
  let inputMode = $state<'draw' | 'manual'>('draw');
  let topLeftX = $state(initialRegion?.x ?? 0);
  let topLeftY = $state(initialRegion?.y ?? 0);
  let bottomRightX = $state(initialRegion ? initialRegion.x + initialRegion.width : 0);
  let bottomRightY = $state(initialRegion ? initialRegion.y + initialRegion.height : 0);

  // Update manual inputs when region changes from drawing
  $effect(() => {
    if (currentRegion && inputMode === 'draw') {
      topLeftX = Math.round(currentRegion.x);
      topLeftY = Math.round(currentRegion.y);
      bottomRightX = Math.round(currentRegion.x + currentRegion.width);
      bottomRightY = Math.round(currentRegion.y + currentRegion.height);
    }
  });

  // Apply manual coordinates to region
  function applyManualCoordinates() {
    const x = Math.min(topLeftX, bottomRightX);
    const y = Math.min(topLeftY, bottomRightY);
    const width = Math.abs(bottomRightX - topLeftX);
    const height = Math.abs(bottomRightY - topLeftY);

    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(x, imageWidth));
    const clampedY = Math.max(0, Math.min(y, imageHeight));
    const clampedWidth = Math.min(width, imageWidth - clampedX);
    const clampedHeight = Math.min(height, imageHeight - clampedY);

    currentRegion = {
      x: clampedX,
      y: clampedY,
      width: clampedWidth,
      height: clampedHeight,
    };
  }

  // Handle input change with validation
  function handleCoordinateInput(e: Event, field: 'topLeftX' | 'topLeftY' | 'bottomRightX' | 'bottomRightY') {
    const input = e.target as HTMLInputElement;
    const value = Math.max(0, parseInt(input.value) || 0);

    const maxX = imageWidth;
    const maxY = imageHeight;

    switch (field) {
      case 'topLeftX':
        topLeftX = Math.min(value, maxX);
        break;
      case 'topLeftY':
        topLeftY = Math.min(value, maxY);
        break;
      case 'bottomRightX':
        bottomRightX = Math.min(value, maxX);
        break;
      case 'bottomRightY':
        bottomRightY = Math.min(value, maxY);
        break;
    }

    applyManualCoordinates();
  }

  // Calculate scale to fit image in container
  $effect(() => {
    if (containerWidth && containerHeight && imageWidth && imageHeight) {
      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;
      scale = Math.min(scaleX, scaleY, 1);
    }
  });

  // Notify parent of region changes
  $effect(() => {
    if (currentRegion && currentRegion.width >= 5 && currentRegion.height >= 5) {
      onRegionChange(currentRegion);
    }
  });

  onMount(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth = entry.contentRect.width;
        containerHeight = entry.contentRect.height;
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  });

  function getMousePosition(e: MouseEvent): { x: number; y: number } {
    const rect = imageWrapper.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return {
      x: Math.max(0, Math.min(x, imageWidth)),
      y: Math.max(0, Math.min(y, imageHeight)),
    };
  }

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDrawing = true;
    const pos = getMousePosition(e);
    startX = pos.x;
    startY = pos.y;
    currentRegion = { x: startX, y: startY, width: 0, height: 0 };
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDrawing) return;

    const pos = getMousePosition(e);
    const x = Math.min(startX, pos.x);
    const y = Math.min(startY, pos.y);
    const width = Math.abs(pos.x - startX);
    const height = Math.abs(pos.y - startY);

    currentRegion = { x, y, width, height };
  }

  function handleMouseUp() {
    isDrawing = false;
  }

  // Touch support
  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} } as MouseEvent);
  }

  function handleTouchMove(e: TouchEvent) {
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
  }

  function handleTouchEnd() {
    handleMouseUp();
  }

  const scaledWidth = $derived(imageWidth * scale);
  const scaledHeight = $derived(imageHeight * scale);
</script>

<div class="selector-container" bind:this={container}>
  <div
    class="image-wrapper"
    bind:this={imageWrapper}
    style="width: {scaledWidth}px; height: {scaledHeight}px;"
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseUp}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    role="application"
    aria-label="Draw a rectangle over the watermark to remove"
  >
    <img src={imageUrl} alt="Select watermark region" draggable="false" />

    {#if currentRegion && (currentRegion.width > 0 || currentRegion.height > 0)}
      <div
        class="selection-overlay"
        style="
          left: {currentRegion.x * scale}px;
          top: {currentRegion.y * scale}px;
          width: {currentRegion.width * scale}px;
          height: {currentRegion.height * scale}px;
        "
      >
        <span class="selection-size">
          {Math.round(currentRegion.width)} x {Math.round(currentRegion.height)}
        </span>
      </div>
    {/if}
  </div>

  <div class="input-panel">
    <div class="mode-toggle">
      <button
        class="mode-btn"
        class:active={inputMode === 'draw'}
        onclick={() => inputMode = 'draw'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 3v18" />
        </svg>
        Draw
      </button>
      <button
        class="mode-btn"
        class:active={inputMode === 'manual'}
        onclick={() => inputMode = 'manual'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Coordinates
      </button>
    </div>

    {#if inputMode === 'manual'}
      <div class="coordinates-form">
        <div class="coord-group">
          <label class="coord-label">Top-Left Corner</label>
          <div class="coord-inputs">
            <div class="coord-field">
              <span class="coord-prefix">X:</span>
              <input
                type="number"
                min="0"
                max={imageWidth}
                value={topLeftX}
                oninput={(e) => handleCoordinateInput(e, 'topLeftX')}
              />
            </div>
            <div class="coord-field">
              <span class="coord-prefix">Y:</span>
              <input
                type="number"
                min="0"
                max={imageHeight}
                value={topLeftY}
                oninput={(e) => handleCoordinateInput(e, 'topLeftY')}
              />
            </div>
          </div>
        </div>

        <div class="coord-group">
          <label class="coord-label">Bottom-Right Corner</label>
          <div class="coord-inputs">
            <div class="coord-field">
              <span class="coord-prefix">X:</span>
              <input
                type="number"
                min="0"
                max={imageWidth}
                value={bottomRightX}
                oninput={(e) => handleCoordinateInput(e, 'bottomRightX')}
              />
            </div>
            <div class="coord-field">
              <span class="coord-prefix">Y:</span>
              <input
                type="number"
                min="0"
                max={imageHeight}
                value={bottomRightY}
                oninput={(e) => handleCoordinateInput(e, 'bottomRightY')}
              />
            </div>
          </div>
        </div>

        <p class="image-dimensions">
          Image size: {imageWidth} x {imageHeight} px
        </p>
      </div>
    {:else}
      <p class="instructions">
        Click and drag to select the watermark region
      </p>
    {/if}
  </div>
</div>

<style>
  .selector-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
    height: 100%;
    min-height: 400px;
  }

  .image-wrapper {
    position: relative;
    cursor: crosshair;
    user-select: none;
    -webkit-user-select: none;
  }

  .image-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
  }

  .selection-overlay {
    position: absolute;
    border: 2px solid var(--color-primary, #6366f1);
    background: rgba(99, 102, 241, 0.2);
    pointer-events: none;
  }

  .selection-size {
    position: absolute;
    bottom: -24px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-primary, #6366f1);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .instructions {
    color: var(--color-text-muted, #8892a0);
    font-size: 0.875rem;
    margin: 0;
  }

  .input-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
    max-width: 400px;
  }

  .mode-toggle {
    display: flex;
    gap: 0.5rem;
    background: var(--color-surface-elevated, #1e1e2e);
    padding: 4px;
    border-radius: 8px;
  }

  .mode-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    color: var(--color-text-muted, #8892a0);
    font-size: 0.875rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-btn:hover {
    color: var(--color-text, #e0e0e0);
  }

  .mode-btn.active {
    background: var(--color-primary, #6366f1);
    color: white;
  }

  .mode-btn svg {
    flex-shrink: 0;
  }

  .coordinates-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .coord-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .coord-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted, #8892a0);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .coord-inputs {
    display: flex;
    gap: 1rem;
  }

  .coord-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }

  .coord-prefix {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-muted, #8892a0);
    min-width: 20px;
  }

  .coord-field input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border, #333);
    border-radius: 6px;
    background: var(--color-surface, #1a1a2e);
    color: var(--color-text, #e0e0e0);
    font-size: 0.875rem;
    font-family: monospace;
    min-width: 0;
  }

  .coord-field input:focus {
    outline: none;
    border-color: var(--color-primary, #6366f1);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }

  .coord-field input::-webkit-inner-spin-button,
  .coord-field input::-webkit-outer-spin-button {
    opacity: 1;
  }

  .image-dimensions {
    font-size: 0.75rem;
    color: var(--color-text-muted, #8892a0);
    margin: 0;
    text-align: center;
  }
</style>

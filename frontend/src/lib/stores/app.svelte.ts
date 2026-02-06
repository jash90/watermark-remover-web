import type {
  AppStage,
  WatermarkRegion,
  ProcessResult,
  BatchFile,
  BatchProgress,
} from '$lib/types/watermark';

// App state using Svelte 5 runes
class AppState {
  stage = $state<AppStage>('upload');
  currentFile = $state<File | null>(null);
  imagePreviewUrl = $state<string | null>(null);
  region = $state<WatermarkRegion | null>(null);
  lossless = $state(false);
  isProcessing = $state(false);
  error = $state<string | null>(null);
  result = $state<ProcessResult | null>(null);

  // Batch mode
  batchFiles = $state<BatchFile[]>([]);
  batchProgress = $state<BatchProgress | null>(null);

  // Parallel processing options
  parallelProcessing = $state(false);
  maxParallelJobs = $state(2);
  activeJobs = $state(0);

  // API connection status
  apiConnected = $state<boolean | null>(null);

  // Derived states
  canProcess = $derived(
    this.currentFile !== null &&
      this.region !== null &&
      this.region.width >= 5 &&
      this.region.height >= 5 &&
      !this.isProcessing
  );

  isBatchMode = $derived(this.batchFiles.length > 1);

  batchCompleted = $derived(
    this.batchFiles.every(
      (f) => f.status === 'completed' || f.status === 'failed'
    )
  );

  batchSuccessCount = $derived(
    this.batchFiles.filter((f) => f.status === 'completed').length
  );

  batchFailedCount = $derived(
    this.batchFiles.filter((f) => f.status === 'failed').length
  );

  // Actions
  setFile(file: File) {
    this.currentFile = file;
    this.imagePreviewUrl = URL.createObjectURL(file);
    this.region = null;
    this.error = null;
    this.result = null;
    this.stage = 'select';
  }

  setFiles(files: File[]) {
    if (files.length === 0) return;

    if (files.length === 1) {
      this.setFile(files[0]);
      return;
    }

    // Batch mode
    this.batchFiles = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      filename: file.name,
      status: 'pending' as const,
    }));
    this.currentFile = files[0];
    this.imagePreviewUrl = URL.createObjectURL(files[0]);
    this.region = null;
    this.error = null;
    this.stage = 'batch-select';
  }

  setRegion(region: WatermarkRegion) {
    this.region = region;
  }

  setLossless(value: boolean) {
    this.lossless = value;
  }

  setProcessing(value: boolean) {
    this.isProcessing = value;
    if (value) {
      this.error = null;
    }
  }

  setError(message: string | null) {
    this.error = message;
    this.isProcessing = false;
  }

  setResult(result: ProcessResult) {
    this.result = result;
    this.isProcessing = false;
    this.stage = 'preview';
  }

  updateBatchFile(id: string, update: Partial<BatchFile>) {
    this.batchFiles = this.batchFiles.map((f) =>
      f.id === id ? { ...f, ...update } : f
    );
  }

  setBatchProgress(progress: BatchProgress | null) {
    this.batchProgress = progress;
  }

  startBatchProcessing() {
    this.stage = 'batch-processing';
    this.isProcessing = true;
    this.error = null;
  }

  finishBatchProcessing() {
    this.isProcessing = false;
    this.stage = 'batch-results';
  }

  setApiConnected(connected: boolean) {
    this.apiConnected = connected;
  }

  setParallelProcessing(value: boolean) {
    this.parallelProcessing = value;
  }

  setMaxParallelJobs(value: number) {
    this.maxParallelJobs = Math.max(1, Math.min(4, value));
  }

  setActiveJobs(count: number) {
    this.activeJobs = count;
  }

  reset() {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.stage = 'upload';
    this.currentFile = null;
    this.imagePreviewUrl = null;
    this.region = null;
    this.isProcessing = false;
    this.error = null;
    this.result = null;
    this.batchFiles = [];
    this.batchProgress = null;
  }

  goBack() {
    switch (this.stage) {
      case 'select':
      case 'batch-select':
        this.reset();
        break;
      case 'preview':
        this.stage = 'select';
        this.result = null;
        break;
      case 'batch-results':
        this.reset();
        break;
    }
  }
}

export const appState = new AppState();

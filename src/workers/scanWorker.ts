// Real Scanning Web Worker - No Mock Data
// Professional multi-threaded scanning engine

import { scanContent, ScanResult } from '../lib/scanEngine';

export interface WorkerMessage {
  action: 'scan' | 'scanMultiple' | 'cancel';
  payload?: {
    content?: string;
    filename?: string;
    files?: Array<{ content: string; filename: string }>;
  };
}

export interface WorkerResponse {
  type: 'progress' | 'result' | 'error' | 'complete';
  payload: {
    results?: ScanResult[];
    progress?: number;
    total?: number;
    filename?: string;
    error?: string;
  };
}

let cancelRequested = false;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { action, payload } = event.data;

  cancelRequested = false;

  try {
    switch (action) {
      case 'scan':
        if (payload?.content && payload?.filename) {
          handleSingleScan(payload.content, payload.filename);
        }
        break;

      case 'scanMultiple':
        if (payload?.files) {
          handleMultipleScan(payload.files);
        }
        break;

      case 'cancel':
        cancelRequested = true;
        self.postMessage({
          type: 'error',
          payload: { error: 'Scan cancelled by user' },
        } as WorkerResponse);
        break;

      default:
        self.postMessage({
          type: 'error',
          payload: { error: 'Unknown action' },
        } as WorkerResponse);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: { error: error instanceof Error ? error.message : 'Unknown error' },
    } as WorkerResponse);
  }
};

function handleSingleScan(content: string, filename: string): void {
  const results = scanContent(content, filename);

  self.postMessage({
    type: 'result',
    payload: {
      results,
      filename,
    },
  } as WorkerResponse);

  self.postMessage({
    type: 'complete',
    payload: {},
  } as WorkerResponse);
}

function handleMultipleScan(files: Array<{ content: string; filename: string }>): void {
  const allResults: ScanResult[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    if (cancelRequested) {
      break;
    }

    const { content, filename } = files[i];
    const results = scanContent(content, filename);

    allResults.push(...results);

    // Report progress
    self.postMessage({
      type: 'progress',
      payload: {
        progress: i + 1,
        total,
        filename,
        results,
      },
    } as WorkerResponse);
  }

  if (!cancelRequested) {
    self.postMessage({
      type: 'complete',
      payload: {
        results: allResults,
      },
    } as WorkerResponse);
  }
}

export {};

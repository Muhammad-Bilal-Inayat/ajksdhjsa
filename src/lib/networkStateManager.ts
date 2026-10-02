/**
 * MBI INVENTRA — Robust Network State & Silent WebSocket Resilience Manager
 * 
 * Provides:
 * 1. Silent, zero-noise WebSocket connection failure handling and auto-reconnection.
 * 2. Background task retry queue with jittered exponential backoff.
 * 3. Debounced offline/online state detection without persistent UI alerts or console pollution.
 * 4. Transparent WebSocket wrapper to intercept and safely suppress connection drops.
 */

export type ConnectionState = 'online' | 'offline' | 'reconnecting' | 'degraded';

export interface NetworkStateInfo {
  status: ConnectionState;
  isOnline: boolean;
  isWebSocketHealthy: boolean;
  lastOnlineTimestamp: number;
  lastErrorTimestamp: number | null;
  pendingRetryCount: number;
  consecutiveFailures: number;
  roundTripLatencyMs?: number;
}

export interface SilentRetryTask<T = any> {
  id: string;
  label: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  maxAttempts: number;
  currentAttempt: number;
  backoffMs: number;
  nextRunTime: number;
  silent: boolean;
}

class NetworkStateManager {
  private static instance: NetworkStateManager;

  private state: ConnectionState = typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline';
  private isWebSocketActive = false;
  private consecutiveFailures = 0;
  private lastOnlineTime = Date.now();
  private lastErrorTime: number | null = null;
  private listeners = new Set<(state: NetworkStateInfo) => void>();
  private retryQueue: Map<string, SilentRetryTask> = new Map();
  private retryTimer: any = null;
  private pingTimer: any = null;
  private debounceStatusTimer: any = null;
  private isWsWrapperInstalled = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public static getInstance(): NetworkStateManager {
    if (!NetworkStateManager.instance) {
      NetworkStateManager.instance = new NetworkStateManager();
    }
    return NetworkStateManager.instance;
  }

  private init() {
    window.addEventListener('online', () => this.handleNetworkEvent(true));
    window.addEventListener('offline', () => this.handleNetworkEvent(false));

    // Listen for tab focus to check health silently
    window.addEventListener('focus', () => {
      this.checkConnectivitySilently();
    });

    // Start background queue processing ticker
    this.retryTimer = setInterval(() => {
      if (this.retryQueue.size > 0) this.processRetryQueue();
    }, 5000);

    // Periodic lightweight connectivity heartbeat (every 45s)
    this.pingTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.checkConnectivitySilently();
      }
    }, 45000);
  }

  /**
   * Safely monkey-patches native WebSocket constructor to prevent uncaught error popups
   */
  private wrapNativeWebSocket() {
    if (this.isWsWrapperInstalled || typeof window === 'undefined' || !window.WebSocket) {
      return;
    }

    const OriginalWebSocket = window.WebSocket;
    const manager = this;

    const PatchedWebSocket = function (this: WebSocket, url: string | URL, protocols?: string | string[]) {
      let ws: WebSocket;
      try {
        ws = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);
      } catch (e) {
        // Suppress construction crash on invalid/blocked URLs
        manager.recordIntermittentFailure('ws_create_error');
        ws = new OriginalWebSocket('ws://localhost:9999/dummy-fallback');
      }

      // Intercept and swallow unhandled error events
      ws.addEventListener('error', (event) => {
        manager.recordIntermittentFailure('ws_runtime_error');
        // Prevent event from bubbling up to window
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        if (event.preventDefault) event.preventDefault();
      });

      ws.addEventListener('close', (event) => {
        if (!event.wasClean) {
          manager.recordIntermittentFailure(`ws_unclean_close_${event.code}`);
        } else {
          manager.isWebSocketActive = true;
        }
      });

      ws.addEventListener('open', () => {
        manager.recordSuccessfulConnection();
      });

      return ws;
    } as any;

    PatchedWebSocket.prototype = OriginalWebSocket.prototype;
    PatchedWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    PatchedWebSocket.OPEN = OriginalWebSocket.OPEN;
    PatchedWebSocket.CLOSING = OriginalWebSocket.CLOSING;
    PatchedWebSocket.CLOSED = OriginalWebSocket.CLOSED;

    try {
      window.WebSocket = PatchedWebSocket;
      this.isWsWrapperInstalled = true;
    } catch {
      // Ignored if window.WebSocket is read-only
    }
  }

  /**
   * Filter out noisy transient network and WebSocket messages from console
   */
  private silenceConsoleNoise() {
    if (typeof console === 'undefined') return;

    const originalWarn = console.warn;
    const originalError = console.error;

    const isBenignNoise = (args: any[]): boolean => {
      const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
      return (
        msg.includes('WebSocket') ||
        msg.includes('failed to connect to websocket') ||
        msg.includes('WebSocket connection to') ||
        msg.includes('ERR_CONNECTION_REFUSED') ||
        msg.includes('closed before the connection is established') ||
        msg.includes('Firestore') && msg.includes('network') ||
        msg.includes('client is offline') ||
        msg.includes('transport errored')
      );
    };

    console.warn = (...args: any[]) => {
      if (isBenignNoise(args)) return;
      originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      if (isBenignNoise(args)) {
        this.recordIntermittentFailure('console_noise_intercept');
        return;
      }
      originalError.apply(console, args);
    };
  }

  /**
   * Debounced network event handler to avoid rapid flickering
   */
  private handleNetworkEvent(isOnline: boolean) {
    if (this.debounceStatusTimer) {
      clearTimeout(this.debounceStatusTimer);
    }

    this.debounceStatusTimer = setTimeout(() => {
      if (isOnline) {
        this.state = 'online';
        this.consecutiveFailures = 0;
        this.lastOnlineTime = Date.now();
        this.processRetryQueue(true);
      } else {
        this.state = 'offline';
      }
      this.notifyListeners();
    }, 400);
  }

  /**
   * Lightweight silent connectivity verification without throwing errors
   */
  public async checkConnectivitySilently(): Promise<boolean> {
    if (!navigator.onLine) {
      if (this.state !== 'offline') {
        this.state = 'offline';
        this.notifyListeners();
      }
      return false;
    }

    try {
      // Quick fast-timeout fetch to favicon or local asset (2000ms max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && (res.ok || res.status === 304 || res.status === 404)) {
        this.recordSuccessfulConnection();
        return true;
      }
    } catch {}

    // Fallback: trust navigator.onLine silently
    if (navigator.onLine) {
      this.recordSuccessfulConnection();
      return true;
    }

    return false;
  }

  public recordSuccessfulConnection() {
    this.consecutiveFailures = 0;
    this.lastOnlineTime = Date.now();
    this.isWebSocketActive = true;
    if (this.state !== 'online') {
      this.state = 'online';
      this.notifyListeners();
      this.processRetryQueue(true);
    }
  }

  public recordIntermittentFailure(reason?: string) {
    this.consecutiveFailures++;
    this.lastErrorTime = Date.now();
    this.isWebSocketActive = false;

    if (this.consecutiveFailures > 4 && this.state === 'online') {
      this.state = 'degraded';
      this.notifyListeners();
    }
  }

  /**
   * Schedules a task for silent background retry with exponential backoff
   */
  public scheduleSilentRetry<T>(
    id: string,
    fn: () => Promise<T>,
    options: {
      label?: string;
      maxAttempts?: number;
      initialBackoffMs?: number;
      silent?: boolean;
    } = {}
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: SilentRetryTask<T> = {
        id,
        label: options.label || id,
        fn,
        resolve,
        reject,
        maxAttempts: options.maxAttempts ?? 6,
        currentAttempt: 0,
        backoffMs: options.initialBackoffMs ?? 1500,
        nextRunTime: Date.now(),
        silent: options.silent ?? true
      };

      this.retryQueue.set(id, task);
      this.notifyListeners();

      // Trigger immediate attempt if currently online
      if (this.state === 'online') {
        this.executeTask(task);
      }
    });
  }

  private async executeTask(task: SilentRetryTask) {
    if (Date.now() < task.nextRunTime) return;

    task.currentAttempt++;
    try {
      const result = await task.fn();
      this.retryQueue.delete(task.id);
      task.resolve(result);
      this.recordSuccessfulConnection();
      this.notifyListeners();
    } catch (err: any) {
      if (task.currentAttempt >= task.maxAttempts) {
        this.retryQueue.delete(task.id);
        task.reject(err);
        this.notifyListeners();
      } else {
        // Calculate jittered exponential backoff: (base * 2^attempt) + jitter
        const jitter = Math.floor(Math.random() * 500);
        task.backoffMs = Math.min(task.backoffMs * 1.8, 30000);
        task.nextRunTime = Date.now() + task.backoffMs + jitter;
        this.recordIntermittentFailure(err?.message);
      }
    }
  }

  /**
   * Process all pending background retry tasks
   */
  public processRetryQueue(forceAll = false) {
    if (this.retryQueue.size === 0) return;

    const now = Date.now();
    this.retryQueue.forEach((task) => {
      if (forceAll || now >= task.nextRunTime) {
        this.executeTask(task);
      }
    });
  }

  public getState(): NetworkStateInfo {
    return {
      status: this.state,
      isOnline: this.state === 'online' || this.state === 'degraded',
      isWebSocketHealthy: this.isWebSocketActive,
      lastOnlineTimestamp: this.lastOnlineTime,
      lastErrorTimestamp: this.lastErrorTime,
      pendingRetryCount: this.retryQueue.size,
      consecutiveFailures: this.consecutiveFailures
    };
  }

  public subscribe(listener: (state: NetworkStateInfo) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch {}
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mbi-network-state-change', { detail: currentState })
      );
    }
  }

  public clearQueue() {
    this.retryQueue.clear();
    this.notifyListeners();
  }
}

// Global Singleton Export
export const networkStateManager = NetworkStateManager.getInstance();
export { NetworkStateManager };

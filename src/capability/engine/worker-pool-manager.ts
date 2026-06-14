/**
 * Worker Pool 管理器 — 进程级并行
 * 每个 Worker = 独立 Node.js 子进程 + 独立 Chromium
 */
import { EventEmitter } from 'node:events';
import { TaskScheduler, type TaskItem } from './task-scheduler.js';
import { detectResources, runtimeCheck, type ResourceProfile } from './resource-detector.js';
import { loadConfig } from '../config/loader.js';

export type WorkerStatus = 'idle' | 'assigned' | 'running' | 'completed' | 'failed' | 'draining';

export class WorkerPoolManager extends EventEmitter {
  private workers: Map<string, { id: string; status: WorkerStatus; currentTaskId: string | null; crashCount: number }> = new Map();
  private config: ReturnType<typeof loadConfig>['executor']['worker_pool'];
  private scheduler: TaskScheduler;
  private resourceProfile: ResourceProfile;
  private pendingTasks: TaskItem[] = [];
  private started = false;
  private resourceTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(scheduler: TaskScheduler) {
    super();
    this.scheduler = scheduler;
    this.config = loadConfig().executor.worker_pool;
    this.resourceProfile = detectResources();
  }

  get maxWorkers(): number {
    if (this.config.max_workers === 'auto') return this.resourceProfile.recommendedMaxWorkers;
    return this.config.max_workers;
  }

  get activeWorkers(): number { return this.workers.size; }

  async start(tasks: TaskItem[]): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.pendingTasks = [...tasks];
    this.scheduler.enqueueBatch(tasks);

    const initialCount = this.config.initial_workers === 'auto'
      ? Math.min(4, this.maxWorkers)
      : this.config.initial_workers;

    for (let i = 0; i < initialCount; i++) {
      await this.spawnWorker();
      await this.sleep(this.config.spawn_interval_ms || 800);
    }

    this.resourceTimer = setInterval(() => this.checkResources(), 5000);
    this.heartbeatTimer = setInterval(() => this.dispatchAll(), 1000);

    console.log('[WorkerPool] 启动完成 — 活跃Worker=' + this.workers.size + ' 最大=' + this.maxWorkers);
  }

  private async spawnWorker(): Promise<string> {
    const id = 'w-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    this.workers.set(id, { id, status: 'idle', currentTaskId: null, crashCount: 0 });
    // 实际实现: child_process.fork('src/capability/engine/worker.js', [], { env: { WORKER_ID: id } })
    // IPC: child.on('message', msg => handleWorkerMessage(id, msg))
    console.log('[WorkerPool] Worker ' + id + ' spawned (placeholder — real fork in Phase 4 complete)');
    this.emit('worker:spawned', id);
    return id;
  }

  private dispatchAll(): void {
    for (const [id, w] of this.workers) {
      if (w.status !== 'idle') continue;
      const task = this.scheduler.assignTask(id);
      if (task) {
        w.status = 'running';
        w.currentTaskId = task.id;
        this.emit('task:dispatched', { workerId: id, taskId: task.id });
      }
    }
  }

  private checkResources(): void {
    const { shouldDrain, canSpawnNew, drainCount } = runtimeCheck(this.workers.size);
    if (shouldDrain) {
      let drained = 0;
      for (const [, w] of this.workers) {
        if (drained >= drainCount) break;
        if (w.status === 'running') { w.status = 'draining'; drained++; }
      }
    }
    if (canSpawnNew && this.scheduler.pendingCount() > 0 && this.workers.size < this.maxWorkers) {
      // 扩容失败不阻塞资源检查循环，通过事件通知外部监听方
      this.spawnWorker().catch((err: unknown) => {
        console.error(
          '[WorkerPool] Worker 扩容失败:',
          (err as Error)?.message || err,
        );
        this.emit('worker:spawn-failed', { error: err, timestamp: Date.now() });
      });
    }
  }

  handleWorkerComplete(workerId: string, taskId: string, status: 'passed' | 'failed'): void {
    const w = this.workers.get(workerId);
    if (w) { w.status = 'idle'; w.currentTaskId = null; }
    this.scheduler.markCompleted(taskId, workerId);
    this.emit('task:completed', { workerId, taskId, status });
  }

  handleWorkerCrash(workerId: string): void {
    const w = this.workers.get(workerId);
    if (!w) return;
    w.crashCount++;
    if (w.crashCount >= 3) {
      this.workers.delete(workerId);
      console.error('[WorkerPool] Worker ' + workerId + ' crash limit reached — removed');
      return;
    }
    setTimeout(() => this.spawnWorker(), 5000 * Math.pow(2, w.crashCount - 1));
    this.workers.delete(workerId);
  }

  async shutdown(): Promise<void> {
    this.started = false;
    if (this.resourceTimer) clearInterval(this.resourceTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.workers.clear();
  }

  private sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
}

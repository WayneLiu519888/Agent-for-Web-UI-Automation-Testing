/**
 * 任务调度器 — 优先级队列 + par_group 亲和性 + 工作窃取
 */
import type { ExecutionPlan } from '../../types/yaml.js';
import { loadConfig } from '../config/loader.js';

export interface TaskItem {
  id: string;
  caseId: string;
  executionPlan: ExecutionPlan;
  priority: number;          // P0=4, P1=3, P2=2, P3=1
  parGroup: string | null;
  assignedTo: string | null;
  retryCount: number;
  createdAt: number;
  environment: string;
  authStatePath?: string;
  screenshotOn?: string;
}

export class TaskScheduler {
  private queue: TaskItem[] = [];
  private completed: Map<string, TaskItem> = new Map();
  private stolen: Set<string> = new Set();

  enqueue(task: TaskItem): void {
    this.queue.push(task);
    this.sort();
  }

  enqueueBatch(tasks: TaskItem[]): void {
    this.queue.push(...tasks);
    this.sort();
  }

  /** 分配任务给指定 Worker — 优先同 parGroup 的任务 */
  assignTask(workerId: string): TaskItem | null {
    // 先找同 parGroup 且未分配的任务
    const known = this.completed;
    const sameGroup = this.queue.find(t => t.assignedTo === null && known.has(t.parGroup || ''));
    if (sameGroup) {
      sameGroup.assignedTo = workerId;
      return sameGroup;
    }
    // 否则取优先级最高的
    const next = this.queue.find(t => t.assignedTo === null);
    if (next) {
      next.assignedTo = workerId;
      return next;
    }
    return null;
  }

  /** 工作窃取 — 从繁忙 Worker 队列末尾拉取 */
  steal(workerId: string): TaskItem | null {
    const busy = this.queue.filter(t => t.assignedTo && !this.stolen.has(t.id));
    if (busy.length < 2) return null;
    const target = busy[busy.length - 1];
    const originalWorker = target.assignedTo;
    this.stolen.add(target.id);
    target.assignedTo = workerId;
    // 通知原 Worker 任务已被窃取（实际实现中通过 IPC 发送 TASK_STOLEN 消息）
    // 此处简化：记录原 Worker 到 stolen 集合，原 Worker 下次 dispatchAll 跳过已窃取任务
    return target;
  }

  markCompleted(taskId: string): void {
    const idx = this.queue.findIndex(t => t.id === taskId);
    if (idx >= 0) {
      const [t] = this.queue.splice(idx, 1);
      this.completed.set(t.id, t);
    }
  }

  hasPendingTasks(): boolean {
    return this.queue.some(t => !t.assignedTo);
  }

  pendingCount(): number {
    return this.queue.filter(t => t.assignedTo === null).length;
  }

  totalCount(): number { return this.queue.length + this.completed.size; }

  private sort(): void {
    this.queue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
  }
}

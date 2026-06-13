/**
 * 任务调度器 — 优先级队列 + par_group 亲和性 + 工作窃取
 *
 * parGroup 亲和性设计:
 *   - 维护 workerParGroups: Map<workerId, Set<parGroup>> 结构
 *   - 分配任务时，优先为 Worker 匹配其历史上执行过的同 parGroup 任务
 *   - 避免将同一 parGroup（如认证相关）任务随机分配给不同 Worker，防止认证状态冲突
 */
import type { ExecutionPlan } from '../../types/yaml.js';

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
  /** 记录每个 Worker 历史上执行过的 parGroup 集合，用于亲和性调度 */
  private workerParGroups: Map<string, Set<string>> = new Map();

  enqueue(task: TaskItem): void {
    this.queue.push(task);
    this.sort();
  }

  enqueueBatch(tasks: TaskItem[]): void {
    this.queue.push(...tasks);
    this.sort();
  }

  /** 分配任务给指定 Worker — 优先同 parGroup 的任务（基于 Worker 历史执行的 parGroup 集合） */
  assignTask(workerId: string): TaskItem | null {
    // Step 1: 查找该 Worker 历史上执行过的 parGroup 集合
    const affinityGroups = this.workerParGroups.get(workerId);
    if (affinityGroups && affinityGroups.size > 0) {
      // 在未分配任务中，优先找与此 Worker 有 parGroup 亲和性的任务
      const sameGroup = this.queue.find(t =>
        t.assignedTo === null &&
        t.parGroup !== null &&
        affinityGroups.has(t.parGroup)
      );
      if (sameGroup) {
        sameGroup.assignedTo = workerId;
        return sameGroup;
      }
    }

    // Step 2: 无亲和匹配，取优先级最高的未分配任务
    const next = this.queue.find(t => t.assignedTo === null);
    if (next) {
      next.assignedTo = workerId;
      // 记录此 Worker↔parGroup 关系，以便后续同组任务也有亲和性
      if (next.parGroup) {
        this.recordAffinity(workerId, next.parGroup);
      }
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
    // 窃取后也记录 parGroup 亲和性
    if (target.parGroup) {
      this.recordAffinity(workerId, target.parGroup);
    }
    // 通知原 Worker 任务已被窃取（实际实现中通过 IPC 发送 TASK_STOLEN 消息）
    // 此处简化：记录原 Worker 到 stolen 集合，原 Worker 下次 dispatchAll 跳过已窃取任务
    return target;
  }

  /** 标记任务完成，记录 Worker↔parGroup 亲和关系 */
  markCompleted(taskId: string, workerId?: string): void {
    const idx = this.queue.findIndex(t => t.id === taskId);
    if (idx >= 0) {
      const [t] = this.queue.splice(idx, 1);
      this.completed.set(t.id, t);
      // 任务完成后记录 Worker↔parGroup 关系，增强后续分配亲和性
      if (workerId && t.parGroup) {
        this.recordAffinity(workerId, t.parGroup);
      }
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

  /** 记录 Worker 执行过某个 parGroup，建立亲和关系 */
  private recordAffinity(workerId: string, parGroup: string): void {
    let groups = this.workerParGroups.get(workerId);
    if (!groups) {
      groups = new Set();
      this.workerParGroups.set(workerId, groups);
    }
    groups.add(parGroup);
  }
}

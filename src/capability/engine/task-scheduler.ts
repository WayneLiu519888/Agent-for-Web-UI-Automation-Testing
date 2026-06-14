/**
 * 任务调度器 — 优先级队列 + par_group 亲和性 + 工作窃取
 *
 * parGroup 亲和性设计:
 *   - 维护 workerParGroups: Map<workerId, Set<parGroup>> 结构
 *   - 分配任务时，优先为 Worker 匹配其历史上执行过的同 parGroup 任务
 *   - 避免将同一 parGroup（如认证相关）任务随机分配给不同 Worker，防止认证状态冲突
 *
 * 性能优化 (C2+C3):
 *   - C2: 维护分区队列 — unassigned[] + assigned[] + unassignedByParGroup Map 索引
 *         assignTask O(1) 取首元素，steal O(1) 取末元素
 *   - C3: 入队使用二分插入 O(log n) 替代完整排序 O(n log n)
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
  /** 未分配任务 — 按优先级排序（二分插入维护），assignTask 时从头部取 O(1) */
  private unassigned: TaskItem[] = [];
  /** 已分配但未完成的任务 — steal 时从末尾取 O(1) */
  private assigned: TaskItem[] = [];
  /** 按 parGroup 分组的未分配任务索引 — 用于 affinity 亲和性 O(1) 查找 */
  private unassignedByParGroup: Map<string, TaskItem[]> = new Map();
  /** 已完成任务 */
  private completed: Map<string, TaskItem> = new Map();
  /** 已窃取任务 ID 集合 */
  private stolen: Set<string> = new Set();
  /** 记录每个 Worker 历史上执行过的 parGroup 集合，用于亲和性调度 */
  private workerParGroups: Map<string, Set<string>> = new Map();

  /** 入队 — 二分插入 O(log n)，替代原来的 push+sort O(n log n) */
  enqueue(task: TaskItem): void {
    this.insertSorted(this.unassigned, task);
    if (task.parGroup) {
      this.insertSorted(this.getOrCreateGroupArray(task.parGroup), task);
    }
  }

  /** 批量入队 — 逐个二分插入 */
  enqueueBatch(tasks: TaskItem[]): void {
    for (const task of tasks) {
      this.enqueue(task);
    }
  }

  /** 分配任务给指定 Worker — 优先同 parGroup 的任务（基于 Worker 历史执行的 parGroup 集合） */
  assignTask(workerId: string): TaskItem | null {
    // Step 1: 查找该 Worker 历史上执行过的 parGroup 集合，优先匹配亲和任务
    const affinityGroups = this.workerParGroups.get(workerId);
    if (affinityGroups && affinityGroups.size > 0) {
      for (const group of affinityGroups) {
        const groupArr = this.unassignedByParGroup.get(group);
        if (groupArr && groupArr.length > 0) {
          const task = groupArr[0]; // O(1) 取同 parGroup 优先级最高的任务
          this.removeFromArray(this.unassigned, task);
          groupArr.shift();
          if (groupArr.length === 0) {
            this.unassignedByParGroup.delete(group);
          }
          task.assignedTo = workerId;
          this.assigned.push(task);
          return task;
        }
      }
    }

    // Step 2: 无亲和匹配，取优先级最高的未分配任务（unassigned[0]）
    if (this.unassigned.length > 0) {
      const task = this.unassigned[0]; // O(1) 取优先级最高的未分配任务
      this.unassigned.shift();
      if (task.parGroup) {
        this.removeFromArray(this.unassignedByParGroup.get(task.parGroup), task);
      }
      task.assignedTo = workerId;
      // 记录此 Worker↔parGroup 关系，以便后续同组任务也有亲和性
      if (task.parGroup) {
        this.recordAffinity(workerId, task.parGroup);
      }
      this.assigned.push(task);
      return task;
    }
    return null;
  }

  /** 工作窃取 — 从已分配任务列表末尾 O(1) 取（跳过已被窃取的任务） */
  steal(workerId: string): TaskItem | null {
    // 从 assigned 末尾查找可窃取任务，跳过已窃取标记
    while (this.assigned.length > 0) {
      const target = this.assigned[this.assigned.length - 1]; // O(1)
      // 清理已窃取的死条目
      if (this.stolen.has(target.id)) {
        this.assigned.pop();
        continue;
      }
      // 需要至少 2 个任务才值得窃取（留一个给原 Worker）
      if (this.assigned.length < 2) return null;

      this.stolen.add(target.id);
      const originalWorker = target.assignedTo;
      target.assignedTo = workerId;
      // 窃取后也记录 parGroup 亲和性
      if (target.parGroup) {
        this.recordAffinity(workerId, target.parGroup);
      }
      // 通知原 Worker 任务已被窃取（实际实现中通过 IPC 发送 TASK_STOLEN 消息）
      // 此处简化：记录原 Worker 到 stolen 集合，原 Worker 下次 dispatchAll 跳过已窃取任务
      return target;
    }
    return null;
  }

  /** 标记任务完成，记录 Worker↔parGroup 亲和关系 */
  markCompleted(taskId: string, workerId?: string): void {
    const idx = this.assigned.findIndex(t => t.id === taskId);
    if (idx >= 0) {
      const [t] = this.assigned.splice(idx, 1);
      this.completed.set(t.id, t);
      // 任务完成后记录 Worker↔parGroup 关系，增强后续分配亲和性
      if (workerId && t.parGroup) {
        this.recordAffinity(workerId, t.parGroup);
      }
    }
  }

  hasPendingTasks(): boolean {
    return this.unassigned.length > 0; // O(1) — 替代原有的 queue.some()
  }

  pendingCount(): number {
    return this.unassigned.length; // O(1) — 替代原有的 queue.filter()
  }

  totalCount(): number {
    return this.unassigned.length + this.assigned.length + this.completed.size;
  }

  // ─── 私有方法 ────────────────────────────────────────────

  /** 二分插入 — 保持优先级排序 O(log n) 查找 + splice 插入
   *  排序规则: priority 降序，同 priority 按 createdAt 升序（FIFO） */
  private insertSorted(arr: TaskItem[], task: TaskItem): void {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const m = arr[mid];
      // m 优先级更高 或 (同优先级且 m 更早创建) → 插入点在 m 之后
      if (m.priority > task.priority || (m.priority === task.priority && m.createdAt <= task.createdAt)) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    arr.splice(lo, 0, task);
  }

  /** 从数组中移除指定任务（按 id 匹配） */
  private removeFromArray(arr: TaskItem[] | undefined, task: TaskItem): void {
    if (!arr) return;
    const idx = arr.findIndex(t => t.id === task.id);
    if (idx >= 0) arr.splice(idx, 1);
  }

  /** 获取或创建 parGroup 对应的未分配任务数组 */
  private getOrCreateGroupArray(group: string): TaskItem[] {
    let arr = this.unassignedByParGroup.get(group);
    if (!arr) {
      arr = [];
      this.unassignedByParGroup.set(group, arr);
    }
    return arr;
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

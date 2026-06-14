/**
 * 轻量级滑动窗口速率限制器 (Sliding Window Rate Limiter)
 *
 * 设计要点：
 * - 不引入 express-rate-limit 等外部依赖，手工实现
 * - 滑动窗口算法：每个 IP 独立计数，60 秒窗口内最多 30 次请求
 * - 内存 Map 存储，每 60 秒清理过期条目以控制内存
 * - 支持 X-Forwarded-For 头（反向代理场景）
 *
 * Express 中间件签名兼容 Express 4/5。
 */
import type { Request, Response, NextFunction } from 'express';

// ===== 配置常量 =====
const WINDOW_MS = 60_000;          // 窗口长度：60 秒
const MAX_REQUESTS = 30;           // 每窗口最大请求数
const CLEANUP_INTERVAL_MS = 60_000; // 过期条目清理间隔

// ===== 内部状态 =====
interface WindowEntry {
  /** 该窗口内请求的时间戳数组（仅保留未过期的） */
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

// ===== 辅助函数 =====

/**
 * 从请求中提取客户端标识 Key
 * 优先使用 X-Forwarded-For（反向代理场景），否则 fallback 到 req.ip
 */
function getClientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]!.trim();
  }
  return req.ip || 'unknown';
}

/**
 * 启动周期性清理定时器（仅首次调用时启动）
 */
function ensureCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const cutoff = now - WINDOW_MS;
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
    // store 为空时关闭定时器，节省资源
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);
  // 允许进程退出（不阻止事件循环）
  cleanupTimer.unref();
}

// ===== 公开 API =====

/**
 * 创建 Express 速率限制中间件
 */
export function rateLimitMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getClientKey(req);
    const now = Date.now();
    const cutoff = now - WINDOW_MS;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
      ensureCleanup();
    }

    // 滑动窗口：丢弃窗口外的时间戳
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

    if (entry.timestamps.length >= MAX_REQUESTS) {
      const oldestTs = entry.timestamps[0]!;
      const resetAfter = Math.ceil((oldestTs + WINDOW_MS - now) / 1000);
      res.setHeader('Retry-After', String(resetAfter));
      res.status(429).json({
        error: 'Too Many Requests',
        message: `请求频率超限：每 ${WINDOW_MS / 1000} 秒最多 ${MAX_REQUESTS} 次请求。`,
        retryAfterSeconds: resetAfter,
      });
      return;
    }

    entry.timestamps.push(now);
    next();
  };
}

/**
 * 机器资源检测器
 * 启动时完整检测 + 运行时轻量检测
 *
 * 性能优化 (C1+C4):
 *   - C1: Worker容量基于 totalMemoryMB 双重约束，避免 freeMemoryMB 波动导致容量剧烈变化
 *   - C4: runtimeCheck 水位线值在 detectResources() 时缓存为模块级变量，避免每次调用 loadConfig()
 */
import * as os from 'node:os';
import * as child_process from 'node:child_process';
import { loadConfig } from '../config/loader.js';

export interface ResourceProfile {
  physicalCores: number;
  logicalCores: number;
  totalMemoryMB: number;
  freeMemoryMB: number;
  recommendedMaxWorkers: number;
  warnings: string[];
  profile: 'high' | 'medium' | 'low' | 'minimal';
}

/**
 * 检测物理 CPU 核心数（区别于超线程产生的逻辑核心）
 *
 * Node.js os.cpus() 不直接暴露物理核心信息，需使用平台特定方法。
 * 策略：
 *   Windows  → WMIC CPU Get NumberOfCores
 *   Linux    → 读取 /proc/cpuinfo 的 cpu cores 字段
 *   macOS    → sysctl -n hw.physicalcpu
 *   兜底     → Math.max(1, floor(logicalCores / 2)) 假设超线程比例 2:1
 *
 * 注意：所有命令设置了 3 秒超时。平台检测异常时记录 warn 日志并回退到兜底策略。
 */
function detectPhysicalCores(logicalCores: number, warnings: string[]): number {
  try {
    switch (process.platform) {
      case 'win32': {
        // Windows: WMIC 输出类似 "NumberOfCores\r\n8\r\n8\r\n" (多路 CPU 有多行)
        const winOutput = child_process.execSync(
          'wmic CPU Get NumberOfCores',
          { encoding: 'utf-8', timeout: 3000 },
        );
        const winCores = winOutput
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => /^\d+$/.test(line))
          .map(Number);
        if (winCores.length > 0) {
          // 多路 CPU 场景下对所有物理 CPU 的核心数求和
          const total = winCores.reduce((a, b) => a + b, 0);
          if (total > 0 && total <= logicalCores) return total;
        }
        break;
      }

      case 'linux': {
        // Linux: /proc/cpuinfo 中 "cpu cores" 字段表示每个物理 CPU 的核心数
        // 在多路服务器上每路 CPU 的值相同，取第一个即可
        const cpuInfoOutput = child_process.execSync(
          'grep -m1 "cpu cores" /proc/cpuinfo',
          { encoding: 'utf-8', timeout: 3000 },
        );
        const coresMatch = cpuInfoOutput.match(/:\s*(\d+)/);
        if (coresMatch) {
          const cores = parseInt(coresMatch[1], 10);
          if (cores > 0 && cores <= logicalCores) return cores;
        }
        break;
      }

      case 'darwin': {
        // macOS: sysctl hw.physicalcpu 返回物理核心数
        const macOutput = child_process.execSync(
          'sysctl -n hw.physicalcpu',
          { encoding: 'utf-8', timeout: 3000 },
        );
        const macCores = parseInt(macOutput.trim(), 10);
        if (macCores > 0 && macCores <= logicalCores) return macCores;
        break;
      }
    }
  } catch (err: unknown) {
    // 平台检测失败时记录诊断信息，继续使用兜底策略
    console.warn(
      `[ResourceDetector] 物理核心检测失败 (${process.platform}):`,
      (err as Error)?.message || err,
    );
  }

  // 兜底：假设超线程比例 2:1（最常见的 Intel/AMD x86 SMT-2 配置）
  // 注意：对无超线程的 CPU（如部分 ARM64、老旧单核心、或关闭 HT 的系统）
  // 此估算会低估一半。但由于平台特定检测已尽力而为，此兜底值已足够保守：
  // 低估只会导致最多浪费 50% CPU，而不会引发 OOM 风险。
  // Workers 数量同时受 CPU 和内存双重约束，内存约束通常更先触发。
  warnings.push('物理核心检测回退到估算值');
  return Math.max(1, Math.floor(logicalCores / 2));
}

// C4 修复: 水位线值缓存 — 在 detectResources() 调用时填充，runtimeCheck 直接使用
let cachedLowWatermarkMB = 1024;
let cachedHighWatermarkMB = 2048;

export function detectResources(): ResourceProfile {
  const warnings: string[] = [];
  const logicalCores = os.cpus().length;

  // 通过平台特定方法检测物理核心数（warnings 数组传入以接收回退告警）
  const physicalCores = detectPhysicalCores(logicalCores, warnings);

  const totalMemoryMB = Math.floor(os.totalmem() / (1024 * 1024));
  const freeMemoryMB = Math.floor(os.freemem() / (1024 * 1024));

  if (freeMemoryMB < 2048) warnings.push('low memory: ' + freeMemoryMB + 'MB free');

  // Chromium 保守估算 800MB
  const chromiumEstimateMB = 800;

  // C1 修复: 双重约束 Worker 容量
  // 主约束 — 基于 totalMemoryMB 做保守估算，预留 2GB 给 OS，不受瞬时 freeMemoryMB 波动影响
  const usableMemoryMB = totalMemoryMB - 2048;
  const totalBasedLimit = Math.max(1, Math.floor(usableMemoryMB / chromiumEstimateMB));
  // 安全上限 — 基于当前 freeMemoryMB 的动态约束，防止在内存已高度占用时扩容
  const freeBasedLimit = Math.max(1, Math.floor((freeMemoryMB - 1024) / chromiumEstimateMB));
  // 取两者较小值: totalBasedLimit 提供稳定基线，freeBasedLimit 提供运行时安全边界
  const memLimit = Math.min(totalBasedLimit, freeBasedLimit);

  const cpuLimit = Math.max(1, physicalCores - 2);
  const recommendedMaxWorkers = Math.max(1, Math.min(cpuLimit, memLimit));

  let profile: ResourceProfile['profile'];
  if (recommendedMaxWorkers >= 12) profile = 'high';
  else if (recommendedMaxWorkers >= 6) profile = 'medium';
  else if (recommendedMaxWorkers >= 2) profile = 'low';
  else { profile = 'minimal'; warnings.push('degrading to serial mode'); }

  if (process.platform === 'win32') warnings.push('Windows: Chromium memory ~20% higher than Linux');

  // C4 修复: 缓存水位线值供 runtimeCheck 高频使用，避免每次调用 loadConfig()
  const config = loadConfig();
  cachedLowWatermarkMB = config.executor.worker_pool.resource_check.memory_low_watermark_mb;
  cachedHighWatermarkMB = config.executor.worker_pool.resource_check.memory_high_watermark_mb;

  return { physicalCores, logicalCores, totalMemoryMB, freeMemoryMB, recommendedMaxWorkers, warnings, profile };
}

export function runtimeCheck(activeWorkers: number): {
  canSpawnNew: boolean; shouldDrain: boolean; drainCount: number; reason?: string;
} {
  // C4 修复: 直接使用 detectResources() 时缓存的模块级变量，不再每次调用 loadConfig()
  const LOW = cachedLowWatermarkMB;
  const HIGH = cachedHighWatermarkMB;

  const freeMemoryMB = os.freemem() / (1024 * 1024);

  let canSpawnNew = true, shouldDrain = false, drainCount = 0;
  if (freeMemoryMB < LOW) {
    canSpawnNew = false;
    drainCount = Math.ceil((LOW - freeMemoryMB) / 800);
    shouldDrain = true;
  }
  return { canSpawnNew, shouldDrain, drainCount, reason: shouldDrain ? 'memory_low' : undefined };
}

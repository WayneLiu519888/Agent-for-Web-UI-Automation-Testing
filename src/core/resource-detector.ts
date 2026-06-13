/**
 * 机器资源检测器
 * 启动时完整检测 + 运行时轻量检测
 */
import * as os from 'node:os';

export interface ResourceProfile {
  physicalCores: number;
  logicalCores: number;
  totalMemoryMB: number;
  freeMemoryMB: number;
  recommendedMaxWorkers: number;
  warnings: string[];
  profile: 'high' | 'medium' | 'low' | 'minimal';
}

export function detectResources(): ResourceProfile {
  const warnings: string[] = [];
  const cpus = os.cpus();
  const logicalCores = cpus.length;

  // 物理核心近似
  const coreKeys = new Set<string>();
  for (const cpu of cpus) coreKeys.add(cpu.model + '::' + cpu.speed);
  const physicalCores = coreKeys.size || Math.max(1, logicalCores / 2);

  const totalMemoryMB = Math.floor(os.totalmem() / (1024 * 1024));
  const freeMemoryMB = Math.floor(os.freemem() / (1024 * 1024));

  if (freeMemoryMB < 2048) warnings.push('low memory: ' + freeMemoryMB + 'MB free');

  // Chromium 保守估算 800MB
  const chromiumEstimateMB = 800;
  const cpuLimit = Math.max(1, physicalCores - 2);
  const memLimit = Math.max(1, Math.floor((freeMemoryMB - 1024) / chromiumEstimateMB));
  const recommendedMaxWorkers = Math.max(1, Math.min(cpuLimit, memLimit));

  let profile: ResourceProfile['profile'];
  if (recommendedMaxWorkers >= 12) profile = 'high';
  else if (recommendedMaxWorkers >= 6) profile = 'medium';
  else if (recommendedMaxWorkers >= 2) profile = 'low';
  else { profile = 'minimal'; warnings.push('degrading to serial mode'); }

  if (process.platform === 'win32') warnings.push('Windows: Chromium memory ~20% higher than Linux');

  return { physicalCores, logicalCores, totalMemoryMB, freeMemoryMB, recommendedMaxWorkers, warnings, profile };
}

export function runtimeCheck(activeWorkers: number): {
  canSpawnNew: boolean; shouldDrain: boolean; drainCount: number; reason?: string;
} {
  const freeMemoryMB = os.freemem() / (1024 * 1024);
  const LOW = 1024, HIGH = 2048;

  let canSpawnNew = true, shouldDrain = false, drainCount = 0;
  if (freeMemoryMB < LOW) {
    canSpawnNew = false;
    drainCount = Math.ceil((LOW - freeMemoryMB) / 800);
    shouldDrain = true;
  }
  return { canSpawnNew, shouldDrain, drainCount, reason: shouldDrain ? 'memory_low' : undefined };
}

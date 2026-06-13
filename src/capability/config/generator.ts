/**
 * 项目组件配置生成器 — 生成 components.yaml + discovery_report.json
 */
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { ComponentDiscovery } from '../../types/interaction-events.js';

export interface DiscoveryReport {
  project: string;
  baseUrl: string;
  durationSec: number;
  totalPagesVisited: number;
  totalComponentsFound: number;
  knownComponents: Array<{ id: string; prefix: string | null; usage: number }>;
  newComponents: Array<{ id: string; prefix: string | null; tagName: string; role: string; usage: number; suggestedEvents: string[] }>;
  newPrefixes: string[];
  pages: Array<{ url: string; componentCount: number; newComponents: string[] }>;
  recommendations: string[];
}

export function generateReport(
  project: string,
  baseUrl: string,
  discoveries: ComponentDiscovery[],
  pages: Array<{ url: string; componentCount: number; newComponents: string[] }>,
  startTime: number,
): DiscoveryReport {
  const known = discoveries.filter(d => d.status === 'known');
  const newComps = discoveries.filter(d => d.status === 'pending_review');
  const prefixes = new Set<string>();
  for (const d of newComps) if (d.prefix) prefixes.add(d.prefix);

  return {
    project,
    baseUrl,
    durationSec: Math.floor((Date.now() - startTime) / 1000),
    totalPagesVisited: pages.length,
    totalComponentsFound: discoveries.length,
    knownComponents: known.map(d => ({ id: d.id, prefix: d.prefix, usage: d.usageCount })),
    newComponents: newComps.map(d => ({
      id: d.id, prefix: d.prefix, tagName: d.samples[0]?.tagName || '', role: d.samples[0]?.role || '',
      usage: d.usageCount, suggestedEvents: d.suggestedExtraEvents,
    })),
    newPrefixes: [...prefixes],
    pages,
    recommendations: newComps.length > 0
      ? ['请检查 pending_review 的组件并运行 /scout 完成后在 _overrides.yaml 中确认']
      : [],
  };
}

export function saveDiscoveryReport(report: DiscoveryReport, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'discovery_report.json');
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
  return filePath;
}

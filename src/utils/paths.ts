/**
 * 双层路径解析 — 企业覆盖优先，开源默认兜底
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const enterpriseRoot = process.env.ENTERPRISE_ROOT || path.join(process.cwd(), 'enterprise');

export function resolvePath(category: string, name: string): string {
  const ep = path.join(enterpriseRoot, category, name);
  if (fs.existsSync(ep)) return ep;
  return path.join(process.cwd(), category, name);
}

export function resolveDir(category: string): string {
  const ed = path.join(enterpriseRoot, category);
  if (fs.existsSync(ed)) return ed;
  return path.join(process.cwd(), category);
}

export function getEnterpriseRoot(): string { return enterpriseRoot; }

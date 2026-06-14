/**
 * YAML IO — Acc Tree 序列化写入
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { dump as yamlDump } from 'js-yaml';
import type { AccTreeDocument } from '../../types/yaml.js';

/** 文件写入错误 — 带路径信息，便于定位和重试 */
class FileWriteError extends Error {
  public readonly filePath: string;
  constructor(message: string, filePath: string) {
    super(message);
    this.name = 'FileWriteError';
    this.filePath = filePath;
  }
}

/**
 * 双层路径解析 — 企业覆盖优先，开源默认兜底
 */
const enterpriseRoot = process.env.ENTERPRISE_ROOT || path.join(process.cwd(), 'enterprise');

function resolveDir(category: string): string {
  const ed = path.join(enterpriseRoot, category);
  if (fs.existsSync(ed)) return ed;
  return path.join(process.cwd(), category);
}

/**
 * 将 AccTreeDocument 序列化为 YAML 并写入文件系统
 * @param doc - 增强版 Acc Tree 文档
 * @param outputDir - 输出根目录（默认 acc-trees）
 * @returns 写入的文件路径
 */
export function writeAccTree(doc: AccTreeDocument, outputDir?: string): string {
  try {
    const dir = outputDir || resolveDir('acc-trees');
    const host = new URL(doc.page.url).hostname;
    const hash = Buffer.from(doc.page.url).toString('base64url').slice(0, 12);
    const outDir = path.join(dir, host);
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, `${hash}.yaml`);
    const yaml = yamlDump(doc, { noRefs: true, lineWidth: 200 });
    fs.writeFileSync(filePath, yaml, 'utf8');
    return filePath;
  } catch (err: unknown) {
    const target = outputDir || resolveDir('acc-trees');
    throw new FileWriteError(
      `写入 AccTree 失败 (${doc?.page?.url}): ${(err as Error)?.message || String(err)}`,
      target,
    );
  }
}

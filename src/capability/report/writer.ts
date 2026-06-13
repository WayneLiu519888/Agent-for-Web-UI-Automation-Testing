/** 报告写入 — 测试报告 JSON 文件输出 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TestReport } from '../../types/yaml.js';
export function writeTestReport(report: TestReport, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const fp = path.join(outputDir, `report-${Date.now()}.json`);
  fs.writeFileSync(fp, JSON.stringify(report, null, 2), 'utf8');
  return fp;
}

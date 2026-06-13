/**
 * 报告聚合器 — 收集所有 Worker 结果 → 生成 TestReport
 */
import type { TestReport, CaseResult } from '../types/yaml.js';
import { writeTestReport } from './yaml-writer.js';

export class ReportAggregator {
  private results: CaseResult[] = [];
  private startTime: number = Date.now();
  private workerCount: number = 0;

  constructor(workerCount: number) { this.workerCount = workerCount; }

  addResult(result: CaseResult): void {
    this.results.push(result);
  }

  addResults(results: CaseResult[]): void {
    this.results.push(...results);
  }

  aggregate(outputDir: string): TestReport {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const memUsage = process.memoryUsage();

    const report: TestReport = {
      total: this.results.length,
      passed, failed, skipped,
      durationMs: Date.now() - this.startTime,
      workersUsed: this.workerCount,
      peakMemoryMb: Math.round(memUsage.heapUsed / (1024 * 1024)),
      results: this.results,
      startedAt: new Date(this.startTime).toISOString(),
      completedAt: new Date().toISOString(),
    };

    writeTestReport(report, outputDir);
    return report;
  }

  getRealtimeProgress(): { done: number; total: number; passed: number; failed: number } {
    return {
      done: this.results.length,
      total: this.results.length, // 需外部设置 totalExpected
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
    };
  }
}

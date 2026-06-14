/**
 * 自定义错误类型 — 用于可控的错误传播和诊断
 * 所有自定义错误继承自 Error，保留 name/stack 兼容性
 */

/** 配置加载错误 — 基础配置损坏时抛出，阻断启动 */
export class McpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpConfigError';
  }
}

/** 文件写入错误 — 带路径信息，便于定位和重试 */
export class FileWriteError extends Error {
  public readonly filePath: string;
  constructor(message: string, filePath: string) {
    super(message);
    this.name = 'FileWriteError';
    this.filePath = filePath;
  }
}

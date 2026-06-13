import type { ZodType } from 'zod';

/**
 * 工具暴露范围类型
 * - all:    在 Stdio 和 HTTP 两种传输模式下均可见
 * - stdio:  仅在 Stdio 传输模式下可见（内部/本地工具）
 * - http:   仅在 HTTP 传输模式下可见（面向外部客户端）
 */
export type ToolVisibility = 'all' | 'stdio' | 'http';

/**
 * 工具定义接口
 * 所有需要注册到 MCP Server 的工具都必须遵循此接口
 */
export interface ToolDefinition {
  /** 工具唯一名称（MCP tool name，客户端调用时使用的标识符） */
  name: string;
  /** 工具标题（面向人类的可读名称） */
  title: string;
  /** 工具描述（会暴露给 LLM，帮助模型理解工具用途） */
  description: string;
  /** Zod 输入参数 schema（与 MCP SDK 的 StandardSchemaWithJSON 兼容） */
  inputSchema: ZodType;
  /** 暴露范围 */
  visibility: ToolVisibility;
  /** 工具执行回调函数（匹配 MCP SDK 的 ToolCallback 签名） */
  handler: (args: unknown, extra?: unknown) => Promise<{ content: Array<{ type: string; text?: string; [key: string]: unknown }> }>;
}

/**
 * 传输类型
 */
export type TransportType = 'stdio' | 'http';

/** 传输类型 → 可见性白名单 */
export const VISIBILITY_MAP: Record<TransportType, ToolVisibility[]> = {
  stdio: ['all', 'stdio'],
  http: ['all', 'http'],
};

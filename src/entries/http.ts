#!/usr/bin/env node
/**
 * HTTP Streamable 传输入口
 *
 * 启动 Express + Streamable HTTP 服务器，供远程 MCP 客户端通过 HTTP 调用。
 * 注册 visibility 为 'all' 和 'http' 的工具。
 *
 * 环境变量：
 *   MCP_HOST      — 监听地址，默认 127.0.0.1（不直接暴露到公网）
 *   PORT          — 监听端口，默认 3000
 *   MCP_API_KEY   — 若设置，/mcp 端点要求 Bearer Token 认证
 *
 * 用法：
 *   node dist/entries/http.js
 *   MCP_HOST=0.0.0.0 MCP_API_KEY=xxx npx tsx src/entries/http.ts
 */

import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { createMcpServer } from '../server/factory.js';
import type { Request, Response, NextFunction } from 'express';

function authMiddleware(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== apiKey) {
      res.status(401).json({ error: 'Unauthorized — 需要有效的 Bearer Token' });
      return;
    }
    next();
  };
}

async function main() {
  const mcpServer = createMcpServer('http');
  const app = createMcpExpressApp();

  const apiKey = process.env.MCP_API_KEY;

  // MCP Streamable HTTP 端点
  // 若设置了 MCP_API_KEY，则附加 Bearer Token 认证中间件
  // 使用 stateless 模式：每次请求创建新的 transport 实例
  if (apiKey) {
    console.error('[MCP HTTP] 已启用 Bearer Token 认证');
    app.post('/mcp', authMiddleware(apiKey), async (req, res) => {
      const transport = new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await mcpServer.connect(transport);
      res.on('close', () => transport.close());
      await transport.handleRequest(req, res, req.body);
    });
  } else {
    console.error('[MCP HTTP] ⚠️  未设置 MCP_API_KEY，/mcp 端点无认证保护');
    app.post('/mcp', async (req, res) => {
      const transport = new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await mcpServer.connect(transport);
      res.on('close', () => transport.close());
      await transport.handleRequest(req, res, req.body);
    });
  }

  // 健康检查端点（无需认证）
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const host = process.env.MCP_HOST || '127.0.0.1';
  const port = parseInt(process.env.PORT || '3000', 10);

  app.listen(port, host, () => {
    console.error(`[MCP HTTP] 服务已启动 → http://${host}:${port}/mcp`);
    console.error(`[MCP HTTP] 健康检查 → http://${host}:${port}/health`);
  });
}

main().catch((err) => {
  console.error('[MCP HTTP] 启动失败:', err);
  process.exit(1);
});

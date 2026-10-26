import 'server-only';

import {
  runCoFounderAgentLoop,
  type OrchestrationStep,
  type OrchestrationOptions,
  type OrchestrationResult,
  type ChatHistoryMessage,
} from './orchestrator';
import { recordLLMTelemetry, classifyError } from './telemetry';

/**
 * ============================================================================
 * STREAMING SSE & REAL-TIME AGENTIC EVENT PROTOCOL (PHASE 6)
 * ============================================================================
 * Provides:
 * 1. Server-Sent Events (SSE) formatters and HTTP headers (`text/event-stream`).
 * 2. Real-time agentic execution events:
 *    - `start`: Session metadata & provider info
 *    - `tool_call_start`: Tool invocation notification
 *    - `tool_call_result`: Tool execution output and voice summary
 *    - `approval_required`: High-impact action paused for human review
 *    - `token`: Incremental content text tokens
 *    - `thought`: Intermediate agent reasoning
 *    - `agent_step`: Comprehensive step snapshot
 *    - `done`: Final response, execution statistics, and tokens
 *    - `error`: Structured failure containment
 * 3. Token-by-token micro-streaming engine for smooth UI rendering.
 * 4. Dual-mode support (streaming SSE response or structured fallback).
 * 5. Stream parser for client consumption and unit testing.
 */

export type SSEEventType =
  | 'start'
  | 'token'
  | 'thought'
  | 'tool_call_start'
  | 'tool_call_result'
  | 'approval_required'
  | 'agent_step'
  | 'done'
  | 'error';

export interface SSEStreamEvent<T = any> {
  event: SSEEventType;
  data: T;
  id?: string;
  timestamp?: number;
}

export interface SSEHeadersOptions {
  customHeaders?: Record<string, string>;
}

export interface SSEWriter {
  sendStart: (data: {
    provider?: string;
    model?: string;
    sessionId?: string;
    timestamp?: number;
  }) => void;
  sendToken: (token: string, index?: number) => void;
  sendThought: (thought: string) => void;
  sendToolCallStart: (data: {
    toolName: string;
    args: Record<string, any>;
    iteration: number;
  }) => void;
  sendToolCallResult: (data: {
    toolName: string;
    success: boolean;
    summary: string;
    data?: any;
    error?: string;
    iteration: number;
  }) => void;
  sendApprovalRequired: (data: {
    toolName: string;
    pendingApprovalId?: string;
    details?: any;
  }) => void;
  sendAgentStep: (step: OrchestrationStep) => void;
  sendDone: (data: {
    responseText: string;
    provider?: string;
    model?: string;
    iterations: number;
    toolCallsExecuted: number;
    pausedForApproval?: boolean;
    pendingApproval?: any;
  }) => void;
  sendError: (error: { message: string; code?: string; details?: any }) => void;
  sendRaw: (event: SSEEventType, data: any) => void;
  close: () => void;
}

export interface StreamingSessionOptions extends OrchestrationOptions {
  streamTokens?: boolean;
  tokenChunkSize?: number;
  tokenDelayMs?: number;
  sessionId?: string;
}

/**
 * Standard HTTP headers for Server-Sent Events (SSE).
 * Disables buffering across Nginx, Cloudflare, and CDN proxies.
 */
export function getSSEHeaders(
  options?: SSEHeadersOptions
): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform, no-store, must-revalidate',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    ...(options?.customHeaders || {}),
  };
}

/**
 * Formats a single SSE message conforming to the W3C EventSource standard:
 * event: <name>\n
 * id: <id>\n
 * data: <json>\n\n
 */
export function formatSSEMessage(
  event: SSEEventType,
  data: any,
  id?: string
): string {
  const parts: string[] = [];
  if (id) {
    parts.push(`id: ${id}`);
  }
  parts.push(`event: ${event}`);

  const payload = typeof data === 'string' ? data : JSON.stringify(data ?? {});
  parts.push(`data: ${payload}`);

  return parts.join('\n') + '\n\n';
}

/**
 * Creates a Web-Standard ReadableStream and a typed SSEWriter controller.
 */
export function createSSEStream(): {
  stream: ReadableStream<Uint8Array>;
  writer: SSEWriter;
  response: Response;
} {
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | null =
    null;
  let isClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
    cancel() {
      isClosed = true;
    },
  });

  const sendRaw = (event: SSEEventType, data: any) => {
    if (isClosed || !streamController) return;
    try {
      const message = formatSSEMessage(event, data, `${Date.now()}`);
      streamController.enqueue(encoder.encode(message));
    } catch {
      // Controller closed or stream cancelled
      isClosed = true;
    }
  };

  const close = () => {
    if (isClosed || !streamController) return;
    isClosed = true;
    try {
      streamController.close();
    } catch {
      // Already closed
    }
  };

  const writer: SSEWriter = {
    sendStart: (data) =>
      sendRaw('start', {
        ...data,
        timestamp: data.timestamp || Date.now(),
      }),
    sendToken: (token, index) =>
      sendRaw('token', {
        token,
        index: index ?? 0,
      }),
    sendThought: (thought) =>
      sendRaw('thought', {
        thought,
      }),
    sendToolCallStart: (data) =>
      sendRaw('tool_call_start', {
        ...data,
        timestamp: Date.now(),
      }),
    sendToolCallResult: (data) =>
      sendRaw('tool_call_result', {
        ...data,
        timestamp: Date.now(),
      }),
    sendApprovalRequired: (data) =>
      sendRaw('approval_required', {
        ...data,
        timestamp: Date.now(),
      }),
    sendAgentStep: (step) =>
      sendRaw('agent_step', {
        step,
        timestamp: Date.now(),
      }),
    sendDone: (data) =>
      sendRaw('done', {
        ...data,
        timestamp: Date.now(),
      }),
    sendError: (error) =>
      sendRaw('error', {
        ...error,
        timestamp: Date.now(),
      }),
    sendRaw,
    close,
  };

  const response = new Response(stream, {
    headers: getSSEHeaders(),
  });

  return { stream, writer, response };
}

/**
 * Splits text into tokens/words and emits them sequentially with optional micro-delay
 * to provide a smooth, natural conversational typing animation.
 */
export async function streamTextInChunks(
  text: string,
  onChunk: (chunk: string, index: number) => Promise<void> | void,
  options?: {
    chunkSize?: number;
    delayMs?: number;
  }
): Promise<void> {
  if (!text) return;

  const chunkSize = options?.chunkSize ?? 2; // Default ~2 words per chunk
  const delayMs = options?.delayMs ?? 10;

  // Split into words preserving whitespace
  const tokens = text.match(/\S+\s*/g) || [text];

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize).join('');
    await onChunk(chunk, Math.floor(i / chunkSize));

    if (delayMs > 0 && i + chunkSize < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Runs an autonomous agent reasoning loop and streams structured SSE events to the client.
 */
export async function runAgenticStreamingSession(
  messages: ChatHistoryMessage[],
  options: StreamingSessionOptions
): Promise<Response> {
  const { writer, response } = createSSEStream();

  // Run asynchronously without blocking HTTP response return
  (async () => {
    const sessionStart = Date.now();
    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    try {
      writer.sendStart({
        model: options.modelName || 'gemini-3.5-flash',
        sessionId: options.sessionId,
      });

      const agentResult = await runCoFounderAgentLoop(messages, {
        ...options,
        onStep: async (step: OrchestrationStep) => {
          // Stream step notifications
          writer.sendAgentStep(step);

          if (step.toolCalls && step.toolCalls.length > 0) {
            for (const tc of step.toolCalls) {
              writer.sendToolCallStart({
                toolName: tc.name,
                args: tc.args,
                iteration: step.iteration,
              });
            }
          }

          if (step.toolResults && step.toolResults.length > 0) {
            for (const tr of step.toolResults) {
              writer.sendToolCallResult({
                toolName: tr.toolName,
                success: tr.success,
                summary: tr.summaryForVoice,
                data: tr.data,
                error: tr.error,
                iteration: step.iteration,
              });
            }
          }

          if (step.requiresApproval) {
            writer.sendApprovalRequired({
              toolName: step.approvalDetails?.toolName || 'high_impact_action',
              pendingApprovalId: step.approvalDetails?.pendingApprovalId,
              details: step.approvalDetails,
            });
          }

          if (options.onStep) {
            await options.onStep(step);
          }
        },
      });

      if (!agentResult.success && agentResult.error) {
        writer.sendError({ message: agentResult.error });
        try {
          recordLLMTelemetry({
            traceId: options.sessionId || 'tr_stream',
            spanId: 'sp_stream',
            provider: (agentResult.provider as any) || 'gemini',
            model: agentResult.modelUsed || 'gemini-3.5-flash',
            channel: 'chat',
            promptTokens: Math.max(1, Math.round(lastUserMsg.length / 4)),
            completionTokens: 0,
            totalTokens: Math.max(1, Math.round(lastUserMsg.length / 4)),
            durationMs: Date.now() - sessionStart,
            success: false,
            errorCategory: classifyError(agentResult.error),
            errorMessage: agentResult.error,
          });
        } catch {}
      } else {
        // Stream text tokens if requested
        if (options.streamTokens !== false && agentResult.responseText) {
          await streamTextInChunks(
            agentResult.responseText,
            (chunk, idx) => {
              writer.sendToken(chunk, idx);
            },
            {
              chunkSize: options.tokenChunkSize ?? 2,
              delayMs: options.tokenDelayMs ?? 10,
            }
          );
        }

        writer.sendDone({
          responseText: agentResult.responseText,
          model: agentResult.modelUsed,
          provider: agentResult.provider,
          iterations: agentResult.iterations,
          toolCallsExecuted: agentResult.toolCallsExecuted,
          pausedForApproval: agentResult.pausedForApproval,
          pendingApproval: agentResult.pendingApproval,
        });

        // Non-blocking telemetry tracking (Phase 10)
        try {
          recordLLMTelemetry({
            traceId: options.sessionId || 'tr_stream',
            spanId: 'sp_stream',
            provider: (agentResult.provider as any) || 'gemini',
            model: agentResult.modelUsed || 'gemini-3.5-flash',
            channel: 'chat',
            promptTokens: Math.max(1, Math.round(lastUserMsg.length / 4)),
            completionTokens: Math.max(
              1,
              Math.round((agentResult.responseText?.length || 0) / 4)
            ),
            totalTokens: Math.max(
              2,
              Math.round(
                (lastUserMsg.length + (agentResult.responseText?.length || 0)) /
                  4
              )
            ),
            durationMs: Date.now() - sessionStart,
            success: true,
          });
        } catch {}
      }
    } catch (err: any) {
      writer.sendError({
        message: err?.message || 'Agentic streaming failed unexpectedly',
      });
      try {
        recordLLMTelemetry({
          traceId: options.sessionId || 'tr_stream',
          spanId: 'sp_stream',
          provider: 'fallback',
          model: options.modelName || 'gemini-3.5-flash',
          channel: 'chat',
          promptTokens: Math.max(1, Math.round(lastUserMsg.length / 4)),
          completionTokens: 0,
          totalTokens: Math.max(1, Math.round(lastUserMsg.length / 4)),
          durationMs: Date.now() - sessionStart,
          success: false,
          errorCategory: classifyError(err),
          errorMessage: err?.message,
        });
      } catch {}
    } finally {
      writer.close();
    }
  })();

  return response;
}

/**
 * Reusable SSE Parser for client-side processing, automated testing,
 * and gateway verification.
 */
export function parseSSEChunk(rawText: string): Array<SSEStreamEvent> {
  const events: Array<SSEStreamEvent> = [];
  if (!rawText) return events;

  const blocks = rawText.split('\n\n');

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventName: SSEEventType = 'token';
    let dataStr = '';
    let eventId: string | undefined;

    const lines = block.split('\n');
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim() as SSEEventType;
      } else if (line.startsWith('id:')) {
        eventId = line.slice(3).trim();
      } else if (line.startsWith('data:')) {
        dataStr = line.slice(5).trim();
      }
    }

    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        events.push({
          event: eventName,
          data: parsed,
          id: eventId,
        });
      } catch {
        // Plain string fallback
        events.push({
          event: eventName,
          data: dataStr,
          id: eventId,
        });
      }
    }
  }

  return events;
}

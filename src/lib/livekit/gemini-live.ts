import 'server-only';

/**
 * Gemini Live API Client & WebRTC Audio Orchestrator
 *
 * Provides bidirectional real-time audio and text streaming to the Gemini Multimodal Live API.
 * The Gemini API key remains strictly server-side.
 */

export interface GeminiLiveConfig {
  apiKey?: string;
  model?: string;
  voiceName?: 'Aoede' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';
  systemInstruction?: string;
  tools?: Array<{
    functionDeclarations: Array<{
      name: string;
      description: string;
      parameters?: Record<string, any>;
    }>;
  }>;
}

export interface GeminiLiveSessionEventHandlers {
  onAudioData?: (base64Pcm: string) => void;
  onTextDelta?: (text: string) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onToolCall?: (
    functionCalls: Array<{
      id: string;
      name: string;
      args: Record<string, any>;
    }>
  ) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export class GeminiLiveSession {
  private ws: any = null;
  private config: GeminiLiveConfig;
  private handlers: GeminiLiveSessionEventHandlers;
  private isConnected = false;

  constructor(
    config: GeminiLiveConfig = {},
    handlers: GeminiLiveSessionEventHandlers = {}
  ) {
    this.config = {
      apiKey:
        config.apiKey ||
        process.env.GEMINI_LIVE_API_KEY ||
        process.env.GEMINI_API_KEY,
      model: config.model || 'models/gemini-2.0-flash-exp',
      voiceName: config.voiceName || 'Aoede',
      systemInstruction: config.systemInstruction,
      tools: config.tools,
    };
    this.handlers = handlers;
  }

  /**
   * Connect to Gemini Multimodal Live API via WebSocket
   */
  async connect(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('GEMINI_LIVE_API_KEY is not configured on the server.');
    }

    const host = 'generativelanguage.googleapis.com';
    const path = `/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.config.apiKey}`;
    const wsUrl = `wss://${host}${path}`;

    // Use standard global WebSocket (built-in to Node 20+ and browser runtimes)
    const WebSocketClass =
      (globalThis as any).WebSocket ||
      ((await import('ws' as any)).default as any);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocketClass(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.sendInitialSetup();
          resolve();
        };

        this.ws.onmessage = (event: any) => {
          this.handleIncomingMessage(event.data);
        };

        this.ws.onerror = (err: any) => {
          const error = new Error(
            err?.message || 'Gemini Live WebSocket error'
          );
          this.handlers.onError?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.handlers.onClose?.();
        };
      } catch (err: any) {
        reject(err);
      }
    });
  }

  /**
   * Send the initial BidiGenerateContentSetup message
   */
  private sendInitialSetup() {
    const setupMessage: any = {
      setup: {
        model: this.config.model,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.config.voiceName,
              },
            },
          },
        },
      },
    };

    if (this.config.systemInstruction) {
      setupMessage.setup.systemInstruction = {
        parts: [{ text: this.config.systemInstruction }],
      };
    }

    if (this.config.tools && this.config.tools.length > 0) {
      setupMessage.setup.tools = this.config.tools;
    }

    this.sendJson(setupMessage);
  }

  /**
   * Send real-time microphone audio chunk to Gemini (PCM 16kHz or 24kHz, 16-bit little-endian)
   */
  sendRealtimeAudio(base64Pcm: string, mimeType = 'audio/pcm;rate=16000') {
    if (!this.isConnected) return;
    const msg = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType,
            data: base64Pcm,
          },
        ],
      },
    };
    this.sendJson(msg);
  }

  /**
   * Send text message turn to Gemini Live
   */
  sendTextMessage(text: string) {
    if (!this.isConnected) return;
    const msg = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };
    this.sendJson(msg);
  }

  /**
   * Send tool execution responses back to Gemini
   */
  sendToolResponse(
    responses: Array<{
      id: string;
      name: string;
      response: Record<string, any>;
    }>
  ) {
    if (!this.isConnected) return;
    const msg = {
      toolResponse: {
        functionResponses: responses.map((r) => ({
          response: r.response,
          id: r.id,
        })),
      },
    };
    this.sendJson(msg);
  }

  private sendJson(data: any) {
    if (
      (this.ws && this.ws.readyState === (WebSocket as any)?.OPEN) ||
      this.ws?.readyState === 1
    ) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Parse incoming messages from Gemini Live server
   */
  private handleIncomingMessage(rawData: any) {
    try {
      const dataStr =
        typeof rawData === 'string' ? rawData : rawData.toString('utf8');
      const message = JSON.parse(dataStr);

      // 1. Interruption notification
      if (message.serverContent?.interrupted) {
        this.handlers.onInterrupted?.();
      }

      // 2. Model audio parts & text parts
      const parts = message.serverContent?.modelTurn?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          this.handlers.onAudioData?.(part.inlineData.data);
        }
        if (part.text) {
          this.handlers.onTextDelta?.(part.text);
        }
      }

      // 3. Tool call requested by Gemini
      if (message.toolCall?.functionCalls) {
        this.handlers.onToolCall?.(message.toolCall.functionCalls);
      }

      // 4. Turn complete
      if (message.serverContent?.turnComplete) {
        this.handlers.onTurnComplete?.();
      }
    } catch (err: any) {
      this.handlers.onError?.(
        new Error(`Failed to parse Gemini Live message: ${err.message}`)
      );
    }
  }

  /**
   * Terminate the session cleanly
   */
  disconnect() {
    this.isConnected = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignored
      }
      this.ws = null;
    }
  }
}

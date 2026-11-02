// src/lib/ai/co-founder/workers/worker-chat-service.ts
//
// Dedicated 1:1 Conversation Service for Specialist AI Workers.
// Manages worker-specific persistent context, domain persona, and verified data retrieval.

import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WorkerId } from './types';
import { WorkerRegistry } from './registry';
import { ConversationRepository } from '../conversations/repository';

export interface WorkerChatResult {
  conversationId: string;
  response: string;
  workerId: WorkerId;
  workerName: string;
  timestamp: number;
}

const registry = new WorkerRegistry();

export async function handleWorkerDirectChat(
  userId: string,
  workerId: WorkerId,
  userMessage: string
): Promise<WorkerChatResult> {
  const worker = registry.getWorker(workerId);
  if (!worker) {
    throw new Error(`Worker with ID '${workerId}' not found in registry.`);
  }

  const def = worker.getDefinition();

  // 1. Resolve or create persistent direct conversation for this admin-worker pair
  const conversation =
    await ConversationRepository.getOrCreateWorkerConversation(
      userId,
      workerId
    );

  // 2. Persist incoming user message
  await ConversationRepository.appendMessage({
    conversationId: conversation.id,
    senderType: 'user',
    senderId: userId,
    workerId,
    content: userMessage,
    contentType: 'text',
  });

  // 3. Load recent messages for this worker thread only (strict context isolation)
  const { messages: threadHistory } =
    await ConversationRepository.getConversationWithMessages(
      conversation.id,
      userId,
      12
    );

  // 4. Construct worker domain system prompt
  const systemInstruction = `You are ${def.name} (${def.role}) at Ruhvi Jewellery (ruhvi.in).
Your Primary Objective: ${def.objective}
Core Responsibilities:
${def.responsibilities.map((r) => `- ${r}`).join('\n')}
Permission Scope: ${def.permissionScope.join(', ')}

Guidelines:
- Speak directly as this specialist. Be concise, highly analytical, and business-focused.
- Support English, Bengali (Bangla/Banglish), and Hindi naturally.
- When asked for operational insights, metrics, or recommendations, provide evidence-based analysis.
- If an action requires business execution or data mutation (e.g. price change, coupon creation, stock update), state what needs approval from the founder.
- Never pretend to execute actions without authorization.`;

  // 5. Build prompt history
  const historyText = threadHistory
    .slice(0, -1) // Exclude latest already persisted
    .map(
      (m) => `${m.senderType === 'user' ? 'Founder' : def.name}: ${m.content}`
    )
    .join('\n');

  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_LIVE_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
    generationConfig: {
      temperature: 0.2,
    },
  });

  const fullPrompt = historyText
    ? `Conversation History:\n${historyText}\n\nFounder: ${userMessage}\n\n${def.name}:`
    : `Founder: ${userMessage}\n\n${def.name}:`;

  const result = await model.generateContent(fullPrompt);
  const responseText =
    result.response.text()?.trim() ||
    'Task analyzed. How would you like to proceed?';

  // 6. Persist assistant worker response
  await ConversationRepository.appendMessage({
    conversationId: conversation.id,
    senderType: 'worker',
    workerId,
    content: responseText,
    contentType: 'text',
    metadata: {
      workerName: def.name,
      model: 'gemini-2.5-flash',
    },
  });

  return {
    conversationId: conversation.id,
    response: responseText,
    workerId,
    workerName: def.name,
    timestamp: Date.now(),
  };
}

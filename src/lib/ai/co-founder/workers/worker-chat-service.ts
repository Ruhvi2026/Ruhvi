// src/lib/ai/co-founder/workers/worker-chat-service.ts
//
// Dedicated 1:1 Conversation Service for Specialist AI Workers.
// Manages worker-specific persistent context, domain persona, and verified data retrieval.

import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WorkerId } from './types';
import { WorkerRegistry, resolveCanonicalWorkerId } from './registry';
import { ConversationRepository } from '../conversations/repository';

export interface WorkerChatResult {
  conversationId: string;
  response: string;
  workerId: WorkerId;
  workerName: string;
  timestamp: number;
}

export interface WorkerChatHistoryResult {
  conversationId: string;
  workerId: WorkerId;
  workerName: string;
  workerRole: string;
  objective: string;
  priority: string;
  responsibilities: string[];
  tools: string[];
  skills: string[];
  messages: Array<{
    id: string;
    sender: 'user' | 'worker';
    text: string;
    timestamp: number;
  }>;
}

const registry = new WorkerRegistry();

export async function handleWorkerDirectChat(
  userId: string,
  workerIdInput: WorkerId | string,
  userMessage: string
): Promise<WorkerChatResult> {
  const canonicalWorkerId =
    resolveCanonicalWorkerId(workerIdInput) || (workerIdInput as WorkerId);
  const worker = registry.getWorker(canonicalWorkerId);
  if (!worker) {
    throw new Error(`Worker with ID '${workerIdInput}' not found in registry.`);
  }

  const def = worker.getDefinition();

  // 1. Resolve or create persistent direct conversation for this admin-worker pair
  const conversation =
    await ConversationRepository.getOrCreateWorkerConversation(
      userId,
      canonicalWorkerId
    );

  // 2. Persist incoming user message
  await ConversationRepository.appendMessage({
    conversationId: conversation.id,
    senderType: 'user',
    senderId: userId,
    workerId: canonicalWorkerId,
    content: userMessage,
    contentType: 'text',
  });

  // 3. Load recent messages for this worker thread only (strict context isolation)
  const { messages: threadHistory } =
    await ConversationRepository.getConversationWithMessages(
      conversation.id,
      userId,
      16
    );

  // 4. Construct worker domain system prompt with full specialist contract
  const systemInstruction = `You are ${def.name} (${def.role}) at Ruhvi Jewellery (ruhvi.in).
Your Primary Objective: ${def.objective}

Domain Priority: ${def.priority}
Core Responsibilities:
${def.responsibilities.map((r) => `- ${r}`).join('\n')}

Allowed Tools & Domain Integrations:
${def.requiredTools.map((t) => `- ${t}`).join('\n')}

Required Skills:
${def.requiredSkills.map((s) => `- ${s}`).join('\n')}

Permission Scope: ${def.permissionScope.join(', ')}

Guidelines:
- Speak directly as this specialist. Be concise, highly analytical, and business-focused.
- Support English, Bengali (Bangla/Banglish), and Hindi naturally.
- When asked for operational insights, metrics, or recommendations, provide evidence-based analysis.
- If an action requires business execution or data mutation (e.g. price change, coupon creation, stock update, migration), outline what needs approval from the founder.
- Never pretend to execute mutating actions without explicit founder authorization.`;

  // 5. Build prompt history
  const historyText = threadHistory
    .slice(0, -1) // Exclude latest already persisted
    .map(
      (m) => `${m.senderType === 'user' ? 'Founder' : def.name}: ${m.content}`
    )
    .join('\n');

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_LIVE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_KEY;

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
    workerId: canonicalWorkerId,
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
    workerId: canonicalWorkerId,
    workerName: def.name,
    timestamp: Date.now(),
  };
}

export async function getWorkerDirectChatHistory(
  userId: string,
  workerIdInput: WorkerId | string
): Promise<WorkerChatHistoryResult> {
  const canonicalWorkerId =
    resolveCanonicalWorkerId(workerIdInput) || (workerIdInput as WorkerId);
  const worker = registry.getWorker(canonicalWorkerId);
  const def = worker ? worker.getDefinition() : null;

  const conversation =
    await ConversationRepository.getOrCreateWorkerConversation(
      userId,
      canonicalWorkerId
    );

  const { messages } = await ConversationRepository.getConversationWithMessages(
    conversation.id,
    userId,
    50
  );

  return {
    conversationId: conversation.id,
    workerId: canonicalWorkerId,
    workerName: def?.name || canonicalWorkerId,
    workerRole: def?.role || 'Specialist AI Worker',
    objective: def?.objective || '',
    priority: def?.priority || 'MEDIUM',
    responsibilities: def?.responsibilities || [],
    tools: def?.requiredTools || [],
    skills: def?.requiredSkills || [],
    messages: messages.map((m) => ({
      id: m.id,
      sender: (m.senderType === 'user' ? 'user' : 'worker') as
        'user' | 'worker',
      text: m.content,
      timestamp: new Date(m.createdAt).getTime(),
    })),
  };
}

import 'server-only';

import {
  CoWorkerDefinition,
  CoWorkerStructuredOutput,
  CoWorkerTaskInput,
  MarketingCoWorkerId,
  CreativeMediaResult,
  FlowVideoPrompt,
  VideoContinuityGuide,
  MultilingualVoiceoverScripts,
} from '../types';
import { isCoWorkerEnabled } from '../config';

export class CreativeMediaCoWorker {
  readonly id: MarketingCoWorkerId = 'marketing_creative_media';
  readonly name = 'Creative Media Co-worker';

  getDefinition(): CoWorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Creative Media Director & Video Production Orchestrator',
      objective:
        'Transform marketing strategy into production-ready creative assets: two-video continuous Flow/Veo prompts, image art direction, multilingual voiceovers (Bengali/Hindi/English), and Cloudinary media processing orchestration.',
      status: isCoWorkerEnabled(this.id) ? 'ENABLED' : 'DISABLED',
      skills: [
        'Creative strategy interpretation',
        'Ad creative concept development',
        'Image creative direction',
        'Video creative concept development',
        'Short-form video planning',
        'Social ad video planning',
        'Scene design',
        'Shot planning',
        'Camera direction',
        'Lighting direction',
        'Character consistency',
        'Product consistency',
        'Environment consistency',
        'Visual style consistency',
        'Video continuity planning',
        'Multi-clip continuity',
        'First-video → second-video transition planning',
        'Flow/Veo prompt generation',
        'Negative prompt/instruction generation',
        'Voice-over script generation',
        'Bengali voice-over preparation',
        'Hindi voice-over preparation',
        'English voice-over preparation',
        'TTS-ready script generation',
        'Subtitle preparation',
        'Audio timing planning',
        'FFmpeg processing requirements',
        'Media format planning',
        'Aspect-ratio planning',
        'Cloudinary asset management',
        'Final-video quality analysis',
        'Final-video marketing analysis',
        'Creative compliance checks',
        'Creative consistency validation',
        'Ad-platform creative requirements',
      ],
      tools: [
        'browse_website',
        'get_store_metrics',
      ],
      mcpPermissions: ['mcp_tools:read', 'mcp_tools:write'],
      isProductionOnly: false,
    };
  }

  async execute(input: CoWorkerTaskInput): Promise<CoWorkerStructuredOutput> {
    const timestamp = new Date().toISOString();
    const taskLower = input.task.toLowerCase();

    if (!isCoWorkerEnabled(this.id)) {
      return {
        coWorkerId: this.id,
        coWorkerName: this.name,
        status: 'DISABLED',
        success: false,
        findings: ['Creative Media Co-worker is currently disabled in configuration.'],
        evidence: [],
        problems: ['Cannot execute creative task on a disabled worker.'],
        opportunities: [],
        recommendations: ['Enable marketing_creative_media via config or admin dashboard.'],
        data: {},
        requiredApproval: false,
        executionStatus: 'disabled',
        executiveVoiceSummary: 'Creative Media co-worker is currently disabled.',
        timestamp,
      };
    }

    try {
      // 1. Extract context from previous strategy or direct task input
      const strategy = input.previousContext?.strategy;
      const productName =
        input.productName ||
        (taskLower.includes('choker')
          ? 'Handcrafted 22K Gold-Plated Choker'
          : taskLower.includes('earring')
          ? 'Royal Filigree 22K Gold-Plated Jhumkas'
          : 'Ruhvi Anti-Tarnish 22K Gold-Plated Signature Necklace');

      const isDiwali = taskLower.includes('diwali') || taskLower.includes('festive') || strategy?.campaignAngle?.includes('Festive');
      const isWedding = taskLower.includes('wedding') || taskLower.includes('bridal');

      const campaignTheme =
        strategy?.campaignAngle ||
        (isDiwali
          ? 'Diwali Radiance — Festive 22K Anti-Tarnish Elegance'
          : isWedding
          ? 'Royal Bridal Demi-Fine — Heritage Bengal Craft'
          : 'Everyday Luxury — Anti-Tarnish 22K Gold Plated Jewellery');

      const targetAudience =
        strategy?.targetAudience ||
        'Modern Indian women (22-38) seeking daily fine jewellery that never tarnishes or causes skin sensitivity.';

      // 2. Build Image Creative Direction
      const imagePrompt = {
        artStyle: 'Warm luxury editorial chiaroscuro, cinematic jewellery macro photography, Hasselblad 100mm lens',
        prompt: `High-end commercial macro photograph of ${productName} resting on a rich burgundy velvet unboxing cushion next to an Indian woman in a deep emerald raw silk blouse. Soft amber candlelight catches the mirror-polish 22K gold plating, highlighting intricate handcrafted Bengal filigree. Anti-tarnish e-coating sheen, ultra-sharp reflections, 8k resolution, Vogue India luxury editorial style.`,
        aspectRatio: '1:1 (Feed) / 9:16 (Story)',
      };

      // 3. Build Two-Video Continuity Flow (Google Flow / Veo Prompts)
      const continuityInstructions: VideoContinuityGuide = {
        sharedCharacterDescription:
          'Elegant Indian woman in her late 20s with glowing warm complexion, refined natural makeup, hair in a graceful half-updo with soft curtain bangs.',
        sharedClothingDescription:
          'Deep emerald green raw silk boat-neck blouse with subtle gold thread embroidery on the collarbone seam.',
        sharedProductDescription: `${productName}, mirror-finish authentic 22K yellow gold plating, delicate handcrafted Bengal filigree patterns, signature anti-tarnish protective gloss.`,
        sharedEnvironmentDescription:
          'Sunlit modern Kolkata loft apartment, warm morning golden hour light streaming through sheer linen curtains, minimalist teakwood vanity table with crystal mirror.',
        sharedLighting:
          'Soft directional warm golden hour sunlight (3200K) with subtle rim lighting separating character from background.',
        sharedColorGrade:
          'Warm cinematic film tone, rich emerald greens, luminous golden highlights, deep soft shadows, clean skin tones.',
        video1EndingAction:
          'Camera slowly dollies in as woman clips the necklace at the back of her neck, smiling into the mirror and turning 45 degrees towards the lens at second 7.',
        video2StartingAction:
          'Seamless match cut from exact 45-degree angle: woman takes a step into the morning sunlight, lightly touching the necklace with a spray of perfume to demonstrate anti-tarnish durability.',
        transitionInstruction:
          'Maintain exact subject screen position, facial expression, and lighting continuity between Clip 1 frame end and Clip 2 frame start.',
      };

      const video1Prompt: FlowVideoPrompt = {
        id: 'video_1',
        title: 'Clip 1: Morning Vanity & The Gold Dressing Hook (0-7s)',
        durationSeconds: 7,
        aspectRatio: '9:16',
        visualPrompt: `Cinematic 9:16 vertical video. ${continuityInstructions.sharedCharacterDescription} Sitting at a sunlit wooden vanity table, holding ${continuityInstructions.sharedProductDescription}. She fastens the necklace clasp around her neck. The authentic 22K gold sparkles brilliantly under warm directional sunlight. She turns slightly towards the camera with a confident, radiant smile. ${continuityInstructions.sharedLighting}. Cinematic shallow depth of field, slow smooth push-in camera movement, 4K, 24fps.`,
        cameraMovement: 'Slow steady push-in from medium close-up to necklace collarbone macro',
        lightingInstruction: continuityInstructions.sharedLighting,
        characterDescription: continuityInstructions.sharedCharacterDescription,
        productPlacement: 'Worn on neck, centered in frame, glinting under natural sunlight',
        environmentDescription: continuityInstructions.sharedEnvironmentDescription,
        negativePrompt:
          'blurry, low resolution, cheap brass look, flickering, sudden costume change, jittery camera, distorted hands',
        continuityAnchor: continuityInstructions.video1EndingAction,
      };

      const video2Prompt: FlowVideoPrompt = {
        id: 'video_2',
        title: 'Clip 2: The Wear Test & Express Unboxing Guarantee (7-15s)',
        durationSeconds: 8,
        aspectRatio: '9:16',
        visualPrompt: `Cinematic 9:16 vertical video continuing directly from Clip 1. Exact match cut: ${continuityInstructions.sharedCharacterDescription} wearing ${continuityInstructions.sharedProductDescription}. She spritzes luxury perfume near her collarbone — the jewellery maintains its brilliant 22K mirror luster without fading. Cut to sleek overhead macro of the Ruhvi signature velvet unboxing box, 6-month warranty card, and Blue Dart express delivery package. ${continuityInstructions.sharedLighting}. Smooth pan down to product box, 4K, 24fps.`,
        cameraMovement: 'Smooth eye-level tracking panning down to elegant table unboxing layout',
        lightingInstruction: continuityInstructions.sharedLighting,
        characterDescription: continuityInstructions.sharedCharacterDescription,
        productPlacement: 'Shown on collarbone during perfume spray, then displayed in unboxing box',
        environmentDescription: continuityInstructions.sharedEnvironmentDescription,
        negativePrompt:
          'inconsistent face, different clothing color, tarnish stains, dull yellow paint look, noisy background',
        continuityAnchor: continuityInstructions.video2StartingAction,
      };

      // 4. Multilingual Voiceover Scripts (Bengali, Hindi, English)
      const voiceover: MultilingualVoiceoverScripts = {
        bengali: {
          script:
            'আপনার প্রতিদিনের সোনার গয়না কি কিছুদিন পরেই রঙ হারিয়ে ফেলে? রূহভির খাঁটি ২২ ক্যারেট গোল্ড প্লেটেড কালেকশন — অ্যান্টি-টার্নিশ কোটিং আর ৬ মাসের কালার গ্যারান্টি। আজই অর্ডার করুন ruhvi.in-এ।',
          phoneticBanglish:
            'Aapnar protidiner shonar goyna ki kichudin porei rong hariye fele? Ruhvi-r khati 22 karat gold plated collection — anti-tarnish coating aar 6 masher color guarantee. Aaj-e order korun ruhvi.in-e.',
          estimatedDurationSeconds: 14,
        },
        hindi: {
          script:
            'क्या आपकी रोज़मर्रा की ज्वेलरी कुछ ही हफ़्तों में काली पड़ जाती है? पेश है रूहवी 22K गोल्ड प्लेटेड ज्वेलरी — 6 महीने की एंटी-टार्निश वारंटी के साथ। फ्री ब्लू डार्ट डिलीवरी ruhvi.in पर।',
          phoneticHinglish:
            'Kya aapki rozmarra ki jewellery kuch hi hafton me kaali pad jaati hai? Pesh hai Ruhvi 22K gold plated jewellery — 6 mahine ki anti-tarnish warranty ke saath. Free Blue Dart delivery ruhvi.in par.',
          estimatedDurationSeconds: 13,
        },
        english: {
          script:
            'Tired of daily jewellery that tarnishes after three wears? Ruhvi brings authentic 22K gold plating with nano e-coating and our 6-month color guarantee. Free express Blue Dart delivery across India at ruhvi.in.',
          estimatedDurationSeconds: 13,
        },
        ttsReadyCleanText:
          'Tired of daily jewellery that tarnishes after three wears? Ruhvi brings authentic 22K gold plating with nano e-coating and our 6-month color guarantee. Free express Blue Dart delivery across India at ruhvi.in.',
      };

      const creativeResult: CreativeMediaResult = {
        campaignTheme,
        targetAudience,
        imagePrompt,
        twoVideoFlow: {
          video1Prompt,
          video2Prompt,
          continuityInstructions,
        },
        voiceover,
        uploadStatus: {
          video1Ready: false,
          video2Ready: false,
          processingDispatched: false,
          finalVideoReady: false,
        },
        executiveVoiceSummary:
          `Creative Media ready for "${campaignTheme}". I've generated two connected Flow/Veo video prompts with matched lighting and character continuity, plus Bengali, Hindi, and English voiceover scripts. Upload controls are ready for Video 1 and Video 2 files.`,
      };

      const findings = [
        `Generated 2-clip continuous video storyboards for Google Flow/Veo (Clip 1: 7s Dressing Hook, Clip 2: 8s Wear Test & Unboxing).`,
        `Explicit continuity anchor rules defined across character, clothing, lighting, and camera angle.`,
        `Multilingual voiceover scripts prepared for Bengali (বাংলা / Banglish), Hindi, and English with clean TTS formatting.`,
      ];

      const recommendations = [
        `Generate Video 1 and Video 2 in Google Flow/Veo using the provided prompts.`,
        `Upload both clips via the Creative Media studio UI to automatically trigger Cloudinary ingestion and n8n FFmpeg merging.`,
      ];

      return {
        coWorkerId: this.id,
        coWorkerName: this.name,
        status: 'ENABLED',
        success: true,
        findings,
        evidence: [
          'Video prompts explicitly maintain character, lighting, and product consistency across both clips.',
          'Voiceover scripts calibrated to exact 13-14 second duration for 15s Instagram Reel pacing.',
        ],
        problems: [],
        opportunities: [
          'Leverage manual Google Flow credits for zero-API cost rendering while automating merging via n8n.',
        ],
        recommendations,
        data: {
          creativeMedia: creativeResult,
        },
        requiredApproval: false,
        executionStatus: 'not_required',
        executiveVoiceSummary: creativeResult.executiveVoiceSummary,
        timestamp,
      };
    } catch (err: any) {
      return {
        coWorkerId: this.id,
        coWorkerName: this.name,
        status: 'ENABLED',
        success: false,
        findings: ['Creative Media worker encountered an unexpected error.'],
        evidence: [err.message],
        problems: [`Failed to generate creative media prompts: ${err.message}`],
        opportunities: [],
        recommendations: ['Retry creative media generation with refreshed strategy context.'],
        data: {},
        requiredApproval: false,
        executionStatus: 'failed',
        executiveVoiceSummary: `Creative Media co-worker encountered an issue: ${err.message}`,
        timestamp,
        error: err.message,
      };
    }
  }
}

export const creativeMediaCoWorker = new CreativeMediaCoWorker();

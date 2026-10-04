jest.mock('server-only', () => ({}));

import { CreativeMediaCoWorker } from '../marketing/co-workers/creative-media';

describe('Marketing Co-Worker 2: Creative Media Co-Worker', () => {
  let creative: CreativeMediaCoWorker;

  beforeEach(() => {
    creative = new CreativeMediaCoWorker();
  });

  it('declares identity, enabled status, and all 35 skills', () => {
    expect(creative.id).toBe('marketing_creative_media');
    expect(creative.name).toBe('Creative Media Co-worker');

    const def = creative.getDefinition();
    expect(def.status).toBe('ENABLED');
    expect(def.skills.length).toBe(35);
    expect(def.skills).toContain(
      'Two-video continuity planning'.toLowerCase()
        ? 'Video continuity planning'
        : 'Video continuity planning'
    );
    expect(def.skills).toContain('Flow/Veo prompt generation');
    expect(def.skills).toContain('Bengali voice-over preparation');
    expect(def.skills).toContain('Cloudinary asset management');
    expect(def.skills).toContain('Final-video quality analysis');
  });

  it('generates two connected Google Flow / Veo video prompts with explicit continuity anchor', async () => {
    const output = await creative.execute({
      task: 'Generate 15s video ad prompts for 22K Gold Plated Choker',
      productName: '22K Gold Plated Choker',
    });

    expect(output.coWorkerId).toBe('marketing_creative_media');
    expect(output.success).toBe(true);

    const media = output.data.creativeMedia!;
    expect(media).toBeDefined();

    // Verify 2-Video prompts exist
    const { video1Prompt, video2Prompt, continuityInstructions } =
      media.twoVideoFlow;
    expect(video1Prompt.id).toBe('video_1');
    expect(video1Prompt.durationSeconds).toBe(7);
    expect(video1Prompt.aspectRatio).toBe('9:16');
    expect(video1Prompt.visualPrompt).toContain('gold');
    expect(video1Prompt.continuityAnchor).toBeTruthy();

    expect(video2Prompt.id).toBe('video_2');
    expect(video2Prompt.durationSeconds).toBe(8);
    expect(video2Prompt.aspectRatio).toBe('9:16');
    expect(video2Prompt.visualPrompt).toContain('Clip 1');
    expect(video2Prompt.continuityAnchor).toBeTruthy();

    // Verify shared continuity guidelines
    expect(continuityInstructions.sharedCharacterDescription).toBeTruthy();
    expect(continuityInstructions.sharedClothingDescription).toContain(
      'emerald'
    );
    expect(continuityInstructions.sharedLighting).toContain('sunlight');
    expect(continuityInstructions.transitionInstruction).toBeTruthy();
  });

  it('generates multilingual voiceovers for Bengali, Hindi, and English with clean TTS text', async () => {
    const output = await creative.execute({
      task: 'Create multilingual voiceovers for Royal Filigree Jhumkas',
    });

    const vo = output.data.creativeMedia!.voiceover;
    expect(vo).toBeDefined();

    // Bengali
    expect(vo.bengali.script).toContain('রূহভি');
    expect(vo.bengali.phoneticBanglish).toContain('Ruhvi');
    expect(vo.bengali.estimatedDurationSeconds).toBeLessThanOrEqual(15);

    // Hindi
    expect(vo.hindi.script).toContain('रूहवी');
    expect(vo.hindi.phoneticHinglish).toContain('Ruhvi');

    // English & TTS
    expect(vo.english.script).toContain('Ruhvi');
    expect(vo.ttsReadyCleanText).toBeTruthy();
  });
});

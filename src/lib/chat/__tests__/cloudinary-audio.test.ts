import {
  uploadAudioVoiceNote,
  destroyAudioVoiceNote,
  deleteAudioVoiceNote,
  purgeExpiredVoiceNotes,
} from '../cloudinary-audio';
import {
  VOICE_NOTE_RETENTION_DAYS,
  VOICE_NOTE_RETENTION_MS,
  isVoiceNoteExpired,
  calculateVoiceNoteExpiry,
} from '../voice-types';
import { v2 as cloudinary } from 'cloudinary';
import { getServiceClient } from '@/lib/supabase/service';

jest.mock('server-only', () => ({}));

jest.mock('cloudinary', () => {
  const uploadStreamMock = jest.fn((options, callback) => {
    return {
      end: jest.fn((buffer) => {
        callback(null, {
          public_id: 'ruhvi/chat_voice_notes/test_public_id_123',
          secure_url:
            'https://res.cloudinary.com/test/video/upload/v1/note.webm',
          duration: 12.5,
          bytes: 45000,
        });
      }),
    };
  });

  const destroyMock = jest.fn().mockResolvedValue({ result: 'ok' });

  const searchMock = {
    expression: jest.fn().mockReturnThis(),
    max_results: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ resources: [] }),
  };

  return {
    v2: {
      config: jest.fn(),
      uploader: {
        upload_stream: uploadStreamMock,
        destroy: destroyMock,
      },
      search: searchMock,
    },
  };
});

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

describe('Cloudinary Audio Voice Notes & 45-Day Lifecycle', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('45-Day Retention Math & Expiry Helpers', () => {
    it('enforces exactly 45 days retention policy', () => {
      expect(VOICE_NOTE_RETENTION_DAYS).toBe(45);
      expect(VOICE_NOTE_RETENTION_MS).toBe(45 * 24 * 60 * 60 * 1000);
    });

    it('accurately identifies expired vs active voice notes', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const futureDate = new Date(Date.now() + 1000000).toISOString();

      expect(isVoiceNoteExpired(pastDate)).toBe(true);
      expect(isVoiceNoteExpired(futureDate)).toBe(false);
    });

    it('calculates future expiry 45 days ahead', () => {
      const baseTime = new Date('2026-01-01T00:00:00.000Z');
      const expiry = calculateVoiceNoteExpiry(baseTime);

      const diffDays =
        (expiry.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(45);
    });
  });

  describe('uploadAudioVoiceNote', () => {
    it('uploads audio as resource_type video with 45-day retention tags', async () => {
      const buffer = Buffer.from('mock-audio-bytes');
      const res = await uploadAudioVoiceNote(buffer, {
        conversationId: 'conv_123',
        senderId: 'user_456',
        durationSeconds: 12.5,
      });

      expect(res.publicId).toBe('ruhvi/chat_voice_notes/test_public_id_123');
      expect(res.url).toContain('https://res.cloudinary.com');
      expect(res.durationSeconds).toBe(12.5);

      const uploadStreamMock = cloudinary.uploader.upload_stream as jest.Mock;
      expect(uploadStreamMock).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'ruhvi/chat_voice_notes',
          resource_type: 'video', // Audio files reside under video resource_type in Cloudinary
          tags: expect.arrayContaining(['voice_note', 'auto_purge_45d']),
        }),
        expect.any(Function)
      );
    });
  });

  describe('destroyAudioVoiceNote & alias deleteAudioVoiceNote', () => {
    it('destroys asset with resource_type video and invalidates cache', async () => {
      const ok = await destroyAudioVoiceNote('test_public_id_123');
      expect(ok).toBe(true);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'test_public_id_123',
        {
          resource_type: 'video',
          invalidate: true,
        }
      );
    });

    it('deleteAudioVoiceNote alias works identically', async () => {
      const ok = await deleteAudioVoiceNote('test_public_id_123');
      expect(ok).toBe(true);
    });
  });

  describe('purgeExpiredVoiceNotes (Automated Cron Job Engine)', () => {
    it('fetches expired notes, destroys them on Cloudinary, and updates DB status to expired', async () => {
      const mockExpiredNotes = [
        {
          id: 'vn_row_1',
          cloudinary_public_id: 'ruhvi/chat_voice_notes/old_audio_1',
          conversation_id: 'conv_1',
          expires_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'vn_row_2',
          cloudinary_public_id: 'ruhvi/chat_voice_notes/old_audio_2',
          conversation_id: 'conv_2',
          expires_at: '2026-01-02T00:00:00.000Z',
        },
      ];

      mockSupabase.limit.mockResolvedValueOnce({
        data: mockExpiredNotes,
        error: null,
      });

      mockSupabase.eq.mockReturnThis();

      const result = await purgeExpiredVoiceNotes(100);

      expect(result.success).toBe(true);
      expect(result.checkedCount).toBe(2);
      expect(result.purgedCount).toBe(2);
      expect(result.purgedPublicIds).toEqual([
        'ruhvi/chat_voice_notes/old_audio_1',
        'ruhvi/chat_voice_notes/old_audio_2',
      ]);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'expired',
          deleted_at: expect.any(String),
        })
      );
    });

    it('handles zero expired records gracefully', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await purgeExpiredVoiceNotes(50);
      expect(result.success).toBe(true);
      expect(result.checkedCount).toBe(0);
      expect(result.purgedCount).toBe(0);
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });
  });
});

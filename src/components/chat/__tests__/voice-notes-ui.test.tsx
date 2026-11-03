import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VoiceNotePlayer } from '../VoiceNotePlayer';
import { VoiceNoteRecorder } from '../VoiceNoteRecorder';
import { SpeechToTextButton } from '../SpeechToTextButton';

describe('Voice Notes UI Components (Phase 14 Regression Verification)', () => {
  describe('VoiceNotePlayer', () => {
    it('renders active audio player with controls and playback speed toggle', () => {
      const html = renderToStaticMarkup(
        <VoiceNotePlayer
          src="https://res.cloudinary.com/demo/video/upload/sample_note.webm"
          duration={15}
          status="active"
        />
      );

      expect(html).toContain('1x'); // Speed toggle
      expect(html).toContain('0:15'); // Duration badge
      expect(html).not.toContain('Voice note expired');
    });

    it('renders expired audio notice when status is expired (45-day retention)', () => {
      const html = renderToStaticMarkup(
        <VoiceNotePlayer src="" duration={20} status="expired" />
      );

      expect(html).toContain(
        'Voice note expired and deleted (45-day retention policy)'
      );
    });
  });

  describe('VoiceNoteRecorder', () => {
    it('renders discard control and status container when mounted', () => {
      const html = renderToStaticMarkup(
        <VoiceNoteRecorder onSend={jest.fn()} onCancel={jest.fn()} />
      );

      expect(html).toContain('title="Discard voice note"');
    });
  });

  describe('SpeechToTextButton', () => {
    it('renders dictation button with text badge and tooltip', () => {
      const html = renderToStaticMarkup(
        <SpeechToTextButton onTranscript={jest.fn()} />
      );

      expect(html).toContain(
        'Dictate message (Speech to Text - Bengali, Hindi, English)'
      );
      expect(html).toContain('>T</span>'); // 'T' badge
    });
  });
});

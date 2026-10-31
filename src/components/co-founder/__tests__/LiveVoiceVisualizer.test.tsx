import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LiveVoiceVisualizer,
  VoiceConnectionState,
} from '../LiveVoiceVisualizer';

describe('LiveVoiceVisualizer Component Verification (Phase 44)', () => {
  const defaultProps = {
    state: 'idle' as VoiceConnectionState,
    isMuted: false,
    onToggleMute: jest.fn(),
    onDisconnect: jest.fn(),
    onStart: jest.fn(),
  };

  describe('1. Real LiveKit WebRTC State Rendering', () => {
    it('renders WebRTC Voice Active badge when connected via LiveKit (isFallback = false)', () => {
      const html = renderToStaticMarkup(
        <LiveVoiceVisualizer
          {...defaultProps}
          state="listening"
          roomName="co-founder-room-12345"
          isFallback={false}
        />
      );

      // Verify that WebRTC Voice Active badge is present
      expect(html).toContain('WebRTC Voice Active');
      expect(html).not.toContain('Web Speech Fallback');
      expect(html).not.toContain('[Fallback Mode: Browser Speech]');
      expect(html).toContain('co-founder-room');
    });
  });

  describe('2. Fallback Mode Labeling and Protection (Mandatory Phase 44 Invariant)', () => {
    it('visibly labels fallback mode and NEVER represents it as real live WebRTC audio', () => {
      const html = renderToStaticMarkup(
        <LiveVoiceVisualizer
          {...defaultProps}
          state="listening"
          isFallback={true}
          fallbackReason="LiveKit Cloud connection unavailable"
        />
      );

      // Invariant: Fallback must be visibly labelled
      expect(html).toContain('Web Speech Fallback (LiveKit Disconnected)');
      expect(html).toContain('[Fallback Mode: Browser Speech]');
      expect(html).toContain('Listening (Fallback Mode)...');

      // Invariant: Never represent fallback as real WebRTC live audio
      expect(html).not.toContain('WebRTC Voice Active');
    });

    it('displays speaking state with explicit Browser Voice fallback indicator', () => {
      const html = renderToStaticMarkup(
        <LiveVoiceVisualizer
          {...defaultProps}
          state="speaking"
          isFallback={true}
          fallbackReason="Credentials missing"
        />
      );

      expect(html).toContain('Co-Founder Speaking (Browser Voice)...');
      expect(html).toContain('Web Speech Fallback (LiveKit Disconnected)');
      expect(html).not.toContain('WebRTC Voice Active');
    });
  });

  describe('3. Error State and Microphone Permission Feedback', () => {
    it('renders descriptive error banner when microphone permission is denied', () => {
      const errorMsg =
        'Microphone access denied. Please allow microphone permissions in your browser to speak with the AI Co-Founder.';

      const html = renderToStaticMarkup(
        <LiveVoiceVisualizer
          {...defaultProps}
          state="error"
          errorMessage={errorMsg}
        />
      );

      expect(html).toContain('data-testid="voice-error-message"');
      expect(html).toContain(errorMsg);
    });

    it('renders device not found error when no audio input is detected', () => {
      const errorMsg =
        'No microphone detected. Please connect an audio input device to use voice mode.';

      const html = renderToStaticMarkup(
        <LiveVoiceVisualizer
          {...defaultProps}
          state="error"
          errorMessage={errorMsg}
        />
      );

      expect(html).toContain(errorMsg);
    });
  });
});

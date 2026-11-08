import { securityIntelligenceWorker } from '../worker-security-intelligence';
import { inspectFilePayload } from '../../../../security/file-inspector';

jest.mock('server-only', () => ({}));

describe('Security Intelligence Worker & File Inspector', () => {
  describe('1. Worker Definition Integrity', () => {
    it('has canonical ID, CRITICAL priority, and system worker flag', () => {
      const def = securityIntelligenceWorker.getDefinition();
      expect(def.id).toBe('worker_security_intelligence');
      expect(def.priority).toBe('CRITICAL');
      expect(def.isSystemWorker).toBe(true);
      expect(def.name).toBe('Security Intelligence Worker');
      expect(def.responsibilities.length).toBeGreaterThanOrEqual(5);
    });

    it('defines required security permission scopes', () => {
      const def = securityIntelligenceWorker.getDefinition();
      expect(def.permissionScope).toContain('security:read');
      expect(def.permissionScope).toContain('security:quarantine');
      expect(def.permissionScope).toContain('security:rate_limit');
      expect(def.permissionScope).toContain('audit:read');
    });
  });

  describe('2. In-House File Magic-Byte & Malware Inspector', () => {
    it('verifies valid JPEG binary buffer as safe', async () => {
      const jpegBuffer = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const result = await inspectFilePayload(
        'necklace.jpg',
        'image/jpeg',
        jpegBuffer
      );
      expect(result.safe).toBe(true);
      expect(result.detectedMime).toBe('image/jpeg');
      expect(result.sha256).toBeTruthy();
    });

    it('verifies valid PNG binary buffer as safe', async () => {
      const pngBuffer = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]);
      const result = await inspectFilePayload(
        'ring.png',
        'image/png',
        pngBuffer
      );
      expect(result.safe).toBe(true);
      expect(result.detectedMime).toBe('image/png');
    });

    it('rejects forbidden executable file extensions', async () => {
      const dummyBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      const result = await inspectFilePayload(
        'exploit.php',
        'application/x-php',
        dummyBuffer
      );
      expect(result.safe).toBe(false);
      expect(result.threat).toBe('malicious_executable_extension');
    });

    it('rejects double-extension masquerade attacks (e.g. image.php.jpg)', async () => {
      const dummyBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      const result = await inspectFilePayload(
        'photo.php.jpg',
        'image/jpeg',
        dummyBuffer
      );
      expect(result.safe).toBe(false);
      expect(result.threat).toBe('malicious_executable_extension');
    });

    it('detects MIME type spoofing (e.g. PDF declared as JPEG)', async () => {
      const pdfBuffer = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35,
      ]);
      const result = await inspectFilePayload(
        'fake.jpg',
        'image/jpeg',
        pdfBuffer
      );
      expect(result.safe).toBe(false);
      expect(result.threat).toBe('mime_type_spoofing');
    });

    it('detects XSS and malicious script tags in SVG images', async () => {
      const svgText =
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
      const svgBuffer = new TextEncoder().encode(svgText);
      const result = await inspectFilePayload(
        'badge.svg',
        'image/svg+xml',
        svgBuffer
      );
      expect(result.safe).toBe(false);
      expect(result.threat).toBe('embedded_script_payload');
    });

    it('detects embedded PHP polyglot payload inside binary image headers', async () => {
      const polyglotText = '\xFF\xD8\xFF\xE0<?php phpinfo(); ?>';
      const polyglotBuffer = new Uint8Array(polyglotText.length);
      for (let i = 0; i < polyglotText.length; i++) {
        polyglotBuffer[i] = polyglotText.charCodeAt(i);
      }
      const result = await inspectFilePayload(
        'avatar.jpg',
        'image/jpeg',
        polyglotBuffer
      );
      expect(result.safe).toBe(false);
      expect(result.threat).toBe('polyglot_payload');
    });
  });

  describe('3. Execution & Autonomous Containment Logic', () => {
    it('executes general security posture evaluation', async () => {
      const output = await securityIntelligenceWorker.execute({
        task: 'Run complete security defense audit across Cloudflare edge and databases',
      });
      expect(output.workerId).toBe('worker_security_intelligence');
      expect(output.findings.length).toBeGreaterThan(0);
      expect(output.executionStatus).toBe('executed');
      expect(output.requiredApproval).toBe(false);
    });

    it('handles incident investigation and proposes reversible containment', async () => {
      const output = await securityIntelligenceWorker.execute({
        task: 'Investigate brute force attack spike on admin login endpoint',
        parameters: { ip: '198.51.100.42', incidentType: 'auth_brute_force' },
      });
      expect(output.findings).toEqual(
        expect.arrayContaining([expect.stringContaining('198.51.100.42')])
      );
      expect(output.executionStatus).toBe('pending_approval');
      expect(output.requiredApproval).toBe(true);
      expect(output.verification).toContain('recorded_only');
      expect(output.expectedImpact).toContain('throttled');
    });

    it('quarantines unsafe file upload during task execution', async () => {
      const maliciousBuffer = new Uint8Array([0x4d, 0x5a, 0x90]); // MZ executable header
      const output = await securityIntelligenceWorker.execute({
        task: 'Inspect file upload from customer design portal',
        parameters: {
          filename: 'custom_ring.exe',
          mime: 'application/octet-stream',
          fileBuffer: maliciousBuffer,
        },
      });
      expect(output.requiredApproval).toBe(true);
      expect(output.requiredAction).toBe('quarantine_file');
      expect(output.executionStatus).toBe('pending_approval');
    });

    it('fails closed when fileBuffer is missing in parameters (SEC-P0-004)', async () => {
      const output = await securityIntelligenceWorker.execute({
        task: 'Inspect file upload without buffer payload',
        parameters: {
          filename: 'missing.jpg',
          mime: 'image/jpeg',
        },
      });
      expect(output.executionStatus).toBe('failed');
      expect(output.requiredAction).toBe('reject_upload');
      expect(output.problems[0]).toContain(
        'Cannot verify file safety without payload bytes'
      );
    });

    it('rejects perimeter containment on loopback and private IPs (SEC-P1-005, SEC-08)', async () => {
      const privateIps = [
        '127.0.0.1',
        '10.254.0.1',
        '172.20.5.10',
        '172.31.255.1',
        '192.168.1.1',
        '169.254.169.254',
        '100.64.0.1',
        '::1',
        'fc00::1',
      ];
      for (const ip of privateIps) {
        const output = await securityIntelligenceWorker.execute({
          task: `Investigate suspicious activity from IP ${ip}`,
          parameters: { ip, incidentType: 'test_private_subnet' },
        });
        expect(output.executionStatus).toBe('failed');
        expect(output.requiredAction).toBe('reject_containment');
        expect(output.findings[1]).toContain(
          'internal loopback or private subnet'
        );
      }
    });

    it('aborts investigation when no target IP is provided (SEC-P1-005)', async () => {
      const output = await securityIntelligenceWorker.execute({
        task: 'Investigate attack without target IP',
        parameters: {},
      });
      expect(output.executionStatus).toBe('failed');
      expect(output.requiredAction).toBe('insufficient_evidence');
    });
  });
});

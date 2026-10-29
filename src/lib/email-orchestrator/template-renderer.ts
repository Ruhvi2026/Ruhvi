import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars/dist/handlebars.js';

const templateCache = new Map<string, (data: any) => string>();

// Register standard currency & formatting helpers
try {
  Handlebars.registerHelper('formatCurrency', (amount: number) => {
    if (typeof amount !== 'number') return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  });

  Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
} catch {
  // Ignore if already registered
}

export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export class TemplateRenderer {
  static getCompiledTemplate(fileName: string): ((data: any) => string) | null {
    if (templateCache.has(fileName)) {
      return templateCache.get(fileName)!;
    }

    try {
      const filePath = path.join(process.cwd(), 'Resend_Templates', fileName);
      if (!fs.existsSync(filePath)) {
        console.warn(`[TemplateRenderer] Template file not found: ${filePath}`);
        return null;
      }
      const source = fs.readFileSync(filePath, 'utf-8');
      const compiled = Handlebars.compile(source);
      templateCache.set(fileName, compiled);
      return compiled;
    } catch (error) {
      console.error(
        `[TemplateRenderer] Failed to load template ${fileName}:`,
        error
      );
      return null;
    }
  }

  static render(
    templateFileNameOrContent: string,
    variables: Record<string, any> = {}
  ): { html: string; text: string } {
    if (variables.rawHtml) {
      const html = variables.rawHtml;
      return { html, text: htmlToPlainText(html) };
    }

    if (
      templateFileNameOrContent.includes('<div') ||
      templateFileNameOrContent.includes('<html') ||
      templateFileNameOrContent.includes('<p')
    ) {
      return {
        html: templateFileNameOrContent,
        text: htmlToPlainText(templateFileNameOrContent),
      };
    }

    const compiled = TemplateRenderer.getCompiledTemplate(
      templateFileNameOrContent
    );
    if (!compiled) {
      const fallbackHtml = variables.message
        ? `<p>${variables.message}</p>`
        : templateFileNameOrContent;
      return {
        html: fallbackHtml,
        text: htmlToPlainText(fallbackHtml),
      };
    }

    const html = compiled(variables);
    const text = htmlToPlainText(html);
    return { html, text };
  }
}

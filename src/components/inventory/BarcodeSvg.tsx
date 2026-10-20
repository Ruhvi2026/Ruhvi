'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export interface BarcodeSvgProps {
  value: string;
  width?: number; // width of a single bar in px
  height?: number; // height of barcode in px
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  textMargin?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * High-precision vector SVG Barcode Component.
 * Encodes strings into Code 128 format with crisp rendering at any print DPI.
 */
export function BarcodeSvg({
  value,
  width = 1.5,
  height = 35,
  displayValue = true,
  fontSize = 11,
  margin = 2,
  textMargin = 2,
  className,
  style,
}: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          font: 'monospace',
          margin,
          textMargin,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        console.warn('BarcodeSvg rendering error for value:', value, err);
      }
    }
  }, [value, width, height, displayValue, fontSize, margin, textMargin]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{
        maxWidth: '100%',
        height: 'auto',
        display: 'block',
        ...style,
      }}
    />
  );
}

/**
 * Generate a standalone pure SVG HTML string for print documents.
 * Can be safely embedded inside print iframes without React runtime.
 */
export function generateBarcodeSvgHtml(
  value: string,
  options?: {
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    margin?: number;
  }
): string {
  if (typeof document === 'undefined') return '';
  try {
    const svgNode = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    JsBarcode(svgNode, value, {
      format: 'CODE128',
      width: options?.width ?? 1.5,
      height: options?.height ?? 35,
      displayValue: options?.displayValue ?? true,
      fontSize: options?.fontSize ?? 11,
      font: 'monospace',
      margin: options?.margin ?? 2,
      background: 'transparent',
      lineColor: '#000000',
    });
    return svgNode.outerHTML;
  } catch (err) {
    console.error('Failed to generate barcode SVG string:', err);
    return `<div style="font-family:monospace;font-size:12px;text-align:center;">${value}</div>`;
  }
}

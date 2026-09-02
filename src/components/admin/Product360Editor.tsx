'use client';

import React, { useState, useEffect } from 'react';
import { Product360Set, Product360Frame } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { uploadProductImage } from '@/lib/imageService';

interface Product360EditorProps {
  productId: string;
}

export function Product360Editor({ productId }: Product360EditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [setId, setSetId] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [frames, setFrames] = useState<Product360Frame[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    async function load360Data() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('product_360_sets')
          .select('*')
          .eq('product_id', productId)
          .single();

        if (data) {
          setSetId(data.id);
          setEnabled(data.enabled);
          setFrames(data.frames || []);
        }
      } catch (e) {
        // Not found is fine
      } finally {
        setLoading(false);
      }
    }
    load360Data();
  }, [productId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Sort files by name to maintain order
    const fileArray = Array.from(files).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    if (fileArray.length < 8) {
      setError('Please select at least 8 frames for a smooth 360 experience.');
      return;
    }
    if (fileArray.length > 72) {
      setError('Maximum supported frames is 72.');
      return;
    }

    setError('');
    setSaving(true);
    setUploadProgress(0);

    try {
      const uploadedFrames: Product360Frame[] = [];
      let i = 0;
      for (const file of fileArray) {
        const result = await uploadProductImage(file);
        uploadedFrames.push({
          index: i,
          url: result.secure_url,
          publicId: result.public_id,
          alt: `360 Frame ${i}`,
        });
        i++;
        setUploadProgress(Math.round((i / fileArray.length) * 100));
      }

      setFrames(uploadedFrames);
      setEnabled(true);
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const handleSave = async () => {
    if (enabled && frames.length === 0) {
      setError('You must upload frames if 360 view is enabled.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const supabase = createClient();

      const payload = {
        product_id: productId,
        enabled,
        frame_count: frames.length,
        frames: frames,
      };

      let result;
      if (setId) {
        result = await supabase
          .from('product_360_sets')
          .update(payload)
          .eq('id', setId);
      } else {
        result = await supabase.from('product_360_sets').insert([payload]);
      }

      if (result.error) throw result.error;

      alert('360° settings saved successfully.');
    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!setId) {
      setFrames([]);
      setEnabled(false);
      return;
    }

    if (
      confirm(
        'Are you sure you want to completely remove 360 view data for this product?'
      )
    ) {
      setSaving(true);
      try {
        const supabase = createClient();
        await supabase.from('product_360_sets').delete().eq('id', setId);
        setFrames([]);
        setEnabled(false);
        setSetId(null);
        alert('360 view removed.');
      } catch (err: any) {
        setError(`Failed to remove: ${err.message}`);
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading)
    return <div className="text-sm text-stone-500">Loading 360° data...</div>;

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:p-6">
      <h3 className="text-lg font-bold text-stone-800">360° Product View</h3>

      <div className="mb-4 flex items-center space-x-2">
        <input
          type="checkbox"
          id="enable360"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded border-stone-300 text-amber-900 focus:ring-amber-500"
        />
        <label
          htmlFor="enable360"
          className="text-sm font-semibold text-stone-700"
        >
          Enable 360° view on product page
        </label>
      </div>

      <div className="border-t border-stone-200 pt-4">
        <h4 className="mb-2 text-sm font-semibold text-stone-800">
          Frames Sequence
        </h4>

        {frames.length > 0 ? (
          <div className="space-y-4">
            <p className="text-xs text-stone-600">
              <strong>{frames.length} frames</strong> currently configured.
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {frames.map((frame, idx) => (
                <img
                  key={idx}
                  src={frame.url}
                  alt={`Frame ${idx}`}
                  className="h-16 w-16 rounded border border-stone-300 bg-white object-cover"
                />
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving}
                className="text-xs font-semibold text-red-600 hover:text-red-800"
              >
                Remove 360° View
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-stone-600">
              Upload a sequence of images (24-72 frames recommended) to create a
              360° view. Ensure files are named sequentially (e.g. frame-00.jpg,
              frame-01.jpg).
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              disabled={saving}
              className="text-xs text-stone-700"
            />
          </div>
        )}

        {saving && uploadProgress > 0 && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded bg-stone-200">
            <div
              className="h-full bg-amber-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 border-t border-stone-200 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {saving && uploadProgress === 0
              ? 'Saving...'
              : 'Save 360° Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

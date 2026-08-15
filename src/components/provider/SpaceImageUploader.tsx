'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';

import Button from '@/components/ui/Button';

interface SpaceImageUploaderProps {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

const MAX_DEFAULT_IMAGES = 10;

export default function SpaceImageUploader({
  images,
  onChange,
  maxImages = MAX_DEFAULT_IMAGES,
}: SpaceImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingSlots = Math.max(maxImages - images.length, 0);

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    const slots = remainingSlots;
    const filesToUpload = files.slice(0, slots);

    if (filesToUpload.length === 0) {
      setError(`You can upload up to ${maxImages} images.`);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/uploads/space-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Upload failed');
        }

        const data = await response.json();
        if (data?.url) {
          uploadedUrls.push(data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls]);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (url: string) => {
    onChange(images.filter((image) => image !== url));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Space Photos</h3>
          <p className="text-xs text-white/60">
            Upload up to {maxImages} high-quality photos to showcase your parking space.
          </p>
        </div>
        <span className="text-xs text-white/60">{images.length}/{maxImages}</span>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || images.length >= maxImages}
        >
          {isUploading ? 'Uploading...' : 'Upload Photos'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={handleFileSelection}
        />
        <span className="text-xs text-white/60">Max size 5MB each</span>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {images.map((url) => (
          <div key={url} className="relative group">
            <Image
              src={url}
              alt="Space photo"
              width={320}
              height={200}
              className="h-40 w-full object-cover rounded-lg border border-white/10"
            />
            <button
              type="button"
              onClick={() => handleRemove(url)}
              className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export type ContentMedia = {
  media_id: string;
  alt: string;
  caption?: string;
};

export type ParagraphBlock = {
  id: string;
  type: 'paragraph';
  data: {
    text: string;
  };
};

export type HeadingBlock = {
  id: string;
  type: 'heading';
  data: {
    text: string;
    level: 2 | 3 | 4;
  };
};

export type ImageBlock = {
  id: string;
  type: 'image';
  data: ContentMedia & {
    alignment: 'center' | 'wide';
    crop?: boolean;
    crop_ratio?: number;
    crop_x?: number;
    crop_y?: number;
    width?: number;
  };
};

export type GalleryBlock = {
  id: string;
  type: 'gallery';
  data: {
    layout: 'grid';
    columns: 2 | 3 | 4;
    images: ContentMedia[];
  };
};

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | GalleryBlock;

export type ContentDocument = {
  version: 1;
  blocks: ContentBlock[];
};

export type ParseContentOptions = {
  allowPendingMedia?: boolean;
};

const MAX_BLOCKS = 100;
const MAX_TEXT_LENGTH = 20_000;
const MAX_ALT_LENGTH = 500;
const MAX_CAPTION_LENGTH = 1_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function documentFromLegacy(content?: string | null): ContentDocument {
  const text = content?.trim() ?? '';

  return {
    version: 1,
    blocks: text
      ? [
          {
            id: 'legacy-content',
            type: 'paragraph',
            data: { text },
          },
        ]
      : [],
  };
}

export function normalizeContentDocument(
  value: unknown,
  fallbackContent?: string | null,
  options: ParseContentOptions = {}
): ContentDocument {
  return parseContentDocument(value, options) ?? documentFromLegacy(fallbackContent);
}

export function parseContentDocument(
  value: unknown,
  options: ParseContentOptions = {}
): ContentDocument | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.blocks)) {
    return null;
  }

  if (value.blocks.length > MAX_BLOCKS) {
    return null;
  }

  const blocks: ContentBlock[] = [];
  const blockIds = new Set<string>();

  for (const candidate of value.blocks) {
    const block = parseBlock(candidate, options);

    if (!block || blockIds.has(block.id)) {
      return null;
    }

    blockIds.add(block.id);
    blocks.push(block);
  }

  return { version: 1, blocks };
}

export function plainTextFromDocument(document: ContentDocument): string {
  const parts: string[] = [];

  for (const block of document.blocks) {
    if (block.type === 'paragraph' || block.type === 'heading') {
      if (block.data.text.trim()) parts.push(block.data.text.trim());
      continue;
    }

    if (block.type === 'image') {
      const label = block.data.caption?.trim() || block.data.alt.trim();
      if (label) parts.push(label);
      continue;
    }

    for (const image of block.data.images) {
      const label = image.caption?.trim() || image.alt.trim();
      if (label) parts.push(label);
    }
  }

  return parts.join('\n\n').trim();
}

export function replacePendingMediaIds(
  document: ContentDocument,
  replacements: ReadonlyMap<string, string>
): ContentDocument | null {
  const blocks = document.blocks.map((block): ContentBlock => {
    if (block.type === 'image') {
      return {
        ...block,
        data: {
          ...block.data,
          media_id: replacements.get(block.data.media_id) ?? block.data.media_id,
        },
      };
    }

    if (block.type === 'gallery') {
      return {
        ...block,
        data: {
          ...block.data,
          images: block.data.images.map((image) => ({
            ...image,
            media_id: replacements.get(image.media_id) ?? image.media_id,
          })),
        },
      };
    }

    return block;
  });

  return parseContentDocument({ version: 1, blocks });
}

export function referencedMediaIds(document: ContentDocument): string[] {
  const ids: string[] = [];

  for (const block of document.blocks) {
    if (block.type === 'image') {
      ids.push(block.data.media_id);
    } else if (block.type === 'gallery') {
      ids.push(...block.data.images.map((image) => image.media_id));
    }
  }

  return [...new Set(ids)];
}

function parseBlock(
  value: unknown,
  options: ParseContentOptions
): ContentBlock | null {
  if (!isRecord(value) || !isBlockId(value.id) || !isRecord(value.data)) {
    return null;
  }

  if (value.type === 'paragraph') {
    const text = parseText(value.data.text, MAX_TEXT_LENGTH);
    return text === null || !text.trim()
      ? null
      : { id: value.id, type: 'paragraph', data: { text } };
  }

  if (value.type === 'heading') {
    const text = parseText(value.data.text, 500);
    const level = value.data.level;

    if (
      text === null ||
      !text.trim() ||
      (level !== 2 && level !== 3 && level !== 4)
    ) {
      return null;
    }

    return { id: value.id, type: 'heading', data: { text, level } };
  }

  if (value.type === 'image') {
    const media = parseMedia(value.data, options);
    const alignment = value.data.alignment ?? 'wide';
    const crop = value.data.crop ?? false;
    const cropRatio = value.data.crop_ratio ?? 4 / 3;
    const cropX = value.data.crop_x ?? 50;
    const cropY = value.data.crop_y ?? 50;
    const width = value.data.width ?? undefined;

    if (
      !media ||
      (alignment !== 'center' && alignment !== 'wide') ||
      typeof crop !== 'boolean' ||
      typeof cropRatio !== 'number' ||
      !Number.isFinite(cropRatio) ||
      cropRatio < 0.1 ||
      cropRatio > 10 ||
      typeof cropX !== 'number' ||
      !Number.isFinite(cropX) ||
      cropX < 0 ||
      cropX > 100 ||
      typeof cropY !== 'number' ||
      !Number.isFinite(cropY) ||
      cropY < 0 ||
      cropY > 100 ||
      (width !== undefined &&
        (typeof width !== 'number' || width < 25 || width > 100))
    ) {
      return null;
    }

    return {
      id: value.id,
      type: 'image',
      data: {
        ...media,
        alignment,
        ...(crop
          ? {
              crop: true,
              crop_ratio: Math.round(cropRatio * 1000) / 1000,
              crop_x: Math.round(cropX),
              crop_y: Math.round(cropY),
            }
          : {}),
        ...(width === undefined ? {} : { width: Math.round(width) }),
      },
    };
  }

  if (value.type === 'gallery') {
    const columns = value.data.columns;
    const imagesValue = value.data.images;

    if (
      value.data.layout !== 'grid' ||
      (columns !== 2 && columns !== 3 && columns !== 4) ||
      !Array.isArray(imagesValue) ||
      imagesValue.length < 2 ||
      imagesValue.length > 20
    ) {
      return null;
    }

    const images = imagesValue.map((image) => parseMedia(image, options));

    if (images.some((image) => image === null)) {
      return null;
    }

    return {
      id: value.id,
      type: 'gallery',
      data: {
        layout: 'grid',
        columns,
        images: images as ContentMedia[],
      },
    };
  }

  return null;
}

function parseMedia(
  value: unknown,
  options: ParseContentOptions
): ContentMedia | null {
  if (!isRecord(value) || !isMediaId(value.media_id, options.allowPendingMedia)) {
    return null;
  }

  const alt = parseText(value.alt ?? '', MAX_ALT_LENGTH);
  const caption = parseOptionalText(value.caption, MAX_CAPTION_LENGTH);

  if (alt === null || caption === null) {
    return null;
  }

  return {
    media_id: value.media_id,
    alt,
    ...(caption === undefined ? {} : { caption }),
  };
}

function isMediaId(value: unknown, allowPending = false): value is string {
  return (
    typeof value === 'string' &&
    (UUID_PATTERN.test(value) ||
      (allowPending && /^pending:[a-zA-Z0-9._:-]{1,160}$/.test(value)))
  );
}

function isBlockId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 100;
}

function parseText(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.length <= maxLength ? value : null;
}

function parseOptionalText(
  value: unknown,
  maxLength: number
): string | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  return parseText(value, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

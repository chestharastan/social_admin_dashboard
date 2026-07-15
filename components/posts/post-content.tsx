import {
  normalizeContentDocument,
  type ContentDocument,
} from '@/app/dashboard/post-content';

type RenderImage = {
  id: string;
  image_url: string;
};

export function PostContent({
  content,
  contentJson,
  images,
}: {
  content?: string | null;
  contentJson?: ContentDocument | null;
  images: RenderImage[];
}) {
  const document = normalizeContentDocument(contentJson, content);
  const imageById = new Map(images.map((image) => [image.id, image]));

  if (!document.blocks.length) {
    return (
      <p className="text-[15px] leading-7 text-[var(--muted)] sm:text-base">
        No content has been added to this post.
      </p>
    );
  }

  return (
    <div className="article-post-body mx-auto max-w-[680px]">
      {document.blocks.map((block) => {
        if (block.type === 'paragraph') {
          return (
            <p key={block.id}>
              {block.data.text}
            </p>
          );
        }

        if (block.type === 'heading') {
          if (block.data.level === 2) {
            return (
              <h2 key={block.id}>
                {block.data.text}
              </h2>
            );
          }

          if (block.data.level === 3) {
            return (
              <h3 key={block.id}>
                {block.data.text}
              </h3>
            );
          }

          return (
            <h4 key={block.id}>
              {block.data.text}
            </h4>
          );
        }

        if (block.type === 'image') {
          const image = imageById.get(block.data.media_id);
          return (
            <figure
              className="mx-auto"
              key={block.id}
              style={
                block.data.width === undefined
                  ? undefined
                  : { width: `${block.data.width}%` }
              }
            >
              <ArticleImage
                alt={block.data.alt}
                crop={Boolean(block.data.crop)}
                cropRatio={block.data.crop_ratio}
                cropX={block.data.crop_x}
                cropY={block.data.crop_y}
                imageUrl={image?.image_url}
              />
            </figure>
          );
        }

        const gridClass =
          block.data.columns === 4
            ? 'sm:grid-cols-2 xl:grid-cols-4'
            : block.data.columns === 3
              ? 'sm:grid-cols-2 lg:grid-cols-3'
              : 'sm:grid-cols-2';

        return (
          <div
            className={`article-post-gallery grid gap-3 ${gridClass}`}
            key={block.id}
          >
            {block.data.images.map((media, index) => {
              const image = imageById.get(media.media_id);
              return (
                <figure key={`${media.media_id}-${index}`}>
                  <ArticleImage alt={media.alt} imageUrl={image?.image_url} />
                </figure>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ArticleImage({
  alt,
  crop = false,
  cropRatio = 4 / 3,
  cropX = 50,
  cropY = 50,
  imageUrl,
}: {
  alt: string;
  crop?: boolean;
  cropRatio?: number;
  cropX?: number;
  cropY?: number;
  imageUrl?: string;
}) {
  if (!imageUrl) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-muted)] px-5 text-center text-sm text-[var(--muted)]">
        Referenced image is unavailable
      </div>
    );
  }

  return (
    // Dynamic storage URLs are already validated by the backend. Keeping the
    // natural dimensions avoids the cropped-card look in long-form articles.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt || 'Article image'}
      className={`w-full rounded-[0.85rem] bg-[var(--surface-muted)] ${
        crop ? 'aspect-[4/3] object-cover' : 'h-auto'
      }`}
      decoding="async"
      loading="lazy"
      src={imageUrl}
      style={
        crop
          ? {
              aspectRatio: cropRatio,
              objectPosition: `${cropX}% ${cropY}%`,
            }
          : undefined
      }
    />
  );
}

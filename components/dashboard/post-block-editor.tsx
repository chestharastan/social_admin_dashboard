'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  normalizeContentDocument,
  plainTextFromDocument,
  type ContentBlock,
  type ContentDocument,
} from '@/app/dashboard/post-content';

export type BlockEditorImage = {
  id: string;
  imageUrl: string;
  label: string;
};

type TextStyle = 'paragraph' | 'heading-3';

export function PostBlockEditor({
  availableImages,
  initialDocument,
  legacyContent,
  onAddImages,
  onRemoveImage,
}: {
  availableImages: BlockEditorImage[];
  initialDocument?: ContentDocument | null;
  legacyContent?: string | null;
  onAddImages?: (
    files: File[]
  ) => BlockEditorImage[] | Promise<BlockEditorImage[]>;
  onRemoveImage?: (imageId: string) => void;
}) {
  const initialValue = useMemo(
    () =>
      normalizeContentDocument(initialDocument, legacyContent, {
        allowPendingMedia: true,
      }),
    [initialDocument, legacyContent]
  );
  const [contentDocument, setContentDocument] =
    useState<ContentDocument>(initialValue);
  const [activeStyle, setActiveStyle] = useState<TextStyle>('paragraph');
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);
  const [isAddingImages, setIsAddingImages] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [isPickerDragging, setIsPickerDragging] = useState(false);
  const [pendingBatch, setPendingBatch] = useState<BlockEditorImage[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const initializedRef = useRef(false);

  const imagesById = useMemo(
    () => new Map(availableImages.map((image) => [image.id, image])),
    [availableImages]
  );
  const submissionDocument = useMemo<ContentDocument>(
    () => {
      const usedBlockIds = new Set<string>();
      return {
        version: 1,
        blocks: contentDocument.blocks
          .filter((block) => {
            if (block.type === 'paragraph' || block.type === 'heading') {
              return Boolean(block.data.text.trim());
            }
            return true;
          })
          .map((block, index) => {
            const id = uniqueBlockId(block.id, index, usedBlockIds);
            usedBlockIds.add(id);
            return id === block.id ? block : { ...block, id };
          }),
      };
    },
    [contentDocument]
  );
  const plainContent = plainTextFromDocument(submissionDocument);
  const wordCount = plainContent.split(/\s+/).filter(Boolean).length;

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || initializedRef.current) return;

    renderDocument(editor, initialValue, imagesById);
    initializedRef.current = true;
  }, [imagesById, initialValue]);

  useEffect(() => {
    if (!isImageMenuOpen) return;

    function closeImageMenu(event: MouseEvent) {
      if (
        imageMenuRef.current &&
        !imageMenuRef.current.contains(event.target as Node)
      ) {
        setIsImageMenuOpen(false);
      }
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setIsImageMenuOpen(false);
    }

    window.document.addEventListener('mousedown', closeImageMenu);
    window.document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.document.removeEventListener('mousedown', closeImageMenu);
      window.document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isImageMenuOpen]);

  function syncDocument() {
    const editor = editorRef.current;
    if (!editor) return;

    ensureWritingLine(editor);
    const nextDocument = documentFromEditor(editor);
    setContentDocument(nextDocument);
    setActiveStyle(styleFromSelection(editor));
  }

  function rememberSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
    setActiveStyle(styleFromSelection(editor));
  }

  function restoreSelection() {
    const range = savedRangeRef.current;
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function formatSelection(style: TextStyle) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    restoreSelection();
    const tag = style === 'paragraph' ? 'p' : 'h3';
    editor.ownerDocument.execCommand('formatBlock', false, tag);
    setActiveStyle(style);
    syncDocument();
    rememberSelection();
  }

  function insertImage(image: BlockEditorImage) {
    insertImages([image]);
  }

  function insertImages(images: BlockEditorImage[]) {
    const editor = editorRef.current;
    if (!editor || !images.length) return;

    const figures = images.map((image) =>
      createImageElement(
        editor.ownerDocument,
        {
          id: createBlockId(),
          type: 'image',
          data: {
            media_id: image.id,
            alt: image.label,
            alignment: 'center',
            crop: false,
            width: 45,
          },
        },
        image
      )
    );
    insertMediaAtSelection(editor, figures, savedRangeRef.current);
    setIsImageMenuOpen(false);
    setPendingBatch([]);
    const selectedId = images.at(-1)?.id ?? null;
    setSelectedMediaId(selectedId);
    selectMediaElement(editor, selectedId);
    syncDocument();
  }

  function insertGallery(images = availableImages.slice(0, 2)) {
    const editor = editorRef.current;
    if (!editor || images.length < 2) return;

    const block: Extract<ContentBlock, { type: 'gallery' }> = {
      id: createBlockId(),
      type: 'gallery',
      data: {
        layout: 'grid',
        columns: 2,
        images: images.map((image) => ({
          media_id: image.id,
          alt: image.label,
        })),
      },
    };
    const selectedImages = new Map(images.map((image) => [image.id, image]));
    const figure = createGalleryElement(editor.ownerDocument, block, selectedImages);
    insertMediaAtSelection(editor, [figure], savedRangeRef.current);
    setPendingBatch([]);
    setSelectedMediaId(block.id);
    selectMediaElement(editor, block.id);
    syncDocument();
  }

  async function uploadAndInsert(files: File[]) {
    if (!onAddImages || !files.length) return;
    setIsAddingImages(true);

    try {
      const images = await onAddImages(files);
      if (images.length > 1) {
        setPendingBatch(images);
        setIsImageMenuOpen(false);
      } else if (images[0]) {
        insertImage(images[0]);
      }
    } finally {
      setIsAddingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  function removeSelectedMedia() {
    const editor = editorRef.current;
    if (!editor || !selectedMediaId) return;

    const element = Array.from(
      editor.querySelectorAll<HTMLElement>('[data-media-block]')
    ).find((candidate) => candidate.dataset.mediaBlock === selectedMediaId);
    if (!element) return;

    removeMediaElement(element);
  }

  function removeMediaElement(element: HTMLElement) {
    const editor = editorRef.current;
    if (!editor) return;

    const pendingIds =
      element.dataset.blockType === 'gallery'
        ? Array.from(element.querySelectorAll<HTMLElement>('[data-media-id]'))
            .map((image) => image.dataset.mediaId)
            .filter((id): id is string => Boolean(id?.startsWith('pending:')))
        : element.dataset.mediaId?.startsWith('pending:')
          ? [element.dataset.mediaId]
          : [];
    const next = element.nextElementSibling ?? element.previousElementSibling;
    element.remove();
    pendingIds.forEach((id) => onRemoveImage?.(id));
    ensureWritingLine(editor);
    setSelectedMediaId(null);
    syncDocument();

    if (next instanceof HTMLElement && next.isContentEditable) {
      placeCaretAtEnd(next);
    } else {
      editor.focus();
    }
  }

  function handleEditorClick(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const media = target.closest<HTMLElement>('[data-media-block]');
    if (media) {
      const mediaId = media.dataset.mediaBlock ?? null;
      setSelectedMediaId(mediaId);
      selectMediaElement(event.currentTarget, mediaId);

      const action = target.closest<HTMLButtonElement>('[data-editor-action]')
        ?.dataset.editorAction;
      if (action === 'remove') {
        event.preventDefault();
        removeMediaElement(media);
      } else if (action === 'replace' && media.dataset.blockType === 'image') {
        event.preventDefault();
        replaceInputRef.current?.click();
      } else if (action === 'crop') {
        event.preventDefault();
        const cropMode = media.dataset.cropMode !== 'true';
        media.dataset.cropMode = String(cropMode);
        media.dataset.cropX ||= '50';
        media.dataset.cropY ||= '50';
        const cropButton = media.querySelector<HTMLElement>(
          '[data-editor-action="crop"]'
        );
        if (cropButton) {
          cropButton.dataset.active = String(cropMode);
          cropButton.textContent = cropMode ? 'Done' : 'Crop';
        }
        if (!cropMode) syncDocument();
      }
      return;
    }

    setSelectedMediaId(null);
    selectMediaElement(event.currentTarget, null);
    rememberSelection();
  }

  function handleResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const editor = editorRef.current;
    const figure = target.closest<HTMLElement>(
      '[data-block-type="image"]'
    );
    const image = target.closest<HTMLImageElement>('img');
    const edges = image
      ? imageEdgesAtPoint(image, event.clientX, event.clientY)
      : null;
    if (!editor || !figure || !image) return;

    if (!edges && figure.dataset.cropMode === 'true') {
      event.preventDefault();
      event.stopPropagation();
      const cropFigure = figure;
      const cropImage = image;
      const mediaId = cropFigure.dataset.mediaBlock ?? null;
      setSelectedMediaId(mediaId);
      selectMediaElement(editor, mediaId);

      const startX = event.clientX;
      const startY = event.clientY;
      const startCropX = readCropPosition(cropFigure.dataset.cropX);
      const startCropY = readCropPosition(cropFigure.dataset.cropY);
      const bounds = cropImage.getBoundingClientRect();
      cropImage.style.cursor = 'grabbing';

      function adjustCrop(moveEvent: PointerEvent) {
        const cropX = clampCropPosition(
          startCropX - ((moveEvent.clientX - startX) / bounds.width) * 100
        );
        const cropY = clampCropPosition(
          startCropY - ((moveEvent.clientY - startY) / bounds.height) * 100
        );
        cropFigure.dataset.cropX = String(cropX);
        cropFigure.dataset.cropY = String(cropY);
        cropImage.style.objectPosition = `${cropX}% ${cropY}%`;
      }

      function finishCropAdjustment() {
        window.removeEventListener('pointermove', adjustCrop);
        window.removeEventListener('pointerup', finishCropAdjustment);
        window.removeEventListener('pointercancel', finishCropAdjustment);
        cropImage.style.cursor = 'grab';
        syncDocument();
      }

      window.addEventListener('pointermove', adjustCrop);
      window.addEventListener('pointerup', finishCropAdjustment);
      window.addEventListener('pointercancel', finishCropAdjustment);
      return;
    }

    if (!edges) return;

    if (figure.dataset.cropMode === 'true') {
      event.preventDefault();
      event.stopPropagation();
      const cropFigure = figure;
      const cropImage = image;
      const cropEdges = edges;
      const startX = event.clientX;
      const startY = event.clientY;
      const bounds = cropImage.getBoundingClientRect();
      const editorWidth = editor.getBoundingClientRect().width;

      function resizeCrop(moveEvent: PointerEvent) {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        const nextWidth = Math.min(
          editorWidth,
          Math.max(
            editorWidth * 0.25,
            bounds.width +
              (cropEdges.left ? -deltaX : cropEdges.right ? deltaX : 0)
          )
        );
        const nextHeight = Math.max(
          80,
          bounds.height +
            (cropEdges.top ? -deltaY : cropEdges.bottom ? deltaY : 0)
        );
        const ratio = clampCropRatio(nextWidth / nextHeight);
        const width = Math.round((nextWidth / editorWidth) * 100);

        cropFigure.dataset.crop = 'true';
        cropFigure.dataset.cropRatio = String(ratio);
        cropFigure.dataset.width = String(width);
        cropFigure.style.aspectRatio = String(ratio);
        cropFigure.style.width = `${width}%`;
        cropImage.style.height = '100%';
        cropImage.style.objectPosition = `${readCropPosition(cropFigure.dataset.cropX)}% ${readCropPosition(cropFigure.dataset.cropY)}%`;
      }

      function finishCropResize() {
        window.removeEventListener('pointermove', resizeCrop);
        window.removeEventListener('pointerup', finishCropResize);
        window.removeEventListener('pointercancel', finishCropResize);
        syncDocument();
      }

      window.addEventListener('pointermove', resizeCrop);
      window.addEventListener('pointerup', finishCropResize);
      window.addEventListener('pointercancel', finishCropResize);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const imageFigure = figure;
    const resizeEdges = edges;
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = imageFigure.getBoundingClientRect().width;
    const editorWidth = editor.getBoundingClientRect().width;

    function resize(moveEvent: PointerEvent) {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      let delta = 0;

      const hasHorizontalEdge = resizeEdges.left || resizeEdges.right;
      const hasVerticalEdge = resizeEdges.top || resizeEdges.bottom;

      if (
        hasHorizontalEdge &&
        (!hasVerticalEdge || Math.abs(deltaX) >= Math.abs(deltaY))
      ) {
        delta = (resizeEdges.left ? -deltaX : deltaX) * 2;
      } else {
        delta = (resizeEdges.top ? -deltaY : deltaY) * 2;
      }
      const width = Math.round(
        Math.min(100, Math.max(25, ((startWidth + delta) / editorWidth) * 100))
      );
      imageFigure.dataset.width = String(width);
      imageFigure.style.width = `${width}%`;
    }

    function finishResize() {
      window.removeEventListener('pointermove', resize);
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', finishResize);
      syncDocument();
    }

    window.addEventListener('pointermove', resize);
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', finishResize);
  }

  function handleImageEdgeHover(event: ReactPointerEvent<HTMLDivElement>) {
    const image = (event.target as HTMLElement).closest<HTMLImageElement>('img');
    const figure = image?.closest<HTMLElement>('[data-block-type="image"]');
    if (!image || !figure) return;

    const edges = imageEdgesAtPoint(image, event.clientX, event.clientY);
    image.style.cursor = edges
      ? cursorForImageEdges(edges)
      : figure.dataset.cropMode === 'true'
        ? 'grab'
        : 'default';
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      selectedMediaId &&
      (event.key === 'Backspace' || event.key === 'Delete')
    ) {
      event.preventDefault();
      removeSelectedMedia();
      return;
    }

    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.ownerDocument.execCommand('insertParagraph');
      event.currentTarget.ownerDocument.execCommand('formatBlock', false, 'p');
      syncDocument();
      window.requestAnimationFrame(rememberSelection);
      return;
    }

    if (event.key === 'Escape') {
      setSelectedMediaId(null);
      selectMediaElement(event.currentTarget, null);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const imageFiles = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith('image/')
    );
    if (imageFiles.length) {
      event.preventDefault();
      void uploadAndInsert(imageFiles);
      return;
    }

    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    event.currentTarget.ownerDocument.execCommand('insertText', false, text);
  }

  async function replaceSelectedImage(files: File[]) {
    const editor = editorRef.current;
    if (!editor || !selectedMediaId || !onAddImages || !files[0]) return;

    setIsAddingImages(true);
    try {
      const [image] = await onAddImages([files[0]]);
      const figure = Array.from(
        editor.querySelectorAll<HTMLElement>('[data-media-block]')
      ).find((candidate) => candidate.dataset.mediaBlock === selectedMediaId);
      if (!image || !figure || figure.dataset.blockType !== 'image') return;

      const previousId = figure.dataset.mediaId;
      const preview = figure.querySelector<HTMLImageElement>('img');
      if (preview) {
        preview.src = image.imageUrl;
        preview.alt = image.label;
        preview.dataset.mediaId = image.id;
      }
      figure.dataset.mediaId = image.id;
      figure.dataset.mediaBlock = image.id;
      if (previousId?.startsWith('pending:')) onRemoveImage?.(previousId);
      setSelectedMediaId(image.id);
      selectMediaElement(editor, image.id);
      syncDocument();
    } finally {
      setIsAddingImages(false);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  }

  function cancelPendingBatch() {
    pendingBatch.forEach((image) => onRemoveImage?.(image.id));
    setPendingBatch([]);
  }

  return (
    <section aria-labelledby="article-content-title" className="mt-3">
      <input name="content" type="hidden" value={plainContent} />
      <input
        name="content_json"
        type="hidden"
        value={JSON.stringify(submissionDocument)}
      />

      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]" id="article-content-title">
          Story
        </h3>
        <span className="text-xs font-medium tabular-nums text-[var(--muted)]">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>

      <div>
        <div className="sticky top-16 z-20 border-y border-[var(--line)] bg-white/95 py-2 backdrop-blur-xl lg:top-3">
          <div className="flex flex-wrap items-center gap-1">
            <div aria-label="Text style" className="flex items-center gap-1" role="group">
              {([
                ['paragraph', 'Normal'],
                ['heading-3', 'Heading'],
              ] as const).map(([style, label]) => (
                <ToolbarButton
                  active={activeStyle === style && !selectedMediaId}
                  key={style}
                  label={label}
                  onClick={() => formatSelection(style)}
                />
              ))}
            </div>

            <span className="mx-1 h-6 w-px bg-[var(--line)]" />
            <div className="relative" ref={imageMenuRef}>
              <ToolbarButton
                active={isImageMenuOpen}
                disabled={!availableImages.length && !onAddImages}
                icon={<ImageIcon />}
                label={isAddingImages ? 'Adding…' : 'Image'}
                onClick={() => setIsImageMenuOpen((open) => !open)}
              />
              {isImageMenuOpen && (
                <div className="glass-modal absolute left-0 top-full z-30 mt-2 w-72 rounded-2xl p-3 shadow-xl">
                  {onAddImages && (
                    <>
                      <button
                        className={`flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition disabled:opacity-60 ${
                          isPickerDragging
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--line-strong)] bg-[var(--surface-muted)] hover:border-[var(--accent)]'
                        }`}
                        disabled={isAddingImages}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          setIsPickerDragging(true);
                        }}
                        onDragLeave={(event) => {
                          if (
                            !event.currentTarget.contains(
                              event.relatedTarget as Node | null
                            )
                          ) {
                            setIsPickerDragging(false);
                          }
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'copy';
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          setIsPickerDragging(false);
                          const files = Array.from(event.dataTransfer.files).filter(
                            (file) => file.type.startsWith('image/')
                          );
                          if (files.length) void uploadAndInsert(files);
                        }}
                        onClick={() => imageInputRef.current?.click()}
                        type="button"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--foreground)] shadow-sm">
                          <ImageIcon />
                        </span>
                        <span className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                          Drop images here
                        </span>
                        <span className="mt-0.5 text-xs text-[var(--muted)]">
                          or click to choose from your folder
                        </span>
                      </button>
                      <input
                        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                        className="sr-only"
                        multiple
                        onChange={(event) =>
                          uploadAndInsert(Array.from(event.target.files ?? []))
                        }
                        ref={imageInputRef}
                        type="file"
                      />
                    </>
                  )}
                  {availableImages.length > 0 && (
                    <div className={onAddImages ? 'mt-3 border-t border-[var(--line)] pt-3' : ''}>
                      <p className="mb-2 text-xs font-semibold text-[var(--muted)]">
                        Insert an existing image
                      </p>
                      <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
                        {availableImages.map((image) => (
                          <button
                            aria-label={`Insert ${image.label}`}
                            className="group aspect-square overflow-hidden rounded-xl border border-[var(--line)] bg-cover bg-center transition hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
                            key={image.id}
                            onClick={() => insertImage(image)}
                            style={{
                              backgroundImage: `url(${JSON.stringify(image.imageUrl)})`,
                            }}
                            title={image.label}
                            type="button"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <ToolbarButton
              disabled={availableImages.length < 2}
              icon={<GalleryIcon />}
              label="Gallery"
              onClick={() => insertGallery()}
            />
          </div>
        </div>

        <input
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="sr-only"
          onChange={(event) =>
            replaceSelectedImage(Array.from(event.target.files ?? []))
          }
          ref={replaceInputRef}
          type="file"
        />

        {pendingBatch.length > 1 && (
          <div className="flex flex-col gap-3 border-b border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {pendingBatch.length} images selected
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Choose how they should appear at the cursor.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="h-9 rounded-full bg-[var(--accent)] px-4 text-xs font-semibold text-white"
                onClick={() => insertGallery(pendingBatch)}
                type="button"
              >
                Insert as gallery
              </button>
              <button
                className="h-9 rounded-full border border-[var(--line)] bg-white px-4 text-xs font-semibold text-[var(--foreground)]"
                onClick={() => insertImages(pendingBatch)}
                type="button"
              >
                Insert separately
              </button>
              <button
                className="h-9 px-2 text-xs font-semibold text-[var(--muted)]"
                onClick={cancelPendingBatch}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          {isDraggingImages && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
              <span className="rounded-full border border-dashed border-[var(--accent)] bg-white px-5 py-2 text-sm font-semibold text-[var(--foreground)] shadow-lg">
                Drop image at the cursor
              </span>
            </div>
          )}
          <div
            aria-label="Article content"
            className="article-editor-body mx-auto min-h-[320px] w-full max-w-[680px] bg-transparent py-8 outline-none"
            contentEditable
            id="article-story-editor"
            onBlur={syncDocument}
            onClick={handleEditorClick}
            onDragEnter={(event) => {
              if (Array.from(event.dataTransfer.types).includes('Files')) {
                event.preventDefault();
                setIsDraggingImages(true);
              }
            }}
            onDragLeave={(event: DragEvent<HTMLDivElement>) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsDraggingImages(false);
              }
            }}
            onDragOver={(event) => {
              if (Array.from(event.dataTransfer.types).includes('Files')) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDrop={(event) => {
              const files = Array.from(event.dataTransfer.files).filter((file) =>
                file.type.startsWith('image/')
              );
              setIsDraggingImages(false);
              if (!files.length) return;
              event.preventDefault();
              void uploadAndInsert(files);
            }}
            onFocus={(event) => {
              event.currentTarget.ownerDocument.execCommand(
                'defaultParagraphSeparator',
                false,
                'p'
              );
              rememberSelection();
            }}
            onInput={syncDocument}
            onKeyDown={handleEditorKeyDown}
            onKeyUp={rememberSelection}
            onMouseUp={rememberSelection}
            onPaste={handlePaste}
            onPointerDown={handleResizeStart}
            onPointerMove={handleImageEdgeHover}
            ref={editorRef}
            role="textbox"
            spellCheck
            suppressContentEditableWarning
          />
        </div>
      </div>
    </section>
  );
}

function ToolbarButton({
  active,
  danger = false,
  disabled = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active === undefined ? undefined : active}
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-35 ${
        danger
          ? 'text-[var(--danger)] hover:bg-[var(--danger-soft)]'
          : active
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--muted-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
      }`}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function renderDocument(
  editor: HTMLElement,
  value: ContentDocument,
  imagesById: ReadonlyMap<string, BlockEditorImage>
) {
  editor.replaceChildren();
  const ownerDocument = editor.ownerDocument;

  for (const block of value.blocks) {
    if (block.type === 'paragraph' || block.type === 'heading') {
      const tag = block.type === 'paragraph' ? 'p' : 'h3';
      const element = ownerDocument.createElement(tag);
      element.dataset.blockId = block.id;
      element.textContent = block.data.text;
      editor.append(element);
    } else if (block.type === 'image') {
      editor.append(
        createImageElement(ownerDocument, block, imagesById.get(block.data.media_id))
      );
    } else {
      editor.append(createGalleryElement(ownerDocument, block, imagesById));
    }
  }

  ensureWritingLine(editor);
}

function createImageElement(
  ownerDocument: Document,
  block: Extract<ContentBlock, { type: 'image' }>,
  image?: BlockEditorImage
) {
  const figure = ownerDocument.createElement('figure');
  figure.dataset.blockId = block.id;
  figure.dataset.blockType = 'image';
  figure.dataset.mediaBlock = block.data.media_id;
  figure.dataset.mediaId = block.data.media_id;
  figure.dataset.alignment = block.data.alignment;
  figure.dataset.crop = String(Boolean(block.data.crop));
  figure.dataset.cropMode = 'false';
  figure.dataset.cropRatio = String(block.data.crop_ratio ?? 4 / 3);
  figure.dataset.cropX = String(block.data.crop_x ?? 50);
  figure.dataset.cropY = String(block.data.crop_y ?? 50);
  const width = block.data.width ?? (block.data.alignment === 'center' ? 45 : 100);
  figure.dataset.width = String(width);
  figure.style.width = `${width}%`;
  if (block.data.crop) {
    figure.style.aspectRatio = String(block.data.crop_ratio ?? 4 / 3);
  }
  figure.contentEditable = 'false';
  figure.append(
    createMediaActions(
      ownerDocument,
      true
    )
  );

  if (image) {
    const imageElement = ownerDocument.createElement('img');
    imageElement.alt = block.data.alt;
    imageElement.dataset.mediaId = block.data.media_id;
    imageElement.draggable = false;
    imageElement.src = image.imageUrl;
    if (block.data.crop) {
      imageElement.style.height = '100%';
      imageElement.style.objectPosition = `${block.data.crop_x ?? 50}% ${block.data.crop_y ?? 50}%`;
    }
    figure.append(imageElement);
  } else {
    const unavailable = ownerDocument.createElement('div');
    unavailable.className = 'article-editor-unavailable';
    unavailable.textContent = 'Image unavailable';
    figure.append(unavailable);
  }

  return figure;
}

function createGalleryElement(
  ownerDocument: Document,
  block: Extract<ContentBlock, { type: 'gallery' }>,
  imagesById: ReadonlyMap<string, BlockEditorImage>
) {
  const figure = ownerDocument.createElement('figure');
  figure.dataset.blockId = block.id;
  figure.dataset.blockType = 'gallery';
  figure.dataset.mediaBlock = block.id;
  figure.dataset.columns = String(block.data.columns);
  figure.contentEditable = 'false';
  figure.append(createMediaActions(ownerDocument, false));

  const grid = ownerDocument.createElement('div');
  grid.className = 'article-editor-gallery';
  grid.dataset.columns = String(block.data.columns);
  for (const media of block.data.images) {
    const image = imagesById.get(media.media_id);
    if (!image) continue;
    const imageElement = ownerDocument.createElement('img');
    imageElement.alt = media.alt;
    imageElement.dataset.mediaId = media.media_id;
    imageElement.dataset.caption = media.caption ?? '';
    imageElement.src = image.imageUrl;
    grid.append(imageElement);
  }
  figure.append(grid);
  return figure;
}

function documentFromEditor(editor: HTMLElement): ContentDocument {
  const blocks: ContentBlock[] = [];
  const usedBlockIds = new Set<string>();

  for (const [index, node] of Array.from(editor.children).entries()) {
    if (!(node instanceof HTMLElement)) continue;
    const id = uniqueBlockId(
      node.dataset.blockId || createBlockId(),
      index,
      usedBlockIds
    );
    node.dataset.blockId = id;
    usedBlockIds.add(id);
    const tag = node.tagName.toLowerCase();

    if (tag === 'figure' && node.dataset.blockType === 'image') {
      const mediaId = node.dataset.mediaId;
      if (!mediaId) continue;
      const image = node.querySelector('img');
      blocks.push({
        id,
        type: 'image',
        data: {
          media_id: mediaId,
          alt: image?.alt ?? '',
          alignment: node.dataset.alignment === 'center' ? 'center' : 'wide',
          ...(node.dataset.crop === 'true'
            ? {
                crop: true,
                crop_ratio: clampCropRatio(
                  Number(node.dataset.cropRatio) || 4 / 3
                ),
                crop_x: readCropPosition(node.dataset.cropX),
                crop_y: readCropPosition(node.dataset.cropY),
              }
            : {}),
          width: Math.min(
            100,
            Math.max(25, Math.round(Number(node.dataset.width) || 45))
          ),
        },
      });
      continue;
    }

    if (tag === 'figure' && node.dataset.blockType === 'gallery') {
      const images = Array.from(node.querySelectorAll<HTMLImageElement>('img[data-media-id]')).map(
        (image) => ({
          media_id: image.dataset.mediaId ?? '',
          alt: image.alt,
          ...(image.dataset.caption ? { caption: image.dataset.caption } : {}),
        })
      ).filter((image) => image.media_id);
      if (images.length >= 2) {
        const columns = Number(node.dataset.columns);
        blocks.push({
          id,
          type: 'gallery',
          data: {
            layout: 'grid',
            columns: columns === 3 || columns === 4 ? columns : 2,
            images,
          },
        });
      }
      continue;
    }

    const text = node.innerText.replace(/\n$/, '');
    if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
      blocks.push({
        id,
        type: 'heading',
        data: { text, level: Number(tag.at(-1)) as 2 | 3 | 4 },
      });
    } else {
      blocks.push({ id, type: 'paragraph', data: { text } });
    }
  }

  return { version: 1, blocks };
}

function insertMediaAtSelection(
  editor: HTMLElement,
  media: HTMLElement[],
  range: Range | null
) {
  let anchor: HTMLElement | null = null;
  if (range && editor.contains(range.commonAncestorContainer)) {
    const start =
      range.startContainer instanceof HTMLElement
        ? range.startContainer
        : range.startContainer.parentElement;
    anchor = start;
    while (anchor?.parentElement && anchor.parentElement !== editor) {
      anchor = anchor.parentElement;
    }
  }

  const paragraph = editor.ownerDocument.createElement('p');
  paragraph.dataset.blockId = createBlockId();
  if (anchor?.parentElement === editor) {
    anchor.after(...media, paragraph);
  } else {
    editor.append(...media, paragraph);
  }
  placeCaretAtStart(paragraph);
}

function createMediaActions(ownerDocument: Document, allowReplace: boolean) {
  const actions = ownerDocument.createElement('div');
  actions.className = 'article-editor-media-actions';

  if (allowReplace) {
    const cropButton = ownerDocument.createElement('button');
    cropButton.dataset.editorAction = 'crop';
    cropButton.dataset.active = 'false';
    cropButton.textContent = 'Crop';
    cropButton.type = 'button';
    actions.append(cropButton);

    const replace = ownerDocument.createElement('button');
    replace.dataset.editorAction = 'replace';
    replace.textContent = 'Replace';
    replace.type = 'button';
    actions.append(replace);
  }

  const remove = ownerDocument.createElement('button');
  remove.dataset.editorAction = 'remove';
  remove.textContent = 'Remove';
  remove.type = 'button';
  actions.append(remove);
  return actions;
}

type ImageEdges = {
  bottom: boolean;
  left: boolean;
  right: boolean;
  top: boolean;
};

function imageEdgesAtPoint(
  image: HTMLImageElement,
  clientX: number,
  clientY: number
): ImageEdges | null {
  const bounds = image.getBoundingClientRect();
  const threshold = 14;
  const edges = {
    bottom: clientY >= bounds.bottom - threshold,
    left: clientX <= bounds.left + threshold,
    right: clientX >= bounds.right - threshold,
    top: clientY <= bounds.top + threshold,
  };

  return edges.bottom || edges.left || edges.right || edges.top ? edges : null;
}

function cursorForImageEdges(edges: ImageEdges) {
  if ((edges.left && edges.top) || (edges.right && edges.bottom)) {
    return 'nwse-resize';
  }
  if ((edges.right && edges.top) || (edges.left && edges.bottom)) {
    return 'nesw-resize';
  }
  if (edges.left || edges.right) return 'ew-resize';
  return 'ns-resize';
}

function clampCropPosition(value: number) {
  return Math.round(Math.min(100, Math.max(0, value)));
}

function clampCropRatio(value: number) {
  return Math.round(Math.min(10, Math.max(0.1, value)) * 1000) / 1000;
}

function readCropPosition(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampCropPosition(parsed) : 50;
}

function ensureWritingLine(editor: HTMLElement) {
  const onlyChild = editor.children.length === 1 ? editor.firstElementChild : null;
  if (editor.children.length && onlyChild?.tagName.toLowerCase() !== 'br') return;
  const shouldRestoreCaret = editor.ownerDocument.activeElement === editor;
  editor.replaceChildren();
  const paragraph = editor.ownerDocument.createElement('p');
  paragraph.dataset.blockId = createBlockId();
  editor.append(paragraph);
  if (shouldRestoreCaret) placeCaretAtStart(paragraph);
}

function styleFromSelection(editor: HTMLElement): TextStyle {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return 'paragraph';
  let element =
    selection.anchorNode instanceof HTMLElement
      ? selection.anchorNode
      : selection.anchorNode?.parentElement;
  if (!element || !editor.contains(element)) return 'paragraph';
  while (element.parentElement && element.parentElement !== editor) {
    element = element.parentElement;
  }
  const tag = element.tagName.toLowerCase();
  return tag === 'h2' || tag === 'h3' || tag === 'h4'
    ? 'heading-3'
    : 'paragraph';
}

function selectMediaElement(editor: HTMLElement, mediaId: string | null) {
  for (const element of editor.querySelectorAll<HTMLElement>('[data-media-block]')) {
    const selected = element.dataset.mediaBlock === mediaId;
    element.dataset.selected = String(selected);
    if (!selected && element.dataset.cropMode === 'true') {
      element.dataset.cropMode = 'false';
      const cropButton = element.querySelector<HTMLButtonElement>(
        '[data-editor-action="crop"]'
      );
      if (cropButton) {
        cropButton.dataset.active = 'false';
        cropButton.textContent = 'Crop';
      }
    }
  }
}

function placeCaretAtStart(element: HTMLElement) {
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  element.closest<HTMLElement>('[contenteditable="true"]')?.focus();
}

function placeCaretAtEnd(element: HTMLElement) {
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function createBlockId() {
  return `block-${crypto.randomUUID()}`;
}

function uniqueBlockId(
  requestedId: string,
  index: number,
  usedIds: ReadonlySet<string>
) {
  if (!usedIds.has(requestedId)) return requestedId;

  let attempt = 1;
  let candidate = '';
  do {
    const suffix = `-${index + 1}-${attempt}`;
    candidate = `${requestedId.slice(0, 100 - suffix.length)}${suffix}`;
    attempt += 1;
  } while (usedIds.has(candidate));

  return candidate;
}

function ImageIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <rect height="16" rx="2" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="4" />
      <circle cx="9" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m5 18 5-5 3 3 2-2 4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <rect height="13" rx="2" stroke="currentColor" strokeWidth="1.7" width="15" x="6" y="6" />
      <path d="M3 16V5a2 2 0 0 1 2-2h12M8 17l3-3 2 2 2-2 4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

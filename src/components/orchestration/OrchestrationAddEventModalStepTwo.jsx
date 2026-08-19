import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Upload, Trash2, ChevronLeft, ChevronRight, Save } from "lucide-react";

const MAX_PHOTO_COUNT = 50;
const MAX_VIDEO_COUNT = 8;
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE_BYTES = 300 * 1024; // 300 KB
const MAX_THUMBNAIL_WIDTH = 800;
const MAX_THUMBNAIL_HEIGHT = 600;
const MAX_CAPTION_LENGTH = 255;
const PHOTO_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".tiff", ".bmp"];
const VIDEO_EXTENSIONS = [".mp4"];
const ALLOWED_EXTENSIONS = [...PHOTO_EXTENSIONS, ...VIDEO_EXTENSIONS];

const fieldLabelClass =
  "block text-lg font-medium leading-[1.4] text-[#1e1e1e]";
const fieldGroupClass = "flex min-w-0 flex-col gap-2";
const fieldInputBaseClass =
  "w-full border border-[#d9d9d9] rounded-lg px-4 py-2 text-lg leading-[1.4] text-[#1e1e1e] bg-white placeholder:text-[#b3b3b3]";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/90 px-6 py-3 text-lg font-semibold leading-[1.4] text-white transition-colors hover:bg-blue-600 disabled:opacity-25 disabled:cursor-not-allowed";
const secondaryOutlineButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#d9d9d9] px-6 py-3 text-lg font-semibold leading-[1.4] text-[#1e1e1e] transition-colors hover:bg-gray-50";

const fieldInputClass = (hasError) =>
  `${fieldInputBaseClass}${hasError ? " border-red-500" : ""}`;

const getFileExtension = (fileName = "") => {
  const normalizedName = String(fileName).toLowerCase();
  const lastDotIndex = normalizedName.lastIndexOf(".");

  return lastDotIndex >= 0 ? normalizedName.slice(lastDotIndex) : "";
};

const getFileCategory = (fileLike) => {
  const fileName =
    fileLike?.name ||
    fileLike?.file?.name ||
    fileLike?.original_filename ||
    fileLike?.filename ||
    "";
  const fileType = String(
    fileLike?.type || fileLike?.file?.type || fileLike?.file_type || "",
  ).toLowerCase();
  const fileExtension = getFileExtension(fileName);

  if (
    PHOTO_EXTENSIONS.includes(fileExtension) ||
    fileType === "image" ||
    fileType.startsWith("image/")
  ) {
    return "photo";
  }

  if (
    VIDEO_EXTENSIONS.includes(fileExtension) ||
    fileType === "video" ||
    fileType.startsWith("video/")
  ) {
    return "video";
  }

  return null;
};

const resolveThumbnailPreview = (fileItem) => {
  if (!fileItem) return "";
  if (fileItem.thumbnailPreview) return fileItem.thumbnailPreview;
  if (fileItem.thumbnail_url) return fileItem.thumbnail_url;
  if (fileItem.thumbnail_file_url) return fileItem.thumbnail_file_url;
  if (fileItem.thumbnailUrl) return fileItem.thumbnailUrl;
  if (fileItem.thumbnail?.url) return fileItem.thumbnail.url;
  if (
    typeof fileItem.thumbnail === "string" &&
    /^(https?:\/\/|blob:|data:)/i.test(fileItem.thumbnail)
  ) {
    return fileItem.thumbnail;
  }
  return "";
};

const hasThumbnail = (fileItem) => {
  if (!fileItem) return false;
  if (fileItem.thumbnail instanceof Blob) return true;
  if (fileItem.thumbnail?.__existing) return true;
  if (fileItem.thumbnail_blob_path) return true;
  return Boolean(resolveThumbnailPreview(fileItem));
};

const normalizeIncomingFiles = (incoming = []) =>
  (Array.isArray(incoming) ? incoming : []).map((item) => {
    const category = getFileCategory(item);
    const thumbnailPreview = resolveThumbnailPreview(item);
    const preview = item?.preview || item?.file_url || item?.url || "";

    if (category !== "video") {
      return {
        ...item,
        preview,
        caption: String(item?.caption || "").slice(0, MAX_CAPTION_LENGTH),
        description: item?.description || "",
      };
    }

    return {
      ...item,
      preview,
      caption: String(item?.caption || "").slice(0, MAX_CAPTION_LENGTH),
      description: item?.description || "",
      thumbnailPreview,
      thumbnail:
        item?.thumbnail instanceof Blob
          ? item.thumbnail
          : hasThumbnail({ ...item, thumbnailPreview })
            ? item.thumbnail || { __existing: true, name: "existing-thumbnail" }
            : null,
    };
  });

const getUploadedFileName = (fileLike) =>
  String(
    fileLike?.name ||
      fileLike?.file?.name ||
      fileLike?.original_filename ||
      fileLike?.filename ||
      "",
  ).trim();

const normalizeFileNameKey = (fileName) =>
  String(fileName || "").trim().toLowerCase();

export default function OrchestrationModalStepTwo({
  onNextClickHandler,
  onSaveDraftClick,
  onBackClick,
  initialValues: stepTwoInitialValues,
  onValuesChange,
}){
  const [files, setFiles] = useState(
    () => normalizeIncomingFiles(stepTwoInitialValues?.files || []),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [captionError, setCaptionError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [thumbnailError, setThumbnailError] = useState("");
  const fileInputId = "step2-file-upload";
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const savedScrollTop = useRef(0);

  // Save scroll position before index change re-renders the preview
  const changeIndex = (newIndex) => {
    savedScrollTop.current = scrollRef.current?.scrollTop ?? 0;
    setCurrentIndex(newIndex);
  };

  // Restore scroll position after re-render so switching image↔video never jumps to top
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = savedScrollTop.current;
    }
  }, [currentIndex]);

  useEffect(() => {
    setFiles(normalizeIncomingFiles(stepTwoInitialValues?.files || []));
    setCurrentIndex(0);
    setCaptionError("");
    setUploadError("");
    setThumbnailError("");
  }, [stepTwoInitialValues]);

  useEffect(() => {
    onValuesChange?.({ files });
  }, [files, onValuesChange]);

  // Handle main file upload
  const handleFiles = (selectedFiles) => {
    const nextSelectedFiles = Array.from(selectedFiles || []);

    if (nextSelectedFiles.length === 0) {
      return;
    }

    const currentPhotoCount = files.filter((fileItem) => getFileCategory(fileItem) === "photo").length;
    const currentVideoCount = files.filter((fileItem) => getFileCategory(fileItem) === "video").length;
    let nextPhotoCount = currentPhotoCount;
    let nextVideoCount = currentVideoCount;
    const validFiles = [];
    const existingNameKeys = new Set(
      files
        .map((fileItem) => normalizeFileNameKey(getUploadedFileName(fileItem)))
        .filter(Boolean),
    );

    for (const file of nextSelectedFiles) {
      const fileExtension = getFileExtension(file.name);
      const fileCategory = getFileCategory(file);
      const fileNameKey = normalizeFileNameKey(file.name);

      if (!ALLOWED_EXTENSIONS.includes(fileExtension) || !fileCategory) {
        setUploadError(
          "Supported file types: photos (.png, .jpg, .jpeg, .gif, .tiff, .bmp) and videos (.mp4 H.264/H.265 only).",
        );
        return;
      }

      if (fileNameKey && existingNameKeys.has(fileNameKey)) {
        setUploadError(`A file named "${file.name}" is already uploaded. Please choose a different file.`);
        return;
      }

      if (fileCategory === "photo") {
        if (file.size > MAX_PHOTO_SIZE_BYTES) {
          setUploadError("Each photo must be 10MB or smaller.");
          return;
        }

        if (nextPhotoCount >= MAX_PHOTO_COUNT) {
          setUploadError("You can upload upto 50 photos only.");
          return;
        }

        nextPhotoCount += 1;
      }

      if (fileCategory === "video") {
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          setUploadError("Each video must be 500MB or smaller.");
          return;
        }

        if (nextVideoCount >= MAX_VIDEO_COUNT) {
          setUploadError("You can upload upto 8 videos only.");
          return;
        }

        nextVideoCount += 1;
      }

      if (fileNameKey) {
        existingNameKeys.add(fileNameKey);
      }

      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
        caption: "",
        description: "",
        thumbnail: fileCategory === "video" ? null : undefined,
        thumbnailPreview: fileCategory === "video" ? "" : undefined,
      });
    }

    setFiles((prev) => [...prev, ...validFiles]);
    setCaptionError("");
    setUploadError("");
  };

  // Handle thumbnail upload with size + dimension enforcement
  const handleThumbnailUpload = (file) => {
    if (!file) return;
    if (getFileCategory(files[currentIndex]) !== "video") return;

    setThumbnailError("");

    if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
      setThumbnailError("Thumbnail must be 300 KB or smaller.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      if (img.width > MAX_THUMBNAIL_WIDTH || img.height > MAX_THUMBNAIL_HEIGHT) {
        URL.revokeObjectURL(objectUrl);
        setThumbnailError(
          `Thumbnail must be ${MAX_THUMBNAIL_WIDTH}×${MAX_THUMBNAIL_HEIGHT} px or smaller (got ${img.width}×${img.height}).`,
        );
        return;
      }
      // Valid — keep objectUrl as preview
      const updated = [...files];
      updated[currentIndex].thumbnail = file;
      updated[currentIndex].thumbnailPreview = objectUrl;
      setFiles(updated);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setThumbnailError("Could not read image. Please try another file.");
    };

    img.src = objectUrl;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const deleteCurrent = () => {
    const updated = files.filter((_, i) => i !== currentIndex);
    setFiles(updated);
    // After deletion: step back to the previous item.
    // If deleting the first item (index 0), stay at 0 (now points to next).
    savedScrollTop.current = scrollRef.current?.scrollTop ?? 0;
    setCurrentIndex(Math.max(0, currentIndex - 1));
    setCaptionError("");
    setUploadError("");
    setThumbnailError("");
  };

  const nextImage = () => {
    if (currentIndex < files.length - 1) {
      changeIndex(currentIndex + 1);
      setThumbnailError("");
    }
  };

  const prevImage = () => {
    if (currentIndex > 0) {
      changeIndex(currentIndex - 1);
      setThumbnailError("");
    }
  };

  const updateField = (field, value) => {
    const updated = [...files];
    const nextValue =
      field === "caption"
        ? String(value || "").slice(0, MAX_CAPTION_LENGTH)
        : value;
    updated[currentIndex][field] = nextValue;
    setFiles(updated);

    if (field === "caption") {
      setCaptionError("");
    }
  };

  const currentFile = files[currentIndex];
  const isCurrentVideo = getFileCategory(currentFile) === "video";
  const isCurrentImage = getFileCategory(currentFile) === "photo";
  const isCurrentThumbnailMissing = isCurrentVideo && !hasThumbnail(currentFile);
  const currentThumbnailPreview = resolveThumbnailPreview(currentFile);

  const handleNext = () => {
    // Require at least one attachment to proceed to next step
    if (!files || files.length === 0) {
      setUploadError("At least one attachment is required to proceed.");
      return;
    }

    const firstMissingThumbnailIndex = files.findIndex(
      (fileItem) => getFileCategory(fileItem) === "video" && !hasThumbnail(fileItem)
    );

    if (firstMissingThumbnailIndex !== -1) {
      setCurrentIndex(firstMissingThumbnailIndex);
      setCaptionError("");
      setThumbnailError("Thumbnail is mandatory for all uploaded videos.");
      return;
    }

    setCaptionError("");
    setThumbnailError("");
    setUploadError("");
    onNextClickHandler({ files });
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-white font-sans">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden" ref={scrollRef}>
        {/* Upload Area */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <label className={fieldLabelClass}>Upload Attachments*</label>
            {files.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setCaptionError("");
                  setUploadError("");
                  setThumbnailError("");
                }}
                className="text-lg font-semibold leading-[1.4] text-[#c00f0c] transition-colors hover:text-red-700"
              >
                Delete All
              </button>
            )}
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onClick={openFilePicker}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFilePicker();
              }
            }}
            role="button"
            tabIndex={0}
            className="flex min-h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#2563eb] bg-blue-600/5 px-6 py-8 text-center transition-colors hover:bg-blue-600/[0.07]"
          >
            <div className="mb-2 flex flex-wrap items-center justify-center gap-6">
              <img
                src="/assets/icons/orch/file-image.svg"
                alt=""
                className="h-11 w-[70px] shrink-0"
              />
              <div className="flex flex-col items-center gap-1">
                <p className="text-lg leading-6 tracking-[0.09px] text-[#1f2937]">
                  Drag & Drop your files here or{" "}
                  <span className="font-semibold text-[#1e49e2] hover:text-blue-700">
                    browse
                  </span>
                </p>
                <p className="max-w-[541px] text-center text-base leading-5 tracking-[0.08px] text-[#9ca3af]">
                  Upto 50 photos and 8 videos. Photos: 10MB max each (.png, .jpg, .jpeg, .gif, .tiff, .bmp). Videos: 500MB max each (.mp4 H.264/H.265).
                </p>
              </div>
            </div>
            {uploadError ? (
              <p className="mt-1 text-sm text-red-500">{uploadError}</p>
            ) : null}

            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              multiple
              className="hidden"
              accept=".png,.jpg,.jpeg,.gif,.tiff,.bmp,.mp4"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Preview Section */}
        {files.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            {/* Preview */}
            <div className="flex min-w-0 flex-col gap-4">
              <div className="relative h-[min(346px,40vh)] overflow-hidden rounded-xl border border-[#d9d9d9] bg-[#f5f5f5]">
                {isCurrentImage && (
                  <img
                    src={files[currentIndex].preview}
                    alt="preview"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )}

                {isCurrentVideo && (
                  <video
                    src={files[currentIndex].preview}
                    className="absolute inset-0 h-full w-full bg-black object-contain"
                    controls
                    muted
                    tabIndex={-1}
                  />
                )}
              </div>

              {isCurrentVideo && currentThumbnailPreview ? (
                <div>
                  <p className="mb-1 text-sm text-[#757575]">Thumbnail Preview</p>
                  <div className="relative h-[min(120px,18vh)] w-full overflow-hidden rounded-lg border border-[#d9d9d9] bg-[#f5f5f5]">
                    <img
                      src={currentThumbnailPreview}
                      alt="thumbnail"
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </div>
                </div>
              ) : null}

              {/* Navigation — delete left, pager centered (Figma) */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={deleteCurrent}
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#c00f0c] text-[#c00f0c] transition-colors hover:bg-red-50"
                  aria-label="Delete current file"
                >
                  <Trash2 size={24} />
                </button>

                <div className="flex flex-1 items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={prevImage}
                    disabled={currentIndex === 0}
                    className="inline-flex size-12 items-center justify-center rounded-full border-2 border-[#2563eb] text-[#2563eb] transition-colors hover:bg-blue-50 disabled:opacity-40"
                    aria-label="Previous file"
                  >
                    <ChevronLeft size={24} />
                  </button>

                  <span className="min-w-[3.5rem] text-center text-lg leading-[1.4] text-[#1e1e1e]">
                    {currentIndex + 1}/{files.length}
                  </span>

                  <button
                    type="button"
                    onClick={nextImage}
                    disabled={currentIndex === files.length - 1}
                    className="inline-flex size-12 items-center justify-center rounded-full border-2 border-[#2563eb] text-[#2563eb] transition-colors hover:bg-blue-50 disabled:opacity-40"
                    aria-label="Next file"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <div className={`${fieldGroupClass} min-w-[160px] flex-1`}>
                  <label className={fieldLabelClass}>Caption (Optional)</label>
                  <textarea
                    value={files[currentIndex].caption}
                    onChange={(e) => updateField("caption", e.target.value)}
                    rows={1}
                    maxLength={MAX_CAPTION_LENGTH}
                    className={`min-h-0 resize-y ${fieldInputClass(Boolean(captionError))}`}
                    placeholder="Text"
                  />
                  <div className="flex items-start justify-between gap-2">
                    {captionError ? (
                      <p className="text-sm text-red-500">{captionError}</p>
                    ) : (
                      <span />
                    )}
                    <p className="shrink-0 text-sm text-[#9ca3af]">
                      {files[currentIndex].caption?.length || 0}/{MAX_CAPTION_LENGTH}
                    </p>
                  </div>
                </div>

                {isCurrentVideo && (
                  <div className={`${fieldGroupClass} shrink-0`}>
                    <p className={fieldLabelClass}>Upload Thumbnail*</p>
                    <label
                      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-lg font-medium transition-colors ${
                        thumbnailError && isCurrentThumbnailMissing
                          ? "border border-red-500 bg-red-50 text-red-600"
                          : "bg-blue-600/10 text-[#2563eb] hover:bg-blue-600/15"
                      }`}
                    >
                      <Upload size={20} className="shrink-0" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleThumbnailUpload(e.target.files[0])}
                      />
                    </label>
                    <p className="text-sm text-[#9ca3af]">Max. 800×600 px or 300 KB</p>
                    {thumbnailError && isCurrentVideo && (
                      <p className="text-sm text-red-500">{thumbnailError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="z-10 flex shrink-0 flex-wrap items-center justify-end gap-3 bg-white pt-4">
        {onBackClick && (
          <button type="button" onClick={onBackClick} className={secondaryOutlineButtonClass}>
            Back
          </button>
        )}

        <button
          type="button"
          onClick={() => onSaveDraftClick({ files })}
          className={primaryButtonClass}
        >
          <Save size={20} className="shrink-0" />
          Save as Draft
        </button>

        <button type="button" className={primaryButtonClass} onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
}

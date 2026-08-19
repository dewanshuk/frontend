const isImageFile = (file) => {
  if (!file?.file_url) return false;
  const type = String(file.file_type || "").toUpperCase();
  if (type === "IMAGE" || type.startsWith("IMAGE/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(String(file.file_url));
};

/**
 * Flatten document-gallery API items into carousel slides (one per image).
 * Prefers explicit IMAGE files; falls back to image-like URLs.
 */
export const mapDocumentGalleryToNewsSlides = (galleryItems = []) => {
  const items = Array.isArray(galleryItems) ? galleryItems : [];
  const slides = [];

  items.forEach((item, itemIndex) => {
    const files = Array.isArray(item?.files) ? item.files : [];
    const imageFiles = files.filter(isImageFile);
    const documentId = item?.id ?? item?.document_id ?? item?.uuid ?? null;
    const documentType =
      String(item?.document_type || "Latest News and Announcements").trim() ||
      "Latest News and Announcements";
    const title = item?.name || "Untitled";
    const category = item?.document_type || "Announcement";
    const description = item?.summary || "";

    if (imageFiles.length === 0) {
      return;
    }

    imageFiles.forEach((file, fileIndex) => {
      slides.push({
        id: String(
          file?.id ??
            file?.file_id ??
            `${documentId ?? itemIndex}-${fileIndex}`,
        ),
        image: file.file_url,
        title,
        category,
        description,
        documentId: documentId != null ? String(documentId) : null,
        documentType,
      });
    });
  });

  return slides;
};

// Request mapping for one Attachments-type column.
grist.ready({
  requiredAccess: "full",
  columns: [
    {
      name: "Attachment",
      title: "Attachment column",
      type: "Attachments",
      optional: false,
    },
  ],
});

const img = document.getElementById("img");
const pdfViewer = document.getElementById("pdfViewer");
const msg = document.getElementById("msg");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let currentIndex = 0;
let attachments = [];

const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/avif",
];

const SUPPORTED_PDF_TYPE = "application/pdf";

async function buildAttachmentUrl(attId) {
  const { token, baseUrl } = await grist.docApi.getAccessToken({
    readOnly: true,
  });
  return `${baseUrl}/attachments/${attId}/download?auth=${token}`;
}

async function fetchAttachmentData(attId) {
  const url = await buildAttachmentUrl(attId);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch attachment: ${response.status}`);
    }

    const contentType = response.headers.get("Content-Type") || "";
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    return {
      contentType,
      objectUrl,
      blob,
    };
  } catch (error) {
    console.error("Error fetching attachment:", error);
    return null;
  }
}

function isSupported(contentType) {
  return (
    SUPPORTED_IMAGE_TYPES.includes(contentType) ||
    contentType === SUPPORTED_PDF_TYPE ||
    contentType.startsWith("image/") // catch other image types
  );
}

function updateNavigationButtons() {
  prevBtn.disabled = currentIndex <= 0;
  nextBtn.disabled = currentIndex >= attachments.length - 1;
}

function hideAllViewers() {
  img.hidden = true;
  pdfViewer.hidden = true;
  msg.textContent = "";
}

function showMessage(text) {
  hideAllViewers();
  msg.textContent = text;
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

function revokeObjectUrls() {
  // Clean up old object URLs to avoid memory leaks
  attachments.forEach((att) => {
    if (att.objectUrl) {
      URL.revokeObjectURL(att.objectUrl);
    }
  });
}

async function displayAttachment(index) {
  const attachment = attachments[index];

  hideAllViewers();

  if (!attachment.data) {
    attachment.data = await fetchAttachmentData(attachment.id);
  }

  if (!attachment.data) {
    msg.textContent = "Failed to load attachment.";
    return;
  }

  const { contentType, objectUrl } = attachment.data;

  if (!isSupported(contentType)) {
    msg.textContent = `Unsupported file type: ${contentType}`;
    return;
  }

  if (contentType === SUPPORTED_PDF_TYPE) {
    pdfViewer.src = objectUrl;
    pdfViewer.hidden = false;
  } else if (
    SUPPORTED_IMAGE_TYPES.includes(contentType) ||
    contentType.startsWith("image/")
  ) {
    img.src = objectUrl;
    img.hidden = false;
  }

  updateNavigationButtons();
}

async function render(record) {
  const mapped = grist.mapColumnNames(record) || {};
  const list = mapped.Attachment;

  // Clean up previous attachments
  revokeObjectUrls();

  if (!Array.isArray(list) || list.length === 0) {
    showMessage("No attachments found.");
    attachments = [];
    return;
  }

  // Store attachments with their IDs, data will be loaded on demand
  attachments = list.map((attId) => ({
    id: attId,
    data: null,
  }));

  currentIndex = 0;
  await displayAttachment(currentIndex);
}

prevBtn.addEventListener("click", async () => {
  if (currentIndex > 0) {
    currentIndex--;
    await displayAttachment(currentIndex);
  }
});

nextBtn.addEventListener("click", async () => {
  if (currentIndex < attachments.length - 1) {
    currentIndex++;
    await displayAttachment(currentIndex);
  }
});

grist.onRecord(render);

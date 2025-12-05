// Request mapping for one Attachments-type column.
grist.ready({
  requiredAccess: "full",
  columns: [
    {
      name: "Attachment", // logical name used inside the widget
      title: "Attachment column", // label shown in the mapping UI
      type: "Attachments",
      optional: false,
    },
  ],
});

const img = document.getElementById("img");
const msg = document.getElementById("msg");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let currentIndex = 0;
let imageUrls = [];

async function buildAttachmentUrl(attId) {
  // Short-lived, safe URL parts for the current document
  const { token, baseUrl } = await grist.docApi.getAccessToken({
    readOnly: true,
  });
  return `${baseUrl}/attachments/${attId}/download?auth=${token}`;
}

function updateNavigationButtons() {
  prevBtn.disabled = currentIndex <= 0;
  nextBtn.disabled = currentIndex >= imageUrls.length - 1;
}

function showMessage(text) {
  img.style.display = "none";
  msg.textContent = text;
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

async function render(record) {
  const mapped = grist.mapColumnNames(record) || {};
  const list = mapped.Attachment;

  if (!Array.isArray(list) || list.length === 0) {
    showMessage("No attachments found.");
    return;
  }

  imageUrls = await Promise.all(
    list.map(async (attId) => await buildAttachmentUrl(attId)),
  );

  if (imageUrls.length > 0) {
    currentIndex = 0;
    img.src = imageUrls[currentIndex];
    img.style.display = "block";
    msg.textContent = "";
    updateNavigationButtons();
  } else {
    showMessage("No valid images to display.");
  }
}

// Update when the selected record changes.
prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    img.src = imageUrls[currentIndex];
    updateNavigationButtons();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentIndex < imageUrls.length - 1) {
    currentIndex++;
    img.src = imageUrls[currentIndex];
    updateNavigationButtons();
  }
});

// Update when the selected record changes.
grist.onRecord(render);

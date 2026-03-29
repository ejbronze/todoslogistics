const state = {
    currentStep: 1,
    currentDocType: "quote",
    itemCounter: 0,
    documents: JSON.parse(localStorage.getItem("rgLogisticsDocuments") || "[]"),
    clients: [],
    editingDocumentId: null,
    convertingFromQuoteId: null,
    activeFilter: "all",
    searchQuery: ""
};

const DOP_PER_USD = 59;

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    bindEvents();
    init();
});

function cacheElements() {
    elements.documentModal = document.getElementById("documentModal");
    elements.stepIndicator = document.querySelector(".step-indicator");
    elements.modalTitle = document.getElementById("modalTitle");
    elements.documentsGrid = document.getElementById("documentsGrid");
    elements.docType = document.getElementById("docType");
    elements.refNumber = document.getElementById("refNumber");
    elements.docDate = document.getElementById("docDate");
    elements.poNumber = document.getElementById("poNumber");
    elements.docTags = document.getElementById("docTags");
    elements.clientSelect = document.getElementById("clientSelect");
    elements.clientName = document.getElementById("clientName");
    elements.clientAddress = document.getElementById("clientAddress");
    elements.notes = document.getElementById("notes");
    elements.paymentTerms = document.getElementById("paymentTerms");
    elements.includeSignature = document.getElementById("includeSignature");
    elements.itemsContainer = document.getElementById("itemsContainer");
    elements.lineItemsPreviewContainer = document.getElementById("lineItemsPreviewContainer");
    elements.previewContainer = document.getElementById("previewContainer");
    elements.prevBtn = document.getElementById("prevBtn");
    elements.nextBtn = document.getElementById("nextBtn");
    elements.saveBtn = document.getElementById("saveBtn");
    elements.newQuoteBtn = document.getElementById("newQuoteBtn");
    elements.newInvoiceBtn = document.getElementById("newInvoiceBtn");
    elements.closeModalBtn = document.getElementById("closeModalBtn");
    elements.saveClientBtn = document.getElementById("saveClientBtn");
    elements.addItemBtn = document.getElementById("addItemBtn");
    elements.totalDocumentsStat = document.getElementById("totalDocumentsStat");
    elements.quoteCountStat = document.getElementById("quoteCountStat");
    elements.invoiceCountStat = document.getElementById("invoiceCountStat");
    elements.totalValueStat = document.getElementById("totalValueStat");
    elements.documentSearch = document.getElementById("documentSearch");
    elements.filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
    elements.stepIntroTitle = document.getElementById("stepIntroTitle");
    elements.stepIntroText = document.getElementById("stepIntroText");
    elements.summaryDocType = document.getElementById("summaryDocType");
    elements.summaryRef = document.getElementById("summaryRef");
    elements.summaryDate = document.getElementById("summaryDate");
    elements.summaryClient = document.getElementById("summaryClient");
    elements.summaryAddress = document.getElementById("summaryAddress");
    elements.summaryItems = document.getElementById("summaryItems");
    elements.summaryTotal = document.getElementById("summaryTotal");
    elements.summaryTags = document.getElementById("summaryTags");
    elements.sidebarTip = document.getElementById("sidebarTip");
}

function bindEvents() {
    elements.newQuoteBtn.addEventListener("click", () => {
        prepareNewDocument("quote");
        openModal("quote");
    });
    elements.newInvoiceBtn.addEventListener("click", () => {
        prepareNewDocument("invoice");
        openModal("invoice");
    });
    elements.closeModalBtn.addEventListener("click", closeModal);
    elements.docType.addEventListener("change", updateModalTitle);
    elements.refNumber.addEventListener("input", handleRefNumberInput);
    elements.clientSelect.addEventListener("change", onClientSelectChange);
    elements.saveClientBtn.addEventListener("click", saveClient);
    elements.addItemBtn.addEventListener("click", addItem);
    elements.prevBtn.addEventListener("click", prevStep);
    elements.nextBtn.addEventListener("click", nextStep);
    elements.saveBtn.addEventListener("click", saveDocument);
    elements.stepIndicator.addEventListener("click", handleStepIndicatorClick);
    elements.documentsGrid.addEventListener("click", handleDocumentCardClick);
    elements.itemsContainer.addEventListener("click", handleItemContainerClick);
    elements.itemsContainer.addEventListener("input", handleItemsChange);
    elements.itemsContainer.addEventListener("change", handleItemsChange);
    elements.documentSearch.addEventListener("input", handleSearchInput);
    elements.filterButtons.forEach(button => {
        button.addEventListener("click", () => setActiveFilter(button.dataset.filter));
    });

    elements.documentModal.addEventListener("click", event => {
        if (event.target === elements.documentModal) {
            closeModal();
        }
    });

    elements.documentModal.addEventListener("input", updateEditorSummary);
    elements.documentModal.addEventListener("change", updateEditorSummary);
}

function init() {
    loadClients();
    renderClientOptions();
    prepareNewDocument("quote");
    renderDocuments();
}

function setToday() {
    const today = new Date().toISOString().split("T")[0];
    elements.docDate.value = today;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2
    }).format(Number(amount || 0));
}

function formatAmount(amount) {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(amount || 0));
}

function getStepContent(step) {
    const stepContent = {
        1: {
            title: "Type & Info",
            text: "Choose the document type, confirm the date, and set the reference details.",
            tip: "Use tags for destination, customer segment, or priority so future searches are faster."
        },
        2: {
            title: "Client Details",
            text: "Select an existing client or enter a new one, then capture the address exactly as it should appear on the document.",
            tip: "Saved clients help you move much faster on repeat work and keep naming consistent."
        },
        3: {
            title: "Line Items",
            text: "Add services, pricing, and payment terms. Unit price is derived automatically unless you switch to manual mode.",
            tip: "Keep item descriptions short and specific. The table stays cleaner when each service is one line item."
        },
        4: {
            title: "Items Preview",
            text: "Review the line items, notes, and totals in document form before moving to the final print preview.",
            tip: "This step is useful for catching quantity, unit price, and subtotal issues before you check the full page layout."
        },
        5: {
            title: "Review",
            text: "Check the final layout before saving and exporting the PDF.",
            tip: "This preview mirrors the live document structure, so it is the fastest way to catch layout mistakes before print."
        }
    };

    return stepContent[step] || stepContent[1];
}

function updateEditorSummary() {
    const docType = elements.docType.value === "invoice" ? "Invoice" : "Quote";
    const clientName = elements.clientName.value.trim();
    const clientAddress = elements.clientAddress.value.trim();
    const tags = parseTags(elements.docTags.value);
    const itemCount = elements.itemsContainer.querySelectorAll(".item-row").length;
    const stepContent = getStepContent(state.currentStep);

    elements.stepIntroTitle.textContent = stepContent.title;
    elements.stepIntroText.textContent = stepContent.text;
    elements.sidebarTip.textContent = stepContent.tip;

    elements.summaryDocType.textContent = docType;
    elements.summaryRef.textContent = elements.refNumber.value ? `Ref ${elements.refNumber.value}` : "Ref pending";
    elements.summaryDate.textContent = elements.docDate.value ? formatDisplayDate(elements.docDate.value) : "Date pending";
    elements.summaryClient.textContent = clientName || "No client selected";
    elements.summaryAddress.textContent = clientAddress || "Choose or enter a client to continue.";
    elements.summaryItems.textContent = String(itemCount);
    elements.summaryTotal.textContent = formatCurrency(calculateTotals());

    elements.summaryTags.innerHTML = tags.length
        ? tags.map(tag => `<span class="sidebar-tag">${escapeHtml(tag)}</span>`).join("")
        : '<span class="sidebar-tag muted">No tags yet</span>';

    if (state.currentStep >= 4) {
        generatePreviews();
    }
}

function parseTags(value) {
    return String(value || "")
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean)
        .filter((tag, index, tags) => tags.findIndex(entry => entry.toLowerCase() === tag.toLowerCase()) === index);
}

function getRefPrefix() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `TL-${year}-${month}${day}`;
}

function getNextRefSequence() {
    const matchingNumbers = state.documents
        .map(doc => {
            const match = String(doc.refNumber).match(/^TL-\d{4}-\d{4}-(\d+)$/);
            return match ? Number(match[1]) : 0;
        })
        .filter(Boolean);

    return String((matchingNumbers.length ? Math.max(...matchingNumbers) : 0) + 1).padStart(2, "0");
}

function handleRefNumberInput() {
    const prefix = getRefPrefix();
    const digitSuffix = elements.refNumber.value.replace(/\D/g, "").slice(-2);
    const fallbackSuffix = getNextRefSequence();
    elements.refNumber.value = `${prefix}-${digitSuffix || fallbackSuffix}`;
    updateEditorSummary();
}

function generateRefNumber() {
    if (state.editingDocumentId !== null && state.convertingFromQuoteId === null) {
        return;
    }

    const prefix = getRefPrefix();
    const existingMatch = String(elements.refNumber.value).match(new RegExp(`^${prefix}-(\\d{1,2})$`));
    const suffix = existingMatch ? existingMatch[1].padStart(2, "0") : getNextRefSequence();
    elements.refNumber.value = `${prefix}-${suffix}`;
}

function openModal(type = "quote") {
    state.currentDocType = type;
    elements.docType.value = type;
    updateModalTitle();
    elements.documentModal.classList.add("active");
    elements.documentModal.setAttribute("aria-hidden", "false");
    goToStep(1);
}

function closeModal() {
    elements.documentModal.classList.remove("active");
    elements.documentModal.classList.remove("review-mode");
    elements.documentModal.setAttribute("aria-hidden", "true");
    resetForm();
}

function updateModalTitle() {
    const type = elements.docType.value;
    state.currentDocType = type;
    const docLabel = type === "quote" ? "Quote" : "Invoice";
    if (state.editingDocumentId !== null) {
        elements.modalTitle.textContent = `Edit ${docLabel}`;
    } else if (state.convertingFromQuoteId !== null) {
        elements.modalTitle.textContent = `Convert to ${docLabel}`;
    } else {
        elements.modalTitle.textContent = `New ${docLabel}`;
    }

    elements.saveBtn.textContent = state.editingDocumentId !== null ? "Update & Export PDF" : "Save & Export PDF";
    generateRefNumber();
}

function resetForm() {
    state.editingDocumentId = null;
    state.convertingFromQuoteId = null;
    elements.clientSelect.value = "";
    elements.clientName.value = "";
    elements.clientAddress.value = "";
    elements.poNumber.value = "";
    elements.docTags.value = "";
    elements.notes.value = "";
    elements.paymentTerms.value = "Payment Upon Receipt";
    elements.includeSignature.checked = true;
    elements.itemsContainer.innerHTML = "";
    state.itemCounter = 0;
    addItem();
    setToday();
    generateRefNumber();
    updateModalTitle();
}

function prepareNewDocument(type = "quote") {
    state.editingDocumentId = null;
    state.convertingFromQuoteId = null;
    elements.itemsContainer.innerHTML = "";
    state.itemCounter = 0;
    addItem();
    elements.clientSelect.value = "";
    elements.clientName.value = "";
    elements.clientAddress.value = "";
    elements.poNumber.value = "";
    elements.docTags.value = "";
    elements.notes.value = "";
    elements.paymentTerms.value = "Payment Upon Receipt";
    elements.includeSignature.checked = true;
    elements.docType.value = type;
    setToday();
    updateModalTitle();
}

function goToStep(step) {
    state.currentStep = step;
    elements.documentModal.classList.toggle("review-mode", step === 5);

    document.querySelectorAll(".step").forEach((el, idx) => {
        el.classList.remove("active", "completed");
        if (idx + 1 < step) {
            el.classList.add("completed");
        }
        if (idx + 1 === step) {
            el.classList.add("active");
        }
    });

    document.querySelectorAll(".form-step").forEach((el, idx) => {
        const stepNumber = idx + 1;
        el.classList.toggle("active", stepNumber === step);
    });

    elements.prevBtn.style.display = step > 1 ? "block" : "none";
    elements.nextBtn.style.display = step < 5 ? "block" : "none";
    elements.saveBtn.style.display = step === 5 ? "block" : "none";

    if (step >= 4) {
        generatePreviews();
    }

    updateEditorSummary();
}

function nextStep() {
    if (validateStep(state.currentStep)) {
        goToStep(state.currentStep + 1);
    }
}

function prevStep() {
    goToStep(state.currentStep - 1);
}

function handleStepIndicatorClick(event) {
    const stepButton = event.target.closest(".step[data-step]");
    if (!stepButton) {
        return;
    }

    const targetStep = Number(stepButton.dataset.step);
    if (!targetStep || targetStep === state.currentStep) {
        return;
    }

    if (targetStep > state.currentStep) {
        for (let step = state.currentStep; step < targetStep; step += 1) {
            if (!validateStep(step)) {
                return;
            }
        }
    }

    goToStep(targetStep);
}

function validateStep(step) {
    if (step === 2 && !elements.clientName.value.trim()) {
        alert("Please enter client name");
        return false;
    }

    if (step === 3 && elements.itemsContainer.querySelectorAll(".item-row").length === 0) {
        alert("Please add at least one item");
        return false;
    }

    return true;
}

function addItem() {
    state.itemCounter += 1;
    const itemId = String(state.itemCounter);

    const itemDiv = document.createElement("div");
    itemDiv.className = "item-row expanded";
    itemDiv.dataset.itemId = itemId;
    itemDiv.innerHTML = `
        <div class="item-row-header">
            <button type="button" class="item-summary-toggle" data-toggle-item="${itemId}" aria-expanded="true">
                <span class="item-number">Item #${state.itemCounter}</span>
                <span class="item-summary-copy">
                    <span class="item-summary-title">New line item</span>
                    <span class="item-summary-meta">Qty 1 | Unit $0.00 | Total $0.00</span>
                </span>
                <span class="item-summary-hint">Click to edit</span>
            </button>
            <button type="button" class="remove-item" data-remove-item="${itemId}">Remove</button>
        </div>
        <div class="item-editor">
            <div class="form-group">
                <label>Description</label>
                <textarea class="item-description" rows="2" placeholder="Item description..."></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" class="item-quantity" value="1" min="0" step="1">
                </div>
                <div class="form-group">
                    <label>Total Price (USD)</label>
                    <input type="number" class="item-total-price" value="0" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label class="inline-toggle-label">
                        <span>Unit Price (USD)</span>
                        <span class="inline-checkbox">
                            <input type="checkbox" class="item-manual-unit-toggle">
                            <span>Manual</span>
                        </span>
                    </label>
                    <input type="number" class="item-unit-price" value="0.00" min="0" step="0.01" readonly>
                    <small class="field-help">Default behavior calculates unit price automatically from total price and quantity.</small>
                </div>
            </div>
            <div class="form-group item-currency-mode">
                <label class="checkbox-row">
                    <input type="checkbox" class="item-dop-toggle">
                    <span>Enter total price in DOP</span>
                </label>
                <small class="field-help">If enabled, the app converts the DOP total to USD using RD$${DOP_PER_USD} per US$1.</small>
            </div>
            <div class="form-row item-dop-row" style="display: none;">
                <div class="form-group">
                    <label>Total Price (DOP)</label>
                    <input type="number" class="item-total-price-dop" value="0" min="0" step="0.01">
                </div>
            </div>
            <div class="item-internal-panel">
                <div class="item-internal-header">
                    <h6>Internal Only</h6>
                    <p>Not included in the final printout.</p>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Internal Cost (USD)</label>
                        <input type="number" class="item-internal-cost" value="0" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Upcharge %</label>
                        <input type="text" class="item-upcharge-percent" value="0.00%" readonly>
                        <small class="field-help">Calculated from selling total versus internal cost.</small>
                    </div>
                </div>
            </div>
        </div>
    `;

    elements.itemsContainer.appendChild(itemDiv);
    updateItemPricing(itemDiv);
    setExpandedItem(itemDiv);
}

function removeItem(id) {
    const item = elements.itemsContainer.querySelector(`[data-item-id="${id}"]`);
    if (item) {
        const shouldExpandNeighbor = item.classList.contains("expanded");
        item.remove();
        refreshItemOrdering();
        if (shouldExpandNeighbor) {
            const nextItem = elements.itemsContainer.querySelector(".item-row");
            if (nextItem) {
                setExpandedItem(nextItem);
            }
        }
    }
}

function handleItemContainerClick(event) {
    const removeButton = event.target.closest("[data-remove-item]");
    if (removeButton) {
        removeItem(removeButton.dataset.removeItem);
        return;
    }

    const toggleButton = event.target.closest("[data-toggle-item]");
    if (toggleButton) {
        const item = elements.itemsContainer.querySelector(`[data-item-id="${toggleButton.dataset.toggleItem}"]`);
        if (item) {
            setExpandedItem(item);
        }
    }
}

function handleItemsChange() {
    elements.itemsContainer.querySelectorAll(".item-row").forEach(row => {
        updateItemPricing(row);
        updateItemSummary(row);
    });
    calculateTotals();
    updateEditorSummary();
}

function updateItemPricing(row) {
    const quantity = parseFloat(row.querySelector(".item-quantity").value) || 0;
    const totalPriceInput = row.querySelector(".item-total-price");
    const unitPriceInput = row.querySelector(".item-unit-price");
    const dopToggle = row.querySelector(".item-dop-toggle");
    const dopRow = row.querySelector(".item-dop-row");
    const dopTotalPriceInput = row.querySelector(".item-total-price-dop");
    const manualToggle = row.querySelector(".item-manual-unit-toggle");

    let totalPrice = parseFloat(totalPriceInput.value) || 0;
    const isManual = manualToggle.checked;
    const usesDopTotal = dopToggle.checked;

    if (isManual && usesDopTotal) {
        dopToggle.checked = false;
    }

    const isUsingDopTotal = dopToggle.checked;
    dopRow.style.display = isUsingDopTotal ? "grid" : "none";
    unitPriceInput.readOnly = !isManual;
    totalPriceInput.readOnly = isUsingDopTotal;

    if (isManual) {
        const manualUnitPrice = parseFloat(unitPriceInput.value) || 0;
        unitPriceInput.value = manualUnitPrice.toFixed(2);
        totalPriceInput.value = (manualUnitPrice * quantity).toFixed(2);
        dopTotalPriceInput.value = (manualUnitPrice * quantity * DOP_PER_USD).toFixed(2);
    } else {
        if (isUsingDopTotal) {
            const dopTotal = parseFloat(dopTotalPriceInput.value) || 0;
            totalPrice = dopTotal / DOP_PER_USD;
            totalPriceInput.value = totalPrice.toFixed(2);
        } else {
            dopTotalPriceInput.value = (totalPrice * DOP_PER_USD).toFixed(2);
        }
        const derivedUnitPrice = quantity > 0 ? totalPrice / quantity : 0;
        unitPriceInput.value = derivedUnitPrice.toFixed(2);
    }

    updateItemInternalMetrics(row);
}

function updateItemSummary(row) {
    const description = row.querySelector(".item-description").value.trim();
    const quantity = parseFloat(row.querySelector(".item-quantity").value) || 0;
    const totalPrice = parseFloat(row.querySelector(".item-total-price").value) || 0;
    const unitPrice = parseFloat(row.querySelector(".item-unit-price").value) || 0;
    const usesDopTotal = row.querySelector(".item-dop-toggle").checked;
    const dopTotalPrice = parseFloat(row.querySelector(".item-total-price-dop").value) || 0;
    const upchargePercent = row.querySelector(".item-upcharge-percent").value;
    const title = description || "New line item";
    const compactTitle = title.length > 72 ? `${title.slice(0, 69)}...` : title;
    const totalLabel = usesDopTotal
        ? `Total ${formatCurrency(totalPrice)} from RD$${formatAmount(dopTotalPrice)}`
        : `Total ${formatCurrency(totalPrice)}`;

    row.querySelector(".item-summary-title").textContent = compactTitle;
    row.querySelector(".item-summary-meta").textContent = `Qty ${quantity || 0} | Unit ${formatCurrency(unitPrice)} | ${totalLabel} | Upcharge ${upchargePercent}`;
}

function updateItemInternalMetrics(row) {
    const totalPrice = parseFloat(row.querySelector(".item-total-price").value) || 0;
    const internalCost = parseFloat(row.querySelector(".item-internal-cost").value) || 0;
    const upchargeField = row.querySelector(".item-upcharge-percent");

    if (internalCost <= 0) {
        upchargeField.value = "0.00%";
        return;
    }

    const markupPercent = ((totalPrice - internalCost) / internalCost) * 100;
    upchargeField.value = `${formatAmount(markupPercent)}%`;
}

function refreshItemOrdering() {
    elements.itemsContainer.querySelectorAll(".item-row").forEach((row, index) => {
        row.querySelector(".item-number").textContent = `Item #${index + 1}`;
        updateItemSummary(row);
    });
}

function setExpandedItem(targetRow) {
    elements.itemsContainer.querySelectorAll(".item-row").forEach(row => {
        const isTarget = row === targetRow;
        row.classList.toggle("expanded", isTarget);
        const toggle = row.querySelector(".item-summary-toggle");
        if (toggle) {
            toggle.setAttribute("aria-expanded", String(isTarget));
        }
    });
}

function calculateTotals() {
    let subtotal = 0;
    elements.itemsContainer.querySelectorAll(".item-row").forEach(row => {
        const totalPrice = parseFloat(row.querySelector(".item-total-price").value) || 0;
        subtotal += totalPrice;
    });
    return subtotal;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDisplayDate(dateValue) {
    if (!dateValue) {
        return "";
    }

    return new Date(dateValue).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function formatPrintedDate(dateValue = new Date()) {
    return new Date(dateValue).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function getLetterheadUrl() {
    return new URL("assets/rg-letterhead.png", window.location.href).href;
}

function getSignatureUrl() {
    const url = new URL("assets/david-forman-signature.png", window.location.href);
    url.searchParams.set("v", "20260328-1434");
    return url.href;
}

function getFooterWaveUrl() {
    return new URL("assets/rg-footer-wave.png", window.location.href).href;
}

function buildDocumentData() {
    const items = [];

    elements.itemsContainer.querySelectorAll(".item-row").forEach((row, index) => {
        const quantity = parseFloat(row.querySelector(".item-quantity").value) || 0;
        const totalPrice = parseFloat(row.querySelector(".item-total-price").value) || 0;
        const isManualUnitPrice = row.querySelector(".item-manual-unit-toggle").checked;
        const usesDopTotal = row.querySelector(".item-dop-toggle").checked;
        const totalPriceDop = parseFloat(row.querySelector(".item-total-price-dop").value) || 0;
        const internalCost = parseFloat(row.querySelector(".item-internal-cost").value) || 0;
        const unitPrice = isManualUnitPrice
            ? (parseFloat(row.querySelector(".item-unit-price").value) || 0)
            : (quantity > 0 ? totalPrice / quantity : 0);
        items.push({
            itemNo: index + 1,
            description: row.querySelector(".item-description").value.trim(),
            quantity: row.querySelector(".item-quantity").value || "-",
            unitPrice: unitPrice.toFixed(2),
            totalPrice: totalPrice.toFixed(2),
            totalPriceDop: totalPriceDop.toFixed(2),
            internalCost: internalCost.toFixed(2),
            upchargePercent: internalCost > 0 ? (((totalPrice - internalCost) / internalCost) * 100).toFixed(2) : "0.00",
            usesDopTotal,
            manualUnitPrice: isManualUnitPrice
        });
    });

    const subtotal = calculateTotals();

    return {
        type: elements.docType.value,
        refNumber: elements.refNumber.value,
        date: elements.docDate.value,
        clientName: elements.clientName.value,
        clientAddress: elements.clientAddress.value,
        poNumber: elements.poNumber.value || "N/A",
        tags: parseTags(elements.docTags.value),
        notes: elements.notes.value,
        paymentTerms: elements.paymentTerms.value,
        includeSignature: elements.includeSignature.checked,
        printedAt: new Date().toISOString(),
        subtotal,
        total: subtotal,
        items
    };
}

function buildDocumentMarkup(doc) {
    const documentTitle = doc.type === "quote" ? "Quote" : "Invoice";
    const safeNotes = doc.notes && doc.notes.trim()
        ? escapeHtml(doc.notes.trim())
        : "<em>*No additional notes provided.</em>";

    const itemsHTML = doc.items.map((item, index) => {
        const quantity = item.quantity ?? "-";
        const lineTotal = item.totalPrice ?? ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2);
        const unitPrice = item.unitPrice ?? (parseFloat(item.quantity) > 0
            ? ((parseFloat(lineTotal) || 0) / (parseFloat(item.quantity) || 1)).toFixed(2)
            : "0.00");
        const formattedUnitPrice = `$${formatAmount(unitPrice)}`;
        const formattedLineTotal = formatAmount(lineTotal);

        return `
            <tr>
                <td>${escapeHtml(item.itemNo || index + 1)}</td>
                <td>${escapeHtml(item.description || "")}</td>
                <td>${escapeHtml(quantity)}</td>
                <td>${escapeHtml(formattedUnitPrice)}</td>
                <td>${escapeHtml(formattedLineTotal)}</td>
            </tr>
        `;
    }).join("");

    return `
        <div class="document-sheet">
            <div class="letterhead">
                <img class="letterhead-image" src="${escapeHtml(getLetterheadUrl())}" alt="Todos Logistics letterhead">
            </div>

            <div class="document-title">${documentTitle}</div>

            <div class="document-body">
            <div class="document-meta">
                <div><strong>${documentTitle} Reference:</strong> ${escapeHtml(doc.refNumber)}</div>
                <div><strong>Date:</strong> <span class="meta-date-value">${escapeHtml(formatDisplayDate(doc.date))}</span></div>
            </div>

            <div class="document-parties">
                <div>
                    <div class="issued-to-label"><strong>Issued To:</strong></div>
                    <div class="issued-to-value">
                        ${escapeHtml(doc.clientName)}<br>
                        ${escapeHtml(doc.clientAddress).replace(/\n/g, "<br>")}
                    </div>
                </div>
                <div><span class="po-label">Purchase Order Number:</span> ${escapeHtml(doc.poNumber || "N/A")}</div>
            </div>

            <table class="document-items">
                <colgroup>
                    <col style="width: 11%;">
                    <col style="width: 47%;">
                    <col style="width: 12%;">
                    <col style="width: 12%;">
                    <col style="width: 18%;">
                </colgroup>
                <thead>
                    <tr>
                        <th>Item no.</th>
                        <th>Item Description:</th>
                        <th>Quantity:</th>
                        <th>Unit Price<br>$USD</th>
                        <th>Total Price<br>$USD</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div class="document-divider"></div>

            <div class="document-notes">
                <div class="notes-label"><strong>Notes:</strong></div>
                <div class="document-notes-content">${safeNotes}</div>
            </div>

            <div class="document-bottom">
                <div class="document-terms">
                    <span class="terms-label"><strong>Terms of Payment:</strong></span>
                    ${escapeHtml(doc.paymentTerms || "Payment Upon Receipt")}
                </div>

                <table class="document-totals">
                    <colgroup>
                        <col style="width: 58%;">
                        <col style="width: 42%;">
                    </colgroup>
                    <tr>
                        <td>Subtotal</td>
                        <td>USD $ ${escapeHtml(formatAmount(doc.subtotal))}</td>
                    </tr>
                    <tr>
                        <td>ITBIS (TAX)</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td><strong>Grand Total</strong></td>
                        <td><strong>USD $ ${escapeHtml(formatAmount(doc.total))}</strong></td>
                    </tr>
                </table>
            </div>

            ${doc.includeSignature === false ? "" : `
            <div class="document-signatures">
                <div class="signature-block">
                    <div class="signature-row">
                        <span class="signature-label">Approved By:</span>
                        <span class="signature-line">
                            <span class="line-fill approved-by-name">David Forman</span>
                        </span>
                    </div>
                    <div class="signature-row signature-image-row">
                        <span class="signature-label">Signature:</span>
                        <span class="signature-line signature-image-line">
                            <span class="line-fill">
                                <img
                                    class="signature-image"
                                    src="${escapeHtml(getSignatureUrl())}"
                                    alt="David Forman signature"
                                    onerror="this.closest('.line-fill').innerHTML = '&nbsp;';"
                                >
                            </span>
                        </span>
                    </div>
                </div>
            </div>
            `}
            </div>

            <img class="footer-wave" src="${escapeHtml(getFooterWaveUrl())}" alt="" aria-hidden="true">
        </div>
    `;
}

function buildLineItemsPreviewMarkup(doc) {
    const documentTitle = doc.type === "quote" ? "Quote" : "Invoice";
    const safeNotes = doc.notes && doc.notes.trim()
        ? escapeHtml(doc.notes.trim())
        : "<em>*No additional notes provided.</em>";

    const itemsHTML = doc.items.map((item, index) => {
        const quantity = item.quantity ?? "-";
        const lineTotal = item.totalPrice ?? ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2);
        const unitPrice = item.unitPrice ?? (parseFloat(item.quantity) > 0
            ? ((parseFloat(lineTotal) || 0) / (parseFloat(item.quantity) || 1)).toFixed(2)
            : "0.00");
        const formattedUnitPrice = `$${formatAmount(unitPrice)}`;
        const formattedLineTotal = formatAmount(lineTotal);

        return `
            <tr>
                <td>${escapeHtml(item.itemNo || index + 1)}</td>
                <td>${escapeHtml(item.description || "")}</td>
                <td>${escapeHtml(quantity)}</td>
                <td>${escapeHtml(formattedUnitPrice)}</td>
                <td>${escapeHtml(formattedLineTotal)}</td>
            </tr>
        `;
    }).join("");

    return `
        <div class="document-sheet line-items-review-sheet">
            <div class="line-items-review-header">
                <div class="line-items-review-kicker">${documentTitle} line item review</div>
                <div class="line-items-review-ref">${escapeHtml(doc.refNumber || "Reference pending")}</div>
            </div>

            <div class="document-meta">
                <div><strong>Issued To:</strong> ${escapeHtml(doc.clientName || "Client pending")}</div>
                <div><strong>Date:</strong> <span class="meta-date-value">${escapeHtml(formatDisplayDate(doc.date))}</span></div>
            </div>

            <table class="document-items">
                <colgroup>
                    <col style="width: 11%;">
                    <col style="width: 47%;">
                    <col style="width: 12%;">
                    <col style="width: 12%;">
                    <col style="width: 18%;">
                </colgroup>
                <thead>
                    <tr>
                        <th>Item no.</th>
                        <th>Item Description:</th>
                        <th>Quantity:</th>
                        <th>Unit Price<br>$USD</th>
                        <th>Total Price<br>$USD</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div class="document-divider"></div>

            <div class="document-notes">
                <div class="notes-label"><strong>Notes:</strong></div>
                <div class="document-notes-content">${safeNotes}</div>
            </div>

            <div class="document-bottom">
                <div class="document-terms">
                    <span class="terms-label"><strong>Terms of Payment:</strong></span>
                    ${escapeHtml(doc.paymentTerms || "Payment Upon Receipt")}
                </div>

                <table class="document-totals">
                    <colgroup>
                        <col style="width: 58%;">
                        <col style="width: 42%;">
                    </colgroup>
                    <tr>
                        <td>Subtotal</td>
                        <td>USD $ ${escapeHtml(formatAmount(doc.subtotal))}</td>
                    </tr>
                    <tr>
                        <td>ITBIS (TAX)</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td><strong>Grand Total</strong></td>
                        <td><strong>USD $ ${escapeHtml(formatAmount(doc.total))}</strong></td>
                    </tr>
                </table>
            </div>
        </div>
    `;
}

function generatePreviews() {
    const doc = buildDocumentData();
    if (elements.lineItemsPreviewContainer) {
        elements.lineItemsPreviewContainer.innerHTML = buildLineItemsPreviewMarkup(doc);
    }
    elements.previewContainer.innerHTML = buildDocumentMarkup(doc);
}

function getPrintStylesMarkup() {
    return Array.from(document.styleSheets).map(styleSheet => {
        try {
            const rules = Array.from(styleSheet.cssRules || []).map(rule => rule.cssText).join("\n");
            return `<style>${rules}</style>`;
        } catch (error) {
            return "";
        }
    }).join("\n");
}

function openPrintWindow(doc) {
    const printWindow = window.open("", "_blank", "width=1024,height=900");
    if (!printWindow) {
        alert("Please allow pop-ups to export the PDF.");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${escapeHtml((doc.type === "quote" ? "Quote" : "Invoice") + " " + doc.refNumber)}</title>
            ${getPrintStylesMarkup()}
        </head>
        <body class="print-window">
            <div id="previewContainer" class="preview-container">${buildDocumentMarkup(doc)}</div>
            <script>
                window.onload = function () {
                    window.print();
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function saveDocument() {
    const isEditing = state.editingDocumentId !== null;
    const doc = {
        id: state.editingDocumentId ?? Date.now(),
        type: elements.docType.value,
        refNumber: elements.refNumber.value,
        date: elements.docDate.value,
        clientName: elements.clientName.value,
        clientAddress: elements.clientAddress.value,
        poNumber: elements.poNumber.value,
        tags: parseTags(elements.docTags.value),
        notes: elements.notes.value,
        paymentTerms: elements.paymentTerms.value,
        includeSignature: elements.includeSignature.checked,
        printedAt: new Date().toISOString(),
        items: [],
        subtotal: 0,
        total: 0
    };

    elements.itemsContainer.querySelectorAll(".item-row").forEach(row => {
        const qty = parseFloat(row.querySelector(".item-quantity").value) || 0;
        const totalPrice = parseFloat(row.querySelector(".item-total-price").value) || 0;
        const usesDopTotal = row.querySelector(".item-dop-toggle").checked;
        const totalPriceDop = parseFloat(row.querySelector(".item-total-price-dop").value) || 0;
        const internalCost = parseFloat(row.querySelector(".item-internal-cost").value) || 0;
        const manualUnitPrice = row.querySelector(".item-manual-unit-toggle").checked
            ? (parseFloat(row.querySelector(".item-unit-price").value) || 0)
            : null;
        doc.items.push({
            description: row.querySelector(".item-description").value,
            quantity: qty,
            price: manualUnitPrice ?? (qty > 0 ? totalPrice / qty : 0),
            unitPrice: manualUnitPrice ?? (qty > 0 ? totalPrice / qty : 0),
            totalPrice,
            totalPriceDop,
            internalCost,
            upchargePercent: internalCost > 0 ? (((totalPrice - internalCost) / internalCost) * 100) : 0,
            usesDopTotal,
            manualUnitPrice: manualUnitPrice !== null
        });
    });

    doc.subtotal = calculateTotals();
    doc.total = doc.subtotal;

    if (isEditing) {
        state.documents = state.documents.map(entry => entry.id === state.editingDocumentId ? doc : entry);
    } else {
        if (state.convertingFromQuoteId !== null) {
            doc.sourceQuoteId = state.convertingFromQuoteId;
            state.documents = state.documents.map(entry => entry.id === state.convertingFromQuoteId
                ? {
                    ...entry,
                    lockedAfterConversion: true,
                    convertedDocumentId: doc.id
                }
                : entry);
        }
        state.documents.unshift(doc);
    }

    localStorage.setItem("rgLogisticsDocuments", JSON.stringify(state.documents));
    openPrintWindow(doc);

    closeModal();
    renderDocuments();

    const actionLabel = isEditing ? "updated" : "saved";
    alert(`${doc.type === "quote" ? "Quote" : "Invoice"} ${actionLabel} successfully.\n\nThe print dialog has opened so you can save it as a PDF.`);
}

function updateOverviewStats() {
    const quoteCount = state.documents.filter(doc => doc.type === "quote").length;
    const invoiceCount = state.documents.filter(doc => doc.type === "invoice").length;
    const totalValue = state.documents.reduce((sum, doc) => sum + Number(doc.total || 0), 0);

    elements.totalDocumentsStat.textContent = String(state.documents.length);
    elements.quoteCountStat.textContent = String(quoteCount);
    elements.invoiceCountStat.textContent = String(invoiceCount);
    elements.totalValueStat.textContent = formatCurrency(totalValue);
}

function getFilteredDocuments() {
    return state.documents.filter(doc => {
        const matchesType = state.activeFilter === "all" || doc.type === state.activeFilter;
        const rawDate = String(doc.date || "");
        const formattedDate = formatDisplayDate(doc.date || "");
        const tags = Array.isArray(doc.tags) ? doc.tags.join(" ") : "";
        const haystack = `${doc.refNumber} ${doc.clientName} ${doc.type} ${rawDate} ${formattedDate} ${tags}`.toLowerCase();
        const matchesSearch = !state.searchQuery || haystack.includes(state.searchQuery);
        return matchesType && matchesSearch;
    });
}

function renderDocuments() {
    updateOverviewStats();

    const visibleDocuments = getFilteredDocuments();

    if (state.documents.length === 0) {
        elements.documentsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"></path>
                </svg>
                <p>No documents yet. Create your first quote or invoice!</p>
            </div>
        `;
        return;
    }

    if (visibleDocuments.length === 0) {
        elements.documentsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <p>No documents match your current search or filter.</p>
            </div>
        `;
        return;
    }

    elements.documentsGrid.innerHTML = visibleDocuments.map(doc => {
        const date = new Date(doc.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
        const tags = Array.isArray(doc.tags) ? doc.tags : [];
        const isLockedSourceQuote = Boolean(doc.lockedAfterConversion);
        const cardViewId = isLockedSourceQuote ? "" : ` data-view-id="${doc.id}"`;
        const statusBadge = isLockedSourceQuote
            ? '<span class="doc-lock-badge">Converted Source</span>'
            : "";

        return `
            <div class="document-card${isLockedSourceQuote ? " document-card-locked" : ""}"${cardViewId}>
                <div class="doc-header">
                    <span class="doc-type ${doc.type}">${doc.type}</span>
                    <div class="doc-date">${date}</div>
                </div>
                <div class="doc-ref">${doc.refNumber}</div>
                <div class="doc-client">${escapeHtml(doc.clientName)}</div>
                ${statusBadge}
                ${tags.length ? `<div class="doc-tags">${tags.map(tag => `<span class="doc-tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
                <div class="doc-total">${formatCurrency(doc.total || 0)}</div>
                <div class="doc-actions">
                    ${isLockedSourceQuote ? '<span class="doc-lock-note">Locked after conversion</span>' : `<button type="button" class="doc-action-btn" data-action="edit" data-id="${doc.id}">Edit</button>`}
                    ${doc.type === "quote" && !isLockedSourceQuote ? `<button type="button" class="doc-action-btn" data-action="convert" data-id="${doc.id}">Convert to Invoice</button>` : ""}
                    ${isLockedSourceQuote ? "" : `<button type="button" class="doc-action-btn doc-action-btn-danger" data-action="delete" data-id="${doc.id}">Delete</button>`}
                </div>
            </div>
        `;
    }).join("");
}

function handleSearchInput(event) {
    state.searchQuery = event.target.value.trim().toLowerCase();
    renderDocuments();
}

function setActiveFilter(filter) {
    state.activeFilter = filter;
    elements.filterButtons.forEach(button => {
        button.classList.toggle("active", button.dataset.filter === filter);
    });
    renderDocuments();
}

function loadClients() {
    const saved = localStorage.getItem("rgLogisticsClients");
    state.clients = saved ? JSON.parse(saved) : [];

    state.clients = state.clients.map(client => ({
        id: client.id || (`client-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        name: client.name || "",
        address: client.address || ""
    })).filter(client => client.name && client.address);

    const ccxpress = state.clients.find(client =>
        client.id === "ccxpress" || client.name === "CCXpress S.A | Chatelain Cargo Services"
    );

    if (!ccxpress) {
        state.clients.unshift({
            id: "ccxpress",
            name: "CCXpress S.A | Chatelain Cargo Services",
            address: "42 Airport Road, Port Au Prince, Haiti"
        });
    }

    localStorage.setItem("rgLogisticsClients", JSON.stringify(state.clients));
}

function renderClientOptions() {
    elements.clientSelect.innerHTML = '<option value="">-- Choose or Add Client --</option><option value="other">Other (manual entry)</option>';
    state.clients.forEach(client => {
        elements.clientSelect.innerHTML += `<option value="${client.id}">${client.name}</option>`;
    });
}

function onClientSelectChange() {
    const selected = elements.clientSelect.value;

    if (!selected || selected === "other") {
        elements.clientName.value = "";
        elements.clientAddress.value = "";
        updateEditorSummary();
        return;
    }

    const client = state.clients.find(entry => entry.id === selected);
    if (client) {
        elements.clientName.value = client.name;
        elements.clientAddress.value = client.address;
    }

    updateEditorSummary();
}

function saveClient() {
    const name = elements.clientName.value.trim();
    const address = elements.clientAddress.value.trim();

    if (!name || !address) {
        alert("Enter client name and address before saving.");
        return;
    }

    const existing = state.clients.find(client => client.name.toLowerCase() === name.toLowerCase());

    if (existing) {
        existing.address = address;
        alert("Client already exists; address updated.");
    } else {
        state.clients.push({
            id: `client-${Date.now()}`,
            name,
            address
        });
        alert("Client saved for future use.");
    }

    localStorage.setItem("rgLogisticsClients", JSON.stringify(state.clients));
    renderClientOptions();

    const selectedClient = state.clients.find(client => client.name === name);
    elements.clientSelect.value = selectedClient ? selectedClient.id : "";
    updateEditorSummary();
}

function handleDocumentCardClick(event) {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
        const docId = Number(actionButton.dataset.id);
        const action = actionButton.dataset.action;

        if (action === "edit") {
            editDocument(docId);
        } else if (action === "delete") {
            deleteDocument(docId);
        } else if (action === "convert") {
            convertQuoteToInvoice(docId);
        }
        return;
    }

    const card = event.target.closest("[data-view-id]");
    if (!card) {
        return;
    }

    editDocument(Number(card.dataset.viewId));
}

function populateFormFromDocument(doc) {
    elements.docType.value = doc.type;
    elements.refNumber.value = doc.refNumber;
    elements.docDate.value = doc.date;
    elements.clientName.value = doc.clientName;
    elements.clientAddress.value = doc.clientAddress;
    elements.poNumber.value = doc.poNumber || "";
    elements.docTags.value = Array.isArray(doc.tags) ? doc.tags.join(", ") : "";
    elements.notes.value = doc.notes || "";
    elements.paymentTerms.value = doc.paymentTerms || "Payment Upon Receipt";
    elements.includeSignature.checked = doc.includeSignature !== false;

    elements.itemsContainer.innerHTML = "";
    state.itemCounter = 0;

    doc.items.forEach(item => {
        addItem();
        const lastItem = elements.itemsContainer.querySelector(".item-row:last-child");
        lastItem.querySelector(".item-description").value = item.description || "";
        lastItem.querySelector(".item-quantity").value = item.quantity ?? 0;
        lastItem.querySelector(".item-total-price").value = item.totalPrice ?? ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2);
        lastItem.querySelector(".item-dop-toggle").checked = Boolean(item.usesDopTotal);
        lastItem.querySelector(".item-total-price-dop").value = item.totalPriceDop ?? (((parseFloat(item.totalPrice) || ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0))) * DOP_PER_USD).toFixed(2));
        lastItem.querySelector(".item-manual-unit-toggle").checked = Boolean(item.manualUnitPrice);
        lastItem.querySelector(".item-unit-price").value = item.unitPrice ?? item.price ?? 0;
        lastItem.querySelector(".item-internal-cost").value = item.internalCost ?? 0;
        updateItemPricing(lastItem);
        updateItemSummary(lastItem);
    });
}

function editDocument(id) {
    const doc = state.documents.find(entry => entry.id === id);
    if (!doc) {
        return;
    }

    if (doc.lockedAfterConversion) {
        alert("This quote is kept as a locked source record after conversion and can no longer be edited.");
        return;
    }

    state.editingDocumentId = id;
    state.convertingFromQuoteId = null;
    openModal(doc.type);
    populateFormFromDocument(doc);
    updateModalTitle();
    goToStep(5);
    updateEditorSummary();
}

function deleteDocument(id) {
    const doc = state.documents.find(entry => entry.id === id);
    if (!doc) {
        return;
    }

    if (doc.lockedAfterConversion) {
        alert("This quote is kept as a locked source record after conversion and can no longer be deleted.");
        return;
    }

    const docLabel = doc.type === "quote" ? "quote" : "invoice";
    if (!window.confirm(`Delete this ${docLabel} (${doc.refNumber})?`)) {
        return;
    }

    state.documents = state.documents.filter(entry => entry.id !== id);
    localStorage.setItem("rgLogisticsDocuments", JSON.stringify(state.documents));
    renderDocuments();
}

function convertQuoteToInvoice(id) {
    const doc = state.documents.find(entry => entry.id === id && entry.type === "quote");
    if (!doc) {
        return;
    }

    if (doc.lockedAfterConversion) {
        alert("This quote has already been converted and is now kept as a locked source record.");
        return;
    }

    state.editingDocumentId = null;
    state.convertingFromQuoteId = id;
    openModal("invoice");
    populateFormFromDocument({ ...doc, type: "invoice", date: new Date().toISOString().split("T")[0] });
    elements.docType.value = "invoice";
    setToday();
    generateRefNumber();
    updateModalTitle();
    goToStep(5);
    updateEditorSummary();
}

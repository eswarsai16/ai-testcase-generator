// DOM Elements
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const filePrompt = document.getElementById('file-prompt');
const fileDisplay = document.getElementById('file-display');
const fileName = document.getElementById('file-name');
const deleteBtn = document.getElementById('delete-btn');
const errorMessage = document.getElementById('error-message');
const analyzeBtn = document.getElementById('analyze-btn');
const exportBtn = document.getElementById('export-btn');
const loadingSection = document.getElementById('loading-section');
const progressFill = document.getElementById('progress-fill');
const statusText = document.getElementById('status');
const customPromptTextarea = document.getElementById('custom-prompt');
const sendPromptBtn = document.getElementById('send-prompt-btn');
const useDefaultPrompt = document.getElementById('use-default-prompt');
const previewContent = document.getElementById('preview-content');

let extractedText = '';

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  fileInput.files = e.dataTransfer.files;
  handleFileSelect({ target: fileInput });
});

fileInput.addEventListener('change', handleFileSelect);
sendPromptBtn.addEventListener('click', updatePreview);
customPromptTextarea.addEventListener('input', () => {
  sendPromptBtn.disabled = customPromptTextarea.value.trim() === '' && !fileInput.files[0];
});
useDefaultPrompt.addEventListener('change', updatePreview);

// File Handling
function handleFileSelect(e) {
  const file = e.target.files[0];
  errorMessage.classList.add('hidden');
  
  if (!file) {
    resetFileDisplay();
    return;
  }

  const isValidFile = file.type === 'application/pdf' || 
                     file.name.toLowerCase().endsWith('.pdf') || 
                     file.name.toLowerCase().endsWith('.docx');

  if (isValidFile) {
    displayValidFile(file);
  } else {
    displayInvalidFile(file);
  }
}

function resetFileDisplay() {
  fileDisplay.classList.add('hidden');
  filePrompt.classList.remove('hidden');
  deleteBtn.classList.add('hidden');
  analyzeBtn.disabled = true;
  sendPromptBtn.disabled = true;
  previewContent.textContent = '';
}

function displayValidFile(file) {
  fileName.textContent = file.name;
  fileDisplay.classList.remove('hidden');
  filePrompt.classList.add('hidden');
  deleteBtn.classList.remove('hidden');
  analyzeBtn.disabled = true;
  sendPromptBtn.disabled = customPromptTextarea.value.trim() === '';
  previewContent.textContent = '';
}

function displayInvalidFile(file) {
  fileName.textContent = file.name;
  fileDisplay.classList.remove('hidden');
  filePrompt.classList.add('hidden');
  errorMessage.textContent = 'Please upload only PDF or DOCX files';
  errorMessage.classList.remove('hidden');
  deleteBtn.classList.remove('hidden');
  analyzeBtn.disabled = true;
  sendPromptBtn.disabled = true;
}

deleteBtn.addEventListener('click', () => {
  fileInput.value = '';
  resetFileDisplay();
});

// Text Extraction
function extractTextFromFile(file) {
  return new Promise((resolve, reject) => {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument({data: typedarray}).promise
          .then(pdf => {
            const textPromises = [];
            for (let i = 1; i <= pdf.numPages; i++) {
              textPromises.push(
                pdf.getPage(i)
                  .then(page => page.getTextContent())
                  .then(content => content.items.map(item => item.str).join(' '))
              );
            }
            Promise.all(textPromises)
              .then(texts => resolve(texts.join('\n')))
              .catch(reject);
          })
          .catch(reject);
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.toLowerCase().endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = function(event) {
        mammoth.extractRawText({arrayBuffer: event.target.result})
          .then(result => resolve(result.value))
          .catch(reject);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error("Unsupported file type"));
    }
  });
}

// Prompt Generation
function generatePrompt(extractedText) {
  const commonPrefix = "You are a QA automation assistant. Generate comprehensive test cases in JSON format based on the input.\nNow generate test cases for this document content:\n\n";
  const customPrompt = customPromptTextarea.value.trim();

  if (useDefaultPrompt.checked) {
    return `${commonPrefix}${extractedText}\n\nFollow these rules:\n` +
           `1. Include all test scenarios (positive, negative, edge cases)\n` +
           `2. For each test case include:\n` +
           `   - Title (for first step only)\n` +
           `   - Test Step (number or blank)\n` +
           `   - Step Action (clear instructions)\n` +
           `   - Step Expected (expected outcome)\n` +
           `   - Area Path (set as "Mobile")`;
  } else if (customPrompt) {
    return `${commonPrefix}${extractedText}\n\nAdditional Requirements:\n${customPrompt}`;
  }
  
  return `${commonPrefix}${extractedText}`;
}

// Preview Update
async function updatePreview() {
  const file = fileInput.files[0];
  if (!file) return;

  loadingSection.classList.remove('hidden');
  sendPromptBtn.disabled = true;
  analyzeBtn.disabled = true;
  progressFill.style.width = '0%';
  statusText.textContent = 'Extracting text...';

  try {
    extractedText = await extractTextFromFile(file);
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text content found in document");
    }

    const prompt = generatePrompt(extractedText);
    previewContent.textContent = prompt;
    analyzeBtn.disabled = false;

    progressFill.style.width = '100%';
    statusText.textContent = 'Preview updated!';
    setTimeout(() => loadingSection.classList.add('hidden'), 1000);
  } catch (err) {
    handleProcessingError(err);
    sendPromptBtn.disabled = false;
  }
}

// Test Case Generation
analyzeBtn.addEventListener('click', async function startProcessing() {
  if (analyzeBtn.disabled) return;

  loadingSection.classList.remove('hidden');
  analyzeBtn.disabled = true;
  progressFill.style.width = '0%';
  statusText.textContent = 'Generating test cases...';

  try {
    const prompt = previewContent.textContent;
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAOKC69uv5rchndlPlL5o_yZkpN-YKUvJY",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      }
    );

    progressFill.style.width = '70%';
    statusText.textContent = 'Processing response...';

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No test cases found in response");
      
      const testCases = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(testCases)) throw new Error("Invalid test cases format");
      if (testCases.length === 0) throw new Error("No test cases generated");
      
      window.generatedTestCases = testCases;
      window.generatedFileName = fileInput.files[0].name;

      progressFill.style.width = '100%';
      statusText.textContent = `Generated ${testCases.length} test cases!`;
      setTimeout(() => {
        loadingSection.classList.add('hidden');
        exportBtn.disabled = false;
      }, 1000);
    } catch (e) {
      throw new Error("Failed to parse response: " + e.message);
    }
  } catch (err) {
    handleProcessingError(err);
  }
});

function handleProcessingError(err) {
  console.error("Error:", err);
  statusText.textContent = 'Error occurred';
  setTimeout(() => {
    loadingSection.classList.add('hidden');
    analyzeBtn.disabled = false;
    errorMessage.textContent = err.message;
    errorMessage.classList.remove('hidden');
  }, 500);
}

// Excel Export
exportBtn.addEventListener('click', function() {
  if (!window.generatedTestCases?.length) {
    alert("No test cases to export!");
    return;
  }
  
  const ws = XLSX.utils.json_to_sheet(window.generatedTestCases);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "TestCases");

  const baseName = (window.generatedFileName || "document").replace(/\.[^/.]+$/, "");
  XLSX.writeFile(wb, `TestCases_${baseName}.xlsx`);
});
// Add this to your DOM elements section at the top
const extractedTextDisplay = document.createElement('div');
extractedTextDisplay.id = 'extracted-text-display';
extractedTextDisplay.style.marginTop = '20px';
extractedTextDisplay.style.padding = '15px';
extractedTextDisplay.style.backgroundColor = 'rgba(0,0,0,0.2)';
extractedTextDisplay.style.borderRadius = '8px';
extractedTextDisplay.style.maxHeight = '300px';
extractedTextDisplay.style.overflowY = 'auto';
extractedTextDisplay.style.whiteSpace = 'pre-wrap';
extractedTextDisplay.style.fontFamily = 'monospace';
extractedTextDisplay.style.fontSize = '14px';
extractedTextDisplay.style.display = 'none';
document.querySelector('.card').appendChild(extractedTextDisplay);

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

function handleFileSelect(e) {
  const file = e.target.files[0];
  errorMessage.classList.add('hidden');
  if (!file) {
    fileDisplay.classList.add('hidden');
    filePrompt.classList.remove('hidden');
    deleteBtn.classList.add('hidden');
    analyzeBtn.disabled = true;
    extractedTextDisplay.style.display = 'none';
    return;
  }
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isDOCX = file.name.toLowerCase().endsWith('.docx');
  if (isPDF || isDOCX) {
    fileName.textContent = file.name;
    fileDisplay.classList.remove('hidden');
    filePrompt.classList.add('hidden');
    deleteBtn.classList.remove('hidden');
    analyzeBtn.disabled = false;
    extractedTextDisplay.style.display = 'none';
  } else {
    fileName.textContent = file.name;
    fileDisplay.classList.remove('hidden');
    filePrompt.classList.add('hidden');
    errorMessage.textContent = 'Please upload only PDF or DOCX files';
    errorMessage.classList.remove('hidden');
    deleteBtn.classList.remove('hidden');
    analyzeBtn.disabled = true;
    extractedTextDisplay.style.display = 'none';
  }
}

deleteBtn.addEventListener('click', () => {
  fileInput.value = '';
  fileDisplay.classList.add('hidden');
  filePrompt.classList.remove('hidden');
  errorMessage.classList.add('hidden');
  analyzeBtn.disabled = true;
  fileName.textContent = '';
  deleteBtn.classList.add('hidden');
  extractedTextDisplay.style.display = 'none';
});

// Add this function for extracting text from PDF or DOCX
function extractTextFromFile(file) {
  return new Promise((resolve, reject) => {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
      // PDF extraction using PDF.js
      const reader = new FileReader();
      reader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument({data: typedarray}).promise.then(pdf => {
          let textPromises = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            textPromises.push(pdf.getPage(i).then(page => page.getTextContent()).then(content => {
              return content.items.map(item => item.str).join(' ');
            }));
          }
          Promise.all(textPromises).then(texts => {
            resolve(texts.join('\n'));
          });
        }).catch(reject);
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.toLowerCase().endsWith('.docx')) {
      // DOCX extraction using mammoth.js
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

// When "Create" is clicked, extract and display text
analyzeBtn.addEventListener('click', async function startProcessing() {
  if (analyzeBtn.disabled) return;

  const file = fileInput.files[0];
  if (!file) return;

  loadingSection.classList.remove('hidden');
  analyzeBtn.disabled = true;
  exportBtn.disabled = true;
  progressFill.style.width = '0%';
  statusText.textContent = 'Extracting text...';
  extractedTextDisplay.style.display = 'none';

  try {
    // Step 1: Extract text
    const extractedText = await extractTextFromFile(file);
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text content found in document");
    }

    // Step 2: Build the Gemini prompt
    const prompt = `
You are a QA automation assistant. Based on the input use case text, generate test cases in JSON format that maps exactly to the following Excel columns and formatting rules:

1. **Title**
   - Purpose: Identifies the main test scenario or feature being verified.
   - Format:
     - Appears only on the **first step** of each test case.
     - Leave blank for **subsequent steps** in the same test case.
     - Leave blank for the **Pre-Conditions** section.

2. **Test Step**
   - Purpose: Represents the **step number** in a test case.
   - Format:
     - Use numeric values (1, 2, 3...) for actual steps.
     - Leave blank for Pre-Conditions.

3. **Step Action**
   - Purpose: Describes what action the tester performs in that step.
   - Format:
     - Use imperative language (e.g., "Observe", "Click", "Take", "Open").
     - For Pre-Conditions: Start the first row with:
       Pre-Conditions:
       1- Open Mobile Application.
       2- Scan QR Code successfully.
       3- Complete Onboarding successfully.
       4- User is on Home Page.

4. **Step Expected**
   - Purpose: Describes the expected result for that step.
   - Format:
     - Use clear, measurable outcomes.
     - Leave blank if no outcome is expected.
     - Leave blank for Pre-Conditions.

5. **Area Path**
   - Set as "Mobile" for all rows.

6. **Assigned To**
   - Set as "Amisha" for all rows.

7. **Status**
   - Leave blank.

8. **Comments**
   - Set as "Need a desk check from developer" for all rows.
   - For Pre-Conditions row, use:
     Note: Screenshots attached are from prev code to verify the sizes.

---
### 📋 Output Format (Return ONLY Valid JSON Array):
Example:

[
  {
    "Title": "",
    "Test Step": "",
    "Step Action": "Pre-Conditions:\\n1- Open Mobile Application.\\n2- Scan QR Code successfully.\\n3- Complete Onboarding successfully.\\n4- User is on Home Page.",
    "Step Expected": "",
    "Area Path": "",
    "Assigned To": "",
    "Status": "",
    "Comments": "Note: Screenshots attached are from prev code to verify the sizes."
  },
  {
    "Title": "Verifying small size",
    "Test Step": "1",
    "Step Action": "Observe the size of the radio-button-group of the patient status.",
    "Step Expected": "Small size should be 20px",
    "Area Path": "Mobile",
    "Assigned To": "Amisha",
    "Status": "",
    "Comments": "Need a desk check from developer"
  }
]

---
Now generate test cases for this input:

${extractedText}
`;

    progressFill.style.width = '40%';
    statusText.textContent = 'Sending to Gemini...';

    // Step 3: Send to Gemini API
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAOKC69uv5rchndlPlL5o_yZkpN-YKUvJY",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ]
        }),
      }
    );

    progressFill.style.width = '70%';
    statusText.textContent = 'Processing Gemini response...';

    const geminiData = await geminiResponse.json();
    let testCases = [];
    try {
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        testCases = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Couldn't find JSON array in response");
      }
    } catch (e) {
      throw new Error("Failed to parse Gemini response: " + e.message);
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
      throw new Error("No test cases generated by Gemini");
    }

    // Display the extracted text (optional)
    extractedTextDisplay.textContent = extractedText;
    extractedTextDisplay.style.display = 'block';

    // Store for export
    window.generatedTestCases = testCases;
    window.generatedFileName = file.name;

    progressFill.style.width = '100%';
    statusText.textContent = 'Test cases generated!';
    setTimeout(() => {
      loadingSection.classList.add('hidden');
      exportBtn.disabled = false;
      analyzeBtn.disabled = false;
    }, 1000);
  } catch (err) {
    console.error("Processing Error:", err);
    statusText.textContent = 'Error occurred';
    setTimeout(() => {
      loadingSection.classList.add('hidden');
      analyzeBtn.disabled = false;
      errorMessage.textContent = err.message;
      errorMessage.classList.remove('hidden');
    }, 500);
  }
});

exportBtn.addEventListener('click', function () {
  if (!window.generatedTestCases || !Array.isArray(window.generatedTestCases)) {
    alert("No test cases to export!");
    return;
  }
  
  const ws = XLSX.utils.json_to_sheet(window.generatedTestCases);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "TestCases");

  
  let baseName = window.generatedFileName || "document";
  baseName = baseName.replace(/\.[^/.]+$/, "");
  const fileName = `testcases of ${baseName}.xlsx`;

  XLSX.writeFile(wb, fileName);
});
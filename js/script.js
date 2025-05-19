document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const fileInput = document.getElementById('file-input');
  const dropZone = document.getElementById('drop-zone');
  const analyzeBtn = document.getElementById('analyze-btn');
  const exportBtn = document.getElementById('export-btn');
  const deleteBtn = document.getElementById('delete-btn');
  const fileName = document.getElementById('file-name');
  const filePrompt = document.getElementById('file-prompt');
  const errorMessage = document.getElementById('error-message');
  const fileDisplay = document.getElementById('file-display');
  const loadingSection = document.getElementById('loading-section');
  const progressFill = document.getElementById('progress-fill');
  const statusText = document.getElementById('status');

  // File Upload Handling
  dropZone.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', handleFileSelect);
  
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.style.backgroundColor = 'rgba(161, 0, 255, 0.2)';
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.style.backgroundColor = '';
  });
  
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.style.backgroundColor = '';
    fileInput.files = e.dataTransfer.files;
    handleFileSelect({target: fileInput});
  });

  // Delete Button
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFileInput();
  });

  // Analyze Button
  analyzeBtn.addEventListener('click', startProcessing);
  
  // Export Button
  exportBtn.addEventListener('click', () => {
    alert('Test cases exported to Excel (mock)');
  });

  function handleFileSelect(e) {
    const file = e.target.files[0];

    resetValidation();
    analyzeBtn.disabled = true;
    exportBtn.disabled = true; // Always disabled until analysis

    if (!file) {
      fileDisplay.classList.add('hidden');
      filePrompt.classList.remove('hidden');
      deleteBtn.classList.add('hidden'); // Hide delete button if no file
      return;
    }

    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isDOCX = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                  file.name.toLowerCase().endsWith('.docx');

    if (isPDF || isDOCX) {
      fileName.textContent = file.name;
      fileDisplay.classList.add('valid-file');
      fileDisplay.classList.remove('hidden');
      filePrompt.classList.add('hidden');
      analyzeBtn.disabled = false;
      deleteBtn.classList.remove('hidden'); // Show delete button
    } else {
      fileName.textContent = file.name;
      fileDisplay.classList.add('invalid-file');
      fileDisplay.classList.remove('hidden');
      filePrompt.classList.add('hidden');
      errorMessage.textContent = 'Please upload only PDF or DOCX files';
      errorMessage.classList.remove('hidden');
      deleteBtn.classList.remove('hidden'); // Show delete button for invalid file too
    }
  }

  function startProcessing() {
    if (analyzeBtn.disabled) return;

    loadingSection.classList.remove('hidden');
    analyzeBtn.disabled = true;
    exportBtn.disabled = true; // Keep disabled during analysis
    progressFill.style.width = '0%';
    statusText.textContent = 'Initializing...';

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress > 100) progress = 100;

      progressFill.style.width = `${progress}%`;
      statusText.textContent = getStatusMessage(progress);

      if (progress === 100) {
        clearInterval(interval);
        setTimeout(() => {
          loadingSection.classList.add('hidden');
          exportBtn.disabled = false; // Enable after analysis
        }, 500);
      }
    }, 300);
  }

  function resetFileInput() {
    fileInput.value = '';
    fileDisplay.classList.add('hidden');
    filePrompt.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    analyzeBtn.disabled = true;
    exportBtn.disabled = true; // Disable export again
    deleteBtn.classList.add('hidden'); // Hide delete button
    fileName.textContent = ''; // <-- Clear the file name
  }

  function resetValidation() {
    fileDisplay.classList.remove('valid-file', 'invalid-file');
    errorMessage.classList.add('hidden');
  }

  function getStatusMessage(p) {
    if (p < 25) return "Analyzing document...";
    if (p < 50) return "Identifying use cases...";
    if (p < 75) return "Generating test scenarios...";
    return "Finalizing...";
  }
});

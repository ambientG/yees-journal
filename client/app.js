document.addEventListener('DOMContentLoaded', function() {
    const API_URL = 'http://localhost:3000/api';
    const editMode = document.getElementById('editMode');
    const previewMode = document.getElementById('previewMode');
    const previewBtn = document.getElementById('previewBtn');
    const editBtn = document.getElementById('editBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const photoUpload = document.getElementById('photoUpload');
    const photoInput = document.getElementById('photoInput');
    const photoGrid = document.getElementById('photoGrid');
    const journalTitle = document.getElementById('journalTitle');
    const mainText = document.getElementById('mainText');
    const subText1 = document.getElementById('subText1');
    const subText2 = document.getElementById('subText2');

    // Photo upload handling
    photoUpload.addEventListener('click', () => photoInput.click());
    
    photoUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        photoUpload.style.borderColor = '#666';
    });

    photoUpload.addEventListener('dragleave', () => {
        photoUpload.style.borderColor = '#ddd';
    });

    photoUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        photoUpload.style.borderColor = '#ddd';
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    photoInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    addPhotoToGrid(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function addPhotoToGrid(imgSrc) {
        const slots = photoGrid.querySelectorAll('.photo-slot');
        if (slots.length >= 6) {
            alert('最多只能上传6张图片');
            return;
        }

        const slot = document.createElement('div');
        slot.className = 'photo-slot';
        
        const img = document.createElement('img');
        img.src = imgSrc;
        
        // Double click to remove
        slot.addEventListener('dblclick', () => {
            slot.remove();
            updatePhotoGrid();
        });
        
        slot.appendChild(img);
        photoGrid.appendChild(slot);
        updatePhotoGrid();
    }

    function updatePhotoGrid() {
        const slots = photoGrid.querySelectorAll('.photo-slot');
        slots.forEach((slot, index) => {
            slot.style.order = index;
        });
    }

    // Preview mode
    previewBtn.addEventListener('click', () => {
        document.getElementById('previewTitle').textContent = journalTitle.value || 'YEE\'S日记#001';
        document.getElementById('previewMainText').textContent = mainText.value;
        document.getElementById('previewSubText1').textContent = subText1.value;
        document.getElementById('previewSubText2').textContent = subText2.value;

        // Clone photos to preview
        const previewPhotos = document.getElementById('previewPhotos');
        previewPhotos.innerHTML = '';
        const photos = photoGrid.querySelectorAll('img');
        photos.forEach(photo => {
            const img = photo.cloneNode(true);
            const slot = document.createElement('div');
            slot.className = 'photo-slot';
            slot.appendChild(img);
            previewPhotos.appendChild(slot);
        });

        editMode.style.display = 'none';
        previewMode.style.display = 'block';
    });

    editBtn.addEventListener('click', () => {
        editMode.style.display = 'block';
        previewMode.style.display = 'none';
    });

    // Download functionality
    downloadBtn.addEventListener('click', () => {
        const previewContainer = document.querySelector('.preview-container');
        
        // Set specific dimensions for better quality
        const options = {
            scale: 2,
            width: previewContainer.offsetWidth * 2,
            height: previewContainer.offsetHeight * 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        };

        html2canvas(previewContainer, options).then(canvas => {
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0,10);
            link.download = `yees-journal-${timestamp}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });

    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });

    // Handle form submission
    const journalForm = document.getElementById('journalForm');
    journalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = journalForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
        
        try {
            const formData = new FormData();
            formData.append('mainText', mainText.value);
            formData.append('subText1', subText1.value);
            formData.append('subText2', subText2.value);
            formData.append('date', new Date().toISOString());
            
            // Add non-null photos to form data
            const photos = photoGrid.querySelectorAll('img');
            photos.forEach((photo, index) => {
                const canvas = document.createElement('canvas');
                canvas.width = photo.width;
                canvas.height = photo.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(photo, 0, 0);
                canvas.toBlob((blob) => {
                    formData.append(`photo${index}`, blob);
                });
            });

            const response = await fetch(`${API_URL}/journals`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to save entry');
            }

            const result = await response.json();
            
            // Show success message
            alert('Journal entry saved successfully!');
            
            // Reset form
            journalForm.reset();
            photoGrid.innerHTML = '';
            
            // Reset preview
            document.getElementById('previewMainText').textContent = '';
            document.getElementById('previewSubText1').textContent = '';
            document.getElementById('previewSubText2').textContent = '';
            document.getElementById('previewPhotos').innerHTML = '';
            
            // Switch back to edit mode
            editMode.style.display = 'block';
            previewMode.style.display = 'none';
            
            // Refresh entries list
            loadEntries();
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error saving journal entry. Please try again.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Save Entry';
        }
    });

    async function loadEntries() {
        try {
            const response = await fetch(`${API_URL}/journals`);
            const journals = await response.json();
            
            const entriesList = document.getElementById('entriesList');
            entriesList.innerHTML = journals.map(journal => `
                <div class="journal-entry">
                    <div class="entry-date">${new Date(journal.date).toLocaleDateString()}</div>
                    <div class="entry-main-text">${journal.mainText}</div>
                    <div class="entry-sub-text">${journal.subText1}</div>
                    <div class="entry-sub-text">${journal.subText2}</div>
                    <div class="entry-photos">
                        ${journal.photos.map(photo => `
                            <img src="${photo.url}" class="entry-photo" alt="Journal photo">
                        `).join('')}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading entries:', error);
        }
    }

    // Initial load
    loadEntries();

    // Update date
    const today = new Date();
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}/周${days[today.getDay()]}`;
    document.querySelectorAll('.date').forEach(el => el.textContent = dateStr);
});

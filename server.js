const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Serve static files
app.use(express.static('client'));
app.use('/uploads', express.static('uploads'));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Store journals in memory (replace with database in production)
let journals = [];

// Get all journals
app.get('/api/entries', (req, res) => {
  res.json(journals);
});

// Create new journal entry with photos
app.post('/api/entries', upload.array('photos', 6), (req, res) => {
  try {
    const photos = req.files ? req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename
    })) : [];

    const journal = {
      id: Date.now().toString(),
      mainText: req.body.mainText || '',
      subText: req.body.subText || '',
      date: new Date().toISOString(),
      photos: photos
    };

    journals.push(journal);
    res.json(journal);
  } catch (error) {
    console.error('Error saving journal:', error);
    res.status(500).json({ error: 'Failed to save journal entry' });
  }
});

// Delete a journal entry
app.delete('/api/entries/:id', (req, res) => {
  const index = journals.findIndex(j => j.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Journal not found' });
  }

  // Delete associated photos
  const journal = journals[index];
  journal.photos.forEach(photo => {
    const filePath = path.join(__dirname, 'uploads', photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  journals.splice(index, 1);
  res.json({ message: 'Journal deleted successfully' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

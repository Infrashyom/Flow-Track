
import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import streamifier from 'streamifier';
import { protect } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for memory storage without strict file filtering
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});

// The upload handler function
const handleUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  // Check if file is PDF to force 'raw' resource type
  const isPdf = req.file.originalname.toLowerCase().endsWith('.pdf');

  const streamUpload = (fileBuffer) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { 
          folder: 'flowtrack',
          resource_type: isPdf ? 'raw' : 'auto' // Force 'raw' for PDFs to prevent image processing quirks
        },
        (error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        }
      );
      streamifier.createReadStream(fileBuffer).pipe(stream);
    });
  };

  streamUpload(req.file.buffer)
    .then(result => {
      res.status(200).json({ url: result.secure_url });
    })
    .catch(error => {
      console.error('Cloudinary Upload Error:', error);
      res.status(500).json({ message: 'Error uploading file to Cloudinary.' });
    });
};

// Robust Proxy Download Route
// This fetches the file server-side and pipes it to the client to avoid CORS and Header issues.
router.get('/download', protect, async (req, res) => {
    try {
        const { url, filename } = req.query;
        if (!url) return res.status(400).json({ message: 'Missing URL parameter' });

        const safeFilename = (filename || 'download')
            .replace(/[^a-zA-Z0-9.\-_ ]/g, "")
            .trim() || 'download';

        // Fetch the file as a stream
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'FlowTrack-Server/1.0'
            }
        });

        // Set headers to force download
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }

        // Pipe the remote stream directly to the client response
        response.data.pipe(res);

    } catch (error) {
        console.error('Download Proxy Error:', error.message);
        const status = error.response ? error.response.status : 500;
        const msg = error.response ? error.response.statusText : error.message;
        res.status(status).json({ message: `Failed to download file: ${msg}` });
    }
});

router.post('/', protect, upload.single('file'), handleUpload);

export default router;

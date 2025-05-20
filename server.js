const express = require('express');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
// const apikeys = require('./apikey.json');
require('dotenv').config()
const key = process.env.APIKEY
const clientEmail = process.env.ClIENTEMAIL;
const app = express();
// const PORT = 3000;

const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

const SCOPES = ['https://www.googleapis.com/auth/drive'];

async function authorize() {
    const auth = new google.auth.JWT(
        clientEmail,
        null,
        key,
        SCOPES
    );
    await auth.authorize();
    return auth;
}

app.get('/list-files', async (req, res) => {
    try {
        const auth = await authorize();
        const drive = google.drive({ version: 'v3', auth });

        const response = await drive.files.list({
            pageSize: 10,
            fields: 'nextPageToken, files(id, name)',
        });

        res.json(response.data.files);
    } catch (error) {
        res.status(500).send(`Error listing files: ${error.message}`);
    }
});

app.post('/upload-file', upload.single('file'), async (req, res) => {
    const folderId = req.body.folderId;
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    try {
        const auth = await authorize();
        const drive = google.drive({ version: 'v3', auth });

        const fileMetadata = {
            name: fileName,
            parents: [folderId]
        };

        const media = {
            mimeType: req.file.mimetype,
            body: fs.createReadStream(filePath)
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        });

        res.json({ fileId: response.data.id });
    } catch (error) {
        res.status(500).send(`Error uploading file: ${error.message}`);
    }
});

app.patch('/update-file', upload.single('file'), async (req, res) => {
    const { fileId } = req.body;
    const filePath = req.file.path;

    try {
        const auth = await authorize();
        const drive = google.drive({ version: 'v3', auth });

        const media = {
            mimeType: req.file.mimetype,
            body: fs.createReadStream(filePath)
        };

        const response = await drive.files.update({
            fileId: fileId,
            media: media
        });

        res.json({ updated: true, fileId: response.data.id });
    } catch (error) {
        res.status(500).send(`Error updating file: ${error.message}`);
    }
});

app.delete('/delete-file/:fileId', async (req, res) => {
    const { fileId } = req.params;

    try {
        const auth = await authorize();
        const drive = google.drive({ version: 'v3', auth });

        await drive.files.delete({ fileId });
        res.json({ deleted: true });
    } catch (error) {
        res.status(500).send(`Error deleting file: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

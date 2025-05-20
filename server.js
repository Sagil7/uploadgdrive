const express = require('express');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const apikeys = require('./apikey.json');
const key = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5Ple6BB27zI0U\nWHjFEoPH9889TS2UET4a9EZUrXEZVSXK7r9UGmESQWWJcFQ6kMeSKAcV0p7R4vev\nt9Er39eNxRSfZGK3taUAQYyi+xgBTlev1bsXnuleW77R/LvYC/d4qTcUCF7k7Eza\nfCMiVgTSSu3S4bQKUaN55bUEgQYcKf11oYnD8za/XxMCcaqV86NSB6+TNM9baKvX\nrF9sa3LQjVzbAGhMWLFViRA3p6LhJIXmm98U42DpQcbfhuXzkTllSpBrb9ErV+mO\nAPpQ1Fp1NUut85ySpAdD0tnbDT8mgm1ddYP+d7E4ESi6kd4crl4hu4yktpftMIwJ\nST3leFzbAgMBAAECggEADjSOAlFvJ51KXaVh2thOS2xhHmCnvnNgDC3FTZhgqZen\npps5CC20WfOyjJ/qOvTVSQumwhv9BTgJfxZyhOcidC2zz3v251hCR0sU336v2uce\nFE7TN77TmI0ijJ8mly0RFNYCckJ+EcIJLAwESbgc9d9nGMUpdaJzDdWj/wIXQjDY\nu7weqJqege7JcPl1NkdusnxCz3dtuLQsW0hawlV+Izv+q4iPA4wUECvrA3U3ZZrQ\nj+4kz1fV4TNrcLyKrUZ+CD5EiBDNwOlg9x/Kxqkya3cJAfI9MAklcSPWGZ8h0rRF\njyMkgNPY1rY9FvxJLFFDmbk3L24PRQnH3a6pjmv4SQKBgQDdsY4/VvKpTMlCATH5\ndZhtNRInKoWIlIfoMDYLHifYbJLLB9rNLRMKdOuKE7HWVsUt+UbCJRnQgzNka6gh\nE9ZzvuRADV+yBd3/DJ8TDyoYihifJTNvy+Q+zL59ljw/c8xaBnuJWvygehQCrDws\nB3M+KGnBKRT71PpQ0L9Vc6m/RQKBgQDV6M872r5YAIB885Xe0I3CtSYHOcrGEMLc\nO/Z0XKZdptq0NyCnbUnH33HX4Kz23NBrIH1eIVFSIgm7xhpUPcDi0TlDBYPHPbMB\n5P8fJZ3GAJFiTPy75kwLHLNPcWSLiFwJa3xmZF32aZRt3i3Ac2k2If6q99/08X75\n9kZVmfzdnwKBgQDMIWbCidQM8chLP4B9m7tLq1dYuv2T4ng14taQbCbyUB7mVggx\nbnSe50POsw3IN8N97o8pyzG23mge6kY4luSbVUUkeWwJJv/fjgaXbRos2FONjpqL\nMWmsLailSQWWw5CBwIBV3HLLbT0prOAHBqEltd6S3roUnGoUqfHTxBmkJQKBgF3C\nnANKUCBWp/sc8dYmZ9yudiq4pC7I7gCGr/I1Ih7uofJYL5Hzj2FyiX3sVyQliZ1L\nMmhuBi0QCmAp5ySBpOhGeOjto+NTIgF0lHbckBlX6mHCCQ17Vl2QiPALbdzTOjRO\nzso6uAzoHk1CE5/FdpppsCzUVXAR4mxCDHY89t9VAoGBAKlaDxa1llNyiskRJxK5\nBV6ucg4O3OVtfnRw2StCJRiy6Oowvl6noNzp2pGeXPP3nxxSH2olTemFdUKRGLI2\nLY9mc54gQJotIp5wChOjrGdc2fJloHueq95UWRF6RxzdGAxWPdyepFSPp8HpfHFZ\n/OQMTpNUZcR6qTh+STWjkRR6\n-----END PRIVATE KEY-----\n"

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
        apikeys.client_email,
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

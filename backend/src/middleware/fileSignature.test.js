const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const fs = require('fs');
const path = require('path');

const { matchesFileSignature } = require('./fileSignature');
const upload = require('./uploadMiddleware');
const { isAllowedMimeType } = upload;

test('accepts a valid JPEG signature', () => {
    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF]);

    assert.strictEqual(
        matchesFileSignature(jpegBuffer, 'image/jpeg'),
        true
    );
});

test('accepts a valid PNG signature', () => {
    const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47,
        0x0D, 0x0A, 0x1A, 0x0A
    ]);

    assert.strictEqual(
        matchesFileSignature(pngBuffer, 'image/png'),
        true
    );
});

test('accepts a valid WebP signature', () => {
    const webpBuffer = Buffer.from('RIFFxxxxWEBP');

    assert.strictEqual(
        matchesFileSignature(webpBuffer, 'image/webp'),
        true
    );
});

test('rejects an unsupported MIME type', () => {
    assert.strictEqual(
        isAllowedMimeType('image/gif'),
        false
    );
});

test('rejects content that does not match the declared MIME type', () => {
    const fakeJpegBuffer = Buffer.from('This is not a JPEG file');

    assert.strictEqual(
        matchesFileSignature(fakeJpegBuffer, 'image/jpeg'),
        false
    );
});

test('rejects mismatched uploaded content and removes the saved file', async () => {
    const app = express();

    app.post('/upload', upload.single('image'), (req, res) => {
        res.status(200).json({ success: true });
    });

    app.use((err, req, res, next) => {
        res.status(err.statusCode || 500).json({
            error: err.message
        });
    });

    const server = app.listen(0);

    try {
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/upload`;

        const uploadDir = path.join(__dirname, '../../uploads');
        const filesBeforeUpload = fs.readdirSync(uploadDir);

        const formData = new FormData();

        const fakeJpeg = new Blob(
            ['This is not a JPEG file'],
            { type: 'image/jpeg' }
        );

        formData.append('image', fakeJpeg, 'fake.jpg');

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        assert.strictEqual(response.status, 400);

        const filesAfterUpload = fs.readdirSync(uploadDir);

        assert.deepStrictEqual(filesAfterUpload, filesBeforeUpload);
    } finally {
        server.close();
    }
});

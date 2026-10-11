const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const fs = require('fs');
const path = require('path');
const upload = require('./uploadMiddleware');
const { matchesFileSignature } = require('./fileSignature');

const { isAllowedMimeType } = upload;

const validPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
);
const validJpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/AP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Af//Z',
    'base64'
);
const validWebp = Buffer.from(
    'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vuUAAA=',
    'base64'
);

const createUploadServer = () => {
    const app = express();

    app.post('/upload', upload.single('image'), (req, res) => {
        res.status(200).json({
            success: true,
            filename: req.file?.filename
        });
    });

    app.use((err, req, res, next) => {
        res.status(err.statusCode || 500).json({
            error: err.message
        });
    });

    return app.listen(0);
};

const removeUploadedFile = (filename) => {
    if (!filename) {
        return;
    }

    const uploadDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

test('accepts a valid JPEG file', () => {
    assert.strictEqual(
        matchesFileSignature(validJpeg, 'image/jpeg'),
        true
    );
});

test('accepts a valid PNG file', () => {
    assert.strictEqual(
        matchesFileSignature(validPng, 'image/png'),
        true
    );
});

test('accepts a valid WebP file', () => {
    assert.strictEqual(
        matchesFileSignature(validWebp, 'image/webp'),
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
    const server = createUploadServer();

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

test('accepts a valid JPEG upload', async () => {
    const server = createUploadServer();

    try {
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/upload`;

        const formData = new FormData();
        const jpegBlob = new Blob(
            [validJpeg],
            { type: 'image/jpeg' }
        );

        formData.append('image', jpegBlob, 'photo.jpg');

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        assert.strictEqual(response.status, 200);
        assert.strictEqual(result.success, true);
        assert.match(result.filename, /\.jpg$/);
        removeUploadedFile(result.filename);
    } finally {
        server.close();
    }
});

test('accepts a valid PNG upload', async () => {
    const server = createUploadServer();

    try {
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/upload`;

        const formData = new FormData();
        const pngBlob = new Blob(
            [validPng],
            { type: 'image/png' }
        );

        formData.append('image', pngBlob, 'photo.png');

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        assert.strictEqual(response.status, 200);
        assert.strictEqual(result.success, true);
        assert.match(result.filename, /\.png$/);
        removeUploadedFile(result.filename);
    } finally {
        server.close();
    }
});

test('accepts a valid WebP upload', async () => {
    const server = createUploadServer();

    try {
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/upload`;

        const formData = new FormData();
        const webpBlob = new Blob(
            [validWebp],
            { type: 'image/webp' }
        );

        formData.append('image', webpBlob, 'photo.webp');

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        assert.strictEqual(response.status, 200);
        assert.strictEqual(result.success, true);
        assert.match(result.filename, /\.webp$/);
        removeUploadedFile(result.filename);
    } finally {
        server.close();
    }
});

test('rejects an unsupported MIME type upload with a 400 response', async () => {
    const server = createUploadServer();

    try {
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/upload`;

        const formData = new FormData();
        const gifBlob = new Blob(
            ['not actually a GIF'],
            { type: 'image/gif' }
        );

        formData.append('image', gifBlob, 'image.gif');

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        assert.strictEqual(response.status, 400);
        assert.match(result.error, /JPEG, PNG, and WebP/i);
    } finally {
        server.close();
    }
});

test('rejects an oversized upload with a 400 response and cleans up the file', async () => {
    const server = createUploadServer();

    try {
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/upload`;

        const uploadDir = path.join(__dirname, '../../uploads');
        const filesBeforeUpload = fs.readdirSync(uploadDir);

        const oversizedFile = Buffer.alloc(
            5 * 1024 * 1024 + 1,
            0x61
        );

        const formData = new FormData();
        formData.append(
            'image',
            new Blob([oversizedFile], { type: 'image/png' }),
            'too-large.png'
        );

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        assert.strictEqual(response.status, 400);
        assert.match(result.error, /too large/i);

        const filesAfterUpload = fs.readdirSync(uploadDir);

        assert.deepStrictEqual(
            filesAfterUpload,
            filesBeforeUpload
        );
    } finally {
        server.close();
    }
});

test('normalizes a spoofed HTML extension to the validated image type', async () => {
    const server = createUploadServer();

    try {
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/upload`;

        const formData = new FormData();
        const pngBlob = new Blob(
            [validPng],
            { type: 'image/png' }
        );

        formData.append('image', pngBlob, 'image.html');

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        assert.strictEqual(response.status, 200);
        assert.strictEqual(result.success, true);

        assert.match(result.filename, /\.png$/);
        assert.doesNotMatch(result.filename, /\.html$/);
        removeUploadedFile(result.filename);
    } finally {
        server.close();
    }
});

test('normalizes a spoofed HTML extension for JPEG uploads', async () => {
    const server = createUploadServer();

    let uploadedFilename;

    try {
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/upload`;

        const formData = new FormData();

        formData.append(
            'image',
            new Blob([validJpeg], { type: 'image/jpeg' }),
            'image.html'
        );

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        uploadedFilename = result.filename;

        assert.strictEqual(response.status, 200);
        assert.strictEqual(result.success, true);
        assert.match(result.filename, /\.jpg$/);
        assert.doesNotMatch(result.filename, /\.html$/);
    } finally {
        removeUploadedFile(uploadedFilename);
        server.close();
    }
});

test('normalizes a spoofed HTML extension for WebP uploads', async () => {
    const server = createUploadServer();

    let uploadedFilename;

    try {
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/upload`;

        const formData = new FormData();

        formData.append(
            'image',
            new Blob([validWebp], { type: 'image/webp' }),
            'image.html'
        );

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        uploadedFilename = result.filename;

        assert.strictEqual(response.status, 200);
        assert.strictEqual(result.success, true);
        assert.match(result.filename, /\.webp$/);
        assert.doesNotMatch(result.filename, /\.html$/);
    } finally {
        removeUploadedFile(uploadedFilename);
        server.close();
    }
});

test('rejects PNG-prefixed HTML content', async () => {
    const server = createUploadServer();

    try {
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/upload`;

        const formData = new FormData();

        const fakePng = Buffer.concat([
            Buffer.from([
                0x89, 0x50, 0x4E, 0x47,
                0x0D, 0x0A, 0x1A, 0x0A
            ]),
            Buffer.from('<html><body>Not a real PNG</body></html>')
        ]);

        const fakePngBlob = new Blob(
            [fakePng],
            { type: 'image/png' }
        );

        formData.append('image', fakePngBlob, 'image.html');

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        assert.strictEqual(response.status, 400);
    } finally {
        server.close();
    }
});

test('rejects mismatched WebP content and removes the saved file', async () => {
    const server = createUploadServer();
    let uploadedFilename;

    try {
        const address = server.address();
        const url = `http://127.0.0.1:${address.port}/upload`;

        const formData = new FormData();

        formData.append(
            'image',
            new Blob(
                [Buffer.from('<html><body>Not a WebP</body></html>')],
                { type: 'image/webp' }
            ),
            'image.webp'
        );

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        uploadedFilename = result.filename;

        assert.strictEqual(response.status, 400);
        assert.match(
            result.error,
            /does not match its declared type/i
        );
    } finally {
        removeUploadedFile(uploadedFilename);
        server.close();
    }
});

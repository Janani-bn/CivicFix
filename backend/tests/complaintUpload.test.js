const { test } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const fs = require('fs');
const path = require('path');

process.env.JWT_SECRET = 'x'.repeat(48);

const complaintRoutes = require('../src/routes/complaints');
const Complaint = require('../src/models/Complaint');
const { errorHandler } = require('../src/middleware/errorHandler');

const uploadDir = path.join(__dirname, '../uploads');
const validJpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/AP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Af//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Af//Z',
    'base64'
);

const createApp = () => {
    const app = express();
    app.use('/api/complaints', complaintRoutes);
    app.use(errorHandler);
    return app;
};

const createComplaintForm = (includeRequiredFields = true) => {
    const formData = new FormData();

    if (includeRequiredFields) {
        formData.append('name', 'Test Reporter');
        formData.append('phone', '1234567890');
        formData.append('area', 'Test Area');
        formData.append('city', 'Test City');
        formData.append('issueType', 'Road Damage');
        formData.append('description', 'A valid complaint description');
    }

    formData.append(
        'image',
        new Blob([validJpeg], { type: 'image/jpeg' }),
        'complaint.jpg'
    );

    return formData;
};

const postComplaint = async (formData) => {
    const app = createApp();
    const server = app.listen(0);

    try {
        const url = `http://127.0.0.1:${server.address().port}/api/complaints`;
        return await fetch(url, { method: 'POST', body: formData });
    } finally {
        server.close();
    }
};

const getUploadedFiles = () => fs.readdirSync(uploadDir);

const removeNewUploadedFiles = (filesBeforeUpload) => {
    for (const file of getUploadedFiles()) {
        if (!filesBeforeUpload.includes(file)) {
            fs.unlinkSync(path.join(uploadDir, file));
        }
    }
};

test('deletes a valid uploaded image when complaint validation fails', async () => {
    const filesBeforeUpload = getUploadedFiles();

    try {
        const response = await postComplaint(createComplaintForm(false));

        assert.strictEqual(response.status, 400);
        assert.deepStrictEqual(getUploadedFiles(), filesBeforeUpload);
    } finally {
        removeNewUploadedFiles(filesBeforeUpload);
    }
});

test('deletes a valid uploaded image when complaint creation fails', async () => {
    const originalCreate = Complaint.create;
    const filesBeforeUpload = getUploadedFiles();
    Complaint.create = async () => {
        throw new Error('Database unavailable');
    };

    try {
        const response = await postComplaint(createComplaintForm());

        assert.strictEqual(response.status, 500);
        assert.deepStrictEqual(getUploadedFiles(), filesBeforeUpload);
    } finally {
        Complaint.create = originalCreate;
        removeNewUploadedFiles(filesBeforeUpload);
    }
});

test('keeps a valid uploaded image when complaint creation succeeds', async () => {
    const originalCreate = Complaint.create;
    const filesBeforeUpload = getUploadedFiles();
    Complaint.create = async () => ({
        complaint_id: 'CIV-TEST',
        name: 'Test Reporter',
        phone: '1234567890',
        area: 'Test Area',
        city: 'Test City',
        issue_type: 'Road Damage',
        description: 'A valid complaint description',
        severity: 'medium',
        status: 'Pending',
        department: 'Public Works',
        created_at: new Date().toISOString()
    });

    let uploadedFiles;

    try {
        const response = await postComplaint(createComplaintForm());

        assert.strictEqual(response.status, 201);
        uploadedFiles = getUploadedFiles().filter(
            (file) => !filesBeforeUpload.includes(file)
        );
        assert.strictEqual(uploadedFiles.length, 1);
        assert.strictEqual(fs.existsSync(path.join(uploadDir, uploadedFiles[0])), true);
    } finally {
        Complaint.create = originalCreate;
        for (const file of uploadedFiles || []) {
            fs.unlinkSync(path.join(uploadDir, file));
        }
    }
});
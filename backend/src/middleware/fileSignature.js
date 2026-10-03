const fs = require('fs');

// Read the uploaded file as a buffer for signature validation
function readFileBuffer(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer;
}

function matchesFileSignature(fileBuffer, mimeType) {
    // Check the file signature based on its declared MIME type
    if (mimeType === 'image/jpeg') {
        return fileBuffer.subarray(0, 3).equals(
            Buffer.from([0xFF, 0xD8, 0xFF])
        );
    }

    if (mimeType === 'image/png') {
        return fileBuffer.subarray(0, 8).equals(
            Buffer.from([
                0x89, 0x50, 0x4E, 0x47,
                0x0D, 0x0A, 0x1A, 0x0A
            ])
        );
    }

    if (mimeType === 'image/webp') {
        return (
            fileBuffer.subarray(0, 4).equals(Buffer.from('RIFF')) &&
            fileBuffer.subarray(8, 12).equals(Buffer.from('WEBP'))
        );
    }

    return false;
}

module.exports = {
    readFileBuffer,
    matchesFileSignature
};

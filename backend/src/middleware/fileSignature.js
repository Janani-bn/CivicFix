const fs = require('fs');

// Read the uploaded file as a buffer for signature validation
function readFileBuffer(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer;
}

function matchesFileSignature(fileBuffer, mimeType) {
    if (mimeType === 'image/jpeg') {
        return (
            fileBuffer.length >= 4 &&
            fileBuffer[0] === 0xFF &&
            fileBuffer[1] === 0xD8 &&
            fileBuffer[fileBuffer.length - 2] === 0xFF &&
            fileBuffer[fileBuffer.length - 1] === 0xD9
        );
    }

    if (mimeType === 'image/png') {
        const pngSignature = Buffer.from([
            0x89, 0x50, 0x4E, 0x47,
            0x0D, 0x0A, 0x1A, 0x0A
        ]);

        if (
            fileBuffer.length < 33 ||
            !fileBuffer.subarray(0, 8).equals(pngSignature)
        ) {
            return false;
        }

        // The first chunk of a PNG must be IHDR.
        return fileBuffer.subarray(12, 16).equals(Buffer.from('IHDR'));
    }

    if (mimeType === 'image/webp') {
        return (
            fileBuffer.length >= 16 &&
            fileBuffer.subarray(0, 4).equals(Buffer.from('RIFF')) &&
            fileBuffer.subarray(8, 12).equals(Buffer.from('WEBP')) &&
            (
                fileBuffer.subarray(12, 16).equals(Buffer.from('VP8 ')) ||
                fileBuffer.subarray(12, 16).equals(Buffer.from('VP8L')) ||
                fileBuffer.subarray(12, 16).equals(Buffer.from('VP8X'))
            )
        );
    }

    return false;
}

module.exports = {
    readFileBuffer,
    matchesFileSignature
};

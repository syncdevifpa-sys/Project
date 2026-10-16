function validateProfilePhoto(body) {
    if (!Object.hasOwn(body, 'foto') || body.foto === '') return;
    const value = body.foto;
    const match =
        typeof value === 'string' &&
        value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match || value.length > 750000) {
        const error = new Error('Use uma foto JPG, PNG ou WEBP de até 500 KB após o recorte.');
        error.status = 400;
        throw error;
    }
    const bytes = Buffer.from(match[2], 'base64');
    const valid =
        bytes.length <= 500 * 1024 &&
        (match[1] === 'jpeg'
            ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : match[1] === 'png'
              ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              : bytes.subarray(0, 4).toString() === 'RIFF' &&
                bytes.subarray(8, 12).toString() === 'WEBP');
    if (!valid) {
        const error = new Error('Formato ou tamanho da foto inválido.');
        error.status = 400;
        throw error;
    }
}
module.exports = { validateProfilePhoto };

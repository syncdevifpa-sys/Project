const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../../uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdir(uploadDir, { recursive: true }, (error) => cb(error, uploadDir));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'file-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                'Tipo de arquivo não permitido. Envie imagem (JPEG, PNG, WEBP) ou documento (PDF, DOCX).'
            ),
            false
        );
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter
});

// Upload de arquivo único (foto de perfil, anexo de edital ou documento)
router.post(
    '/',
    authenticateToken,
    (req, res, next) => {
        if (process.env.VERCEL)
            return res
                .status(503)
                .json({
                    error: 'O envio de anexos ainda precisa de armazenamento permanente neste ambiente.'
                });
        next();
    },
    upload.single('arquivo'),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const publicUrl = `/uploads/${req.file.filename}`;
        res.json({
            message: 'Arquivo enviado com sucesso.',
            url: publicUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
    }
);

module.exports = router;

const express = require("express");

const router = express.Router();

const {
    listMyDocuments,
    listAllDocuments,
    getDocumentById,
    createDocument,
    updateDocument,
    deleteDocument
} = require("../controllers/documents.controller");

const {
    authenticateToken,
    authorizeRoles
} = require("../middlewares/auth.middleware");

// Logged user documents
router.get(
    "/my",
    authenticateToken,
    listMyDocuments
);

// Staff management
router.get(
    "/",
    authenticateToken,
    authorizeRoles("servidor"),
    listAllDocuments
);

// Specific document
router.get(
    "/:id",
    authenticateToken,
    getDocumentById
);

// Create request
router.post(
    "/",
    authenticateToken,
    createDocument
);

// Staff processes request
router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("servidor"),
    updateDocument
);

// Owner can cancel initial request
router.delete(
    "/:id",
    authenticateToken,
    deleteDocument
);

module.exports = router; 
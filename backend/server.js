const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();

const PORT = process.env.PORT || 3001;

// ==============================
// Routes
// ==============================

const noticesRoutes = require("./src/routes/notices.routes");
const authRoutes = require("./src/routes/auth.routes");
const usersRoutes = require("./src/routes/users.routes");
const coursesRoutes = require("./src/routes/courses.routes");
const tasksRoutes = require("./src/routes/tasks.routes");
const calendarRoutes = require("./src/routes/calendar.routes");
const projectsRoutes = require("./src/routes/projects.routes");
const documentsRoutes = require("./src/routes/documents.routes");
const remindersRoutes = require("./src/routes/reminders.routes");
const usefulLinksRoutes = require("./src/routes/usefulLinks.routes");
const externalUsersRoutes = require("./src/routes/externalUsers.routes");
const readNoticesRoutes = require("./src/routes/readNotices.routes");
const sessionsRoutes = require("./src/routes/sessions.routes");
const passwordRecoveryRoutes = require("./src/routes/passwordRecovery.routes");

// ==============================
// CORS
// ==============================

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");

    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );

    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

// ==============================
// JSON
// ==============================

app.use(express.json({ limit: '2mb' }));

// ==============================
// Main API route
// ==============================

app.get("/api", (req, res) => {
    res.json({
        message: "API Arcádia funcionando!"
    });
});

// ==============================
// Application routes
// ==============================

app.use("/api/notices", noticesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/useful-links", usefulLinksRoutes);
app.use("/api/external", externalUsersRoutes);
app.use("/api/read-notices", readNoticesRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/password-recovery", passwordRecoveryRoutes);
app.use(express.static(path.join(__dirname, '../front')));
console.log("Application routes configured.");

// ==============================
// 404
// ==============================

app.use((req, res) => {
    res.status(404).json({
        error: "Página ou recurso não encontrado."
    });
});

// ==============================
// Start server
// ==============================

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    console.error('Request failed:', error);
    const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
    res.status(status).json({ error: status === 413 ? 'O arquivo enviado é muito grande.' : status === 400 ? 'Os dados enviados são inválidos.' : 'Não foi possível concluir a operação. Tente novamente.' });
});

if (require.main === module) app.listen(PORT, () => {
    console.log(`API running at http://localhost:${PORT}`);
});
module.exports = app;

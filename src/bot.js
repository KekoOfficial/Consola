const { makeWASocket, useMultiFileAuthState, DisconnectReason, jidNormalizedUser, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const cron = require('node-cron');
const qrcode = require('qrcode-terminal');
const chalk = require('chalk');
const { loadSentRecords, saveSentRecords } = require('./utils/fileHandler');
const { log, logError } = require('./utils/logger');

const botVersion = "1.0.0";
let sentUsers = [];

/**
 * Envia un mensaje de bienvenida a un usuario específico y lo registra con persistencia.
 * @param {object} sock El objeto de socket de Baileys.
 * @param {string} user El JID del usuario.
 * @param {string} groupName El nombre del grupo.
 */
async function sendWelcomeMessageWithPersistence(sock, user, groupName) {
    const normalizedUser = jidNormalizedUser(user);
    if (!sentUsers.includes(normalizedUser)) {
        try {
            const now = new Date();
            const date = now.toLocaleDateString();
            const time = now.toLocaleTimeString('en-US', { hour12: false });
            const message = `
╔═══════════════════╗
║       🤖 SUBBOT       ║
╠═══════════════════╣
║ ¡Hola! Soy tu Subbot. ║
╠═══════════════════╣
║ 👥 Grupo: ${groupName}
║ 📅 Fecha: ${date}
║ ⏰ Hora: ${time}
╚═══════════════════╝`;

            await sock.sendMessage(normalizedUser, { text: message });
            sentUsers.push(normalizedUser);
            saveSentRecords(sentUsers);
            log(`Mensaje de bienvenida enviado a ${normalizedUser} del grupo ${groupName}`);
        } catch (error) {
            logError(`Error enviando mensaje a ${normalizedUser}: ${error.message}`);
        }
    } else {
        log(`Usuario ${normalizedUser} ya contactado. Omitiendo.`);
    }
}

async function startBot() {
    console.log(chalk.blue(`
███████╗███████╗██████╗ ███████╗██████╗ ███████╗
██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗██╔════╝
███████╗█████╗  ██████╔╝█████╗  ██████╔╝███████╗
╚════██║██╔══╝  ██╔══██╗██╔══╝  ██╔══██╗╚════██║
███████║███████╗██║  ██║███████╗██║  ██║███████║
╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝
    `));

    sentUsers = loadSentRecords();

    const sessionPath = './session';
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        browser: Browsers.macOS("Desktop"),
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            console.log(chalk.yellow("📌 Escanea este QR con tu WhatsApp:"));
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(chalk.red(`Conexión cerrada. Razón: ${statusCode}`));
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log(chalk.yellow('Reconectando...'));
                await startBot();
            } else {
                console.log(chalk.red('Sesión cerrada. Por favor, elimina la carpeta session e inicia de nuevo.'));
            }
        } else if (connection === "open") {
            console.log(chalk.green("✅ Bot conectado a WhatsApp"));

            const groups = await sock.groupFetchAllParticipating();
            for (const group of Object.values(groups)) {
                if (group.participants) {
                    const groupName = group.subject;
                    for (const participant of group.participants) {
                        await sendWelcomeMessageWithPersistence(sock, participant.id, groupName);
                    }
                }
            }
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        const groupId = update.id;
        if (update.action === 'add') {
            const groupMetadata = await sock.groupMetadata(groupId);
            const groupName = groupMetadata.subject;
            for (const participant of update.participants) {
                await sendWelcomeMessageWithPersistence(sock, participant, groupName);
            }
        }
    });

    cron.schedule('0 8 * * *', async () => {
        const groupJid = 'TU_JID_DE_GRUPO@g.us';
        const message = '¡Buenos días! Este es un recordatorio diario. ¡Que tengas un gran día!';
        try {
            await sock.sendMessage(groupJid, { text: message });
            log(`Mensaje diario enviado a [${groupJid}]`);
        } catch (e) {
            logError(`Error al enviar mensaje programado: ${e.message}`);
        }
    });
}

module.exports = { startBot };
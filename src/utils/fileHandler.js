const fs = require('fs');
const path = require('path');
const { log, logError } = require('./logger');

const SENT_FILE = path.resolve(__dirname, '../../sentUsers.json');

/**
 * Carga los registros de usuarios contactados desde el archivo de persistencia.
 * @returns {Array} Un array con los JID de los usuarios contactados.
 */
function loadSentRecords() {
    try {
        if (fs.existsSync(SENT_FILE)) {
            const data = fs.readFileSync(SENT_FILE, 'utf-8');
            return JSON.parse(data);
        } else {
            log('No se encontraron registros previos. Se creará un nuevo archivo.');
            return [];
        }
    } catch (err) {
        logError(`Error al leer el archivo de registros: ${err.message}`);
        return [];
    }
}

/**
 * Guarda los registros de usuarios en el archivo de persistencia.
 * @param {Array} sentUsers El array de JID de usuarios a guardar.
 */
function saveSentRecords(sentUsers) {
    try {
        fs.writeFileSync(SENT_FILE, JSON.stringify(sentUsers, null, 2));
    } catch (err) {
        logError(`Error al guardar los registros: ${err.message}`);
    }
}

module.exports = { loadSentRecords, saveSentRecords };
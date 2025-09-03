const chalk = require('chalk');

const log = (message) => {
    console.log(chalk.green(`> ✅ Log: ${message}`));
};

const logError = (message) => {
    console.error(chalk.red(`> ❌ Error: ${message}`));
};

const logWarning = (message) => {
    console.log(chalk.yellow(`> ⚠️ Advertencia: ${message}`));
};

module.exports = { log, logError, logWarning };
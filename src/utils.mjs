async function checkBinaryExists(name) {
    console.log(chalk.blue(`Checking if ${name} exists...`))

    try {
        await which(name);
    } catch {
        return false;
    }

    return true;
}

export async function assertBinariesExist() {
    if (!await checkBinaryExists('psql')) {
        console.log(chalk.red('You have no `psql` installed. Exiting...'));
        process.exit(1);
    } else {
        console.log(chalk.green('OK'));
    }
}


export async function parsePgPassFile(pgPassFilePath) {
    try {
        const content = await fs.readFile(pgPassFilePath);
        const parts = content.toString().trim().split(':');

        if (parts.length !== 5) {
            echo(chalk.red(`Invalid .pgpass file:  ${pgPassFilePath}`))
        }

        return {
            host: parts[0],
            port: parts[1],
            db: parts[2],
            user: parts[3],
            password: parts[4],
        };

    } catch (e) {
        echo(chalk.red(`.pgpass file does not exist:  ${pgPassFilePath}`))
        process.exit(1);
    }
}

export function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);

    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

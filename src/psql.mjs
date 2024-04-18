export class PsqlInstance {
    /**
     * @param dbCredentials.host {string}
     * @param dbCredentials.port {string}
     * @param dbCredentials.db {string}
     * @param dbCredentials.user {string}
     * @param dbCredentials.password {string}
     * @param pgPassFileFullPath {string}
     */
    constructor(dbCredentials, pgPassFileFullPath) {
        this.dbCredentials = dbCredentials;
        this.pgPassFileFullPath = pgPassFileFullPath;
    }


    async runCommand(actualCommand) {
        const result = await within(async () => {
            $.prefix += `export PGPASSFILE=${this.pgPassFileFullPath}; psql -h ${this.dbCredentials.host} -p ${this.dbCredentials.port} -U ${this.dbCredentials.user} -d ${this.dbCredentials.db} --no-password`

            return await actualCommand()
        });

        if (result.stderr.indexOf('0600') !== -1) {
            console.log(chalk.red('You have to change `.pgpass` file permissions; Permissions should be u=rw (0600) or less. Exiting...'));
            process.exit(1);
        }

        // TODO handle general errors

        return result;
    }

    /**
     * Get all hypertable chunks info
     * @param schema
     * @param hypertable
     * @return {Promise<{primary_dimension: string, range_end: *, chunk_name: string, range_start: *}[]>}
     */
    async getChunks(schema, hypertable) {
        const result = await this.runCommand(async () => {
            const queryChunksSql = `\\COPY (select * from timescaledb_information.chunks where hypertable_schema='${schema}' AND hypertable_name='${hypertable}' order by range_start ASC) TO stdout CSV;`
            return $` --expanded -c ${queryChunksSql}`.quiet().nothrow();
        });

        return result.stdout
            .split('\n')
            .filter(Boolean)
            .map(
                row => {
                    const cell = row.split(',');
                    return {chunk_name: cell[3], primary_dimension: cell[4], range_start: cell[6], range_end: cell[7]};
                }
            );
    }

    async dumpChunk(schema, hypertable, chunk_name, primary_dimension, range_start, range_end, file_path) {
        const command = `SELECT *
                         FROM ${schema}.${hypertable}
                         WHERE ${primary_dimension} >= '${range_start}'
                           AND ${primary_dimension} < '${range_end}'
                         ORDER BY ${primary_dimension} ASC`;

        return $`
exec 4>&1
sql=${command};
error_statuses="$( ( \\
\t(export PGPASSFILE=${this.pgPassFileFullPath}; psql -h ${this.dbCredentials.host} -p ${this.dbCredentials.port} -U ${this.dbCredentials.user} -d ${this.dbCredentials.db} --no-password -c "\\COPY ( \\
$sql \\
) TO stdout CSV" || echo "0:$?" >&3) | \\
\t(gzip -f -6 -c > ${file_path} || echo "1:$?" >&3) \\
) 3>&1 >&4)"
exec 4>&-;

echo $error_statuses
`
            .quiet()
            .then((result) => {
                if (result.exitCode !== 0) {
                    chalk.red('Error while dumping chunk.');
                    fs.removeSync(file_path);
                    chalk.red(`Out file removed ${file_path}`);
                }

                return result;
            }).catch((e) => {
                console.log('Error', e);
                throw e;
            });
    }
}



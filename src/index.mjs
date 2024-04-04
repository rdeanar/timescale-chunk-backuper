#!/usr/bin/env zx

import 'zx/globals'
import {assertBinariesExist, parsePgPassFile} from "./utils.mjs";
import options from "./options.mjs";
import {PsqlInstance} from "./psql.mjs";

await assertBinariesExist();

const dbCredentials = await parsePgPassFile(options.pgPass);

const psql = new PsqlInstance(dbCredentials, options.pgPass)

const chunks = await psql.getChunks(options.schema, options.hypertable);

if(chunks.length === 0) {
    console.log(chalk.bgBlue('No chunks found. Exiting...'));
    process.exit(0);
}

console.log('Chunks found', chunks.length);

for (let i = 0; i < chunks.length; i++) {
    const chunkInfo = chunks[i];
    console.log('Backup ' + chunkInfo.chunk_name);
    console.log(chunkInfo);
    const outFilePath = path.join(options.outDir, `${options.hypertable}_${chunkInfo.chunk_name}.csv.gz`);

    const isAlreadyExists = fs.existsSync(outFilePath)

    if (isAlreadyExists) {
        console.log('File already exists', outFilePath, 'Skip.');
    } else {
        const r = await spinner(
            `Dumping chunk ${chunkInfo.chunk_name}...`,
            () => psql.dumpChunk(options.schema, options.hypertable, chunkInfo.chunk_name, chunkInfo.primary_dimension, chunkInfo.range_start, chunkInfo.range_end, outFilePath)
        );
        console.log(r);
    }
}

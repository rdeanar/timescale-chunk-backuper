#!/usr/bin/env zx

import 'zx/globals'
import {assertBinariesExist, parsePgPassFile} from "./utils.mjs";
import options from "./options.mjs";
import {PsqlInstance} from "./psql.mjs";
import {State} from "./state.mjs";

await assertBinariesExist();

const state = new State(path.resolve(options.outDir, `${options.schema}.${options.hypertable}.state.json`))

const dbCredentials = await parsePgPassFile(options.pgPass);

const psql = new PsqlInstance(dbCredentials, options.pgPass)

const chunks = await psql.getChunks(options.schema, options.hypertable);

if (chunks.length === 0) {
    console.log(chalk.bgBlue('No chunks found. Exiting...'));
    process.exit(0);
}

console.log('Chunks found', chunks.length);

const latestChunkName = state.getLatestChunkName()

let latestChunkReached = false;

for (let i = 0; i < chunks.length; i++) {
    const chunkInfo = chunks[i];

    const outFilePath = path.join(options.outDir, `${options.hypertable}_${chunkInfo.chunk_name}.csv.gz`);
    const tempOutFilePath = path.join(options.outDir, `_${options.hypertable}_${chunkInfo.chunk_name}_${new Date().toUTCString().replaceAll(' ', '_').replace(',', '')}.csv.gz`);

    const isAlreadyExists = fs.existsSync(outFilePath)

    if (!latestChunkReached && isAlreadyExists) {
        if (latestChunkName === chunkInfo.chunk_name) {
            latestChunkReached = true;
        } else {
            console.log('File already exists', outFilePath, 'Skip.');
            continue;
        }
    }


    console.log('Process chunk', chunkInfo.chunk_name, `From ${chunkInfo.range_start.replace(' 00:00:00+00','')} to ${chunkInfo.range_end.replace(' 00:00:00+00','')}`);

    const dumpChunkResult = await spinner(
        `Dumping chunk ${chunkInfo.chunk_name}...`,
        () => psql.dumpChunk(options.schema, options.hypertable, chunkInfo.chunk_name, chunkInfo.primary_dimension, chunkInfo.range_start, chunkInfo.range_end, tempOutFilePath)
    );

    if ((await dumpChunkResult).exitCode === 0) {
        await fs.move(tempOutFilePath, outFilePath, {overwrite: true}, err => {
            if (err) {
                console.error(`Error while moving temp file to destination. Keep temp file: ${tempOutFilePath}`)

                process.exit(1);
            }
            console.log('File written: ', outFilePath);
            state.writeLatestChunkName(chunkInfo.chunk_name);
        });
    }
}

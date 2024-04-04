import {cleanEnv, str, makeValidator} from 'envalid'

const dir = makeValidator((value) => {
    if (!fs.existsSync(value)) {
        throw new Error(`Directory not exists: ${value}`)
    }
    return value;
})

const pgPass = makeValidator((value) => {
    const fullPath = path.resolve(value);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Not exists: "${fullPath}"`)
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
        const filePath = path.join(fullPath, '.pgpass');
        if (fs.existsSync(filePath)) {
            return path.resolve(filePath);
        } else {
            throw new Error(`.pgpass file not exists under: "${fullPath}"`);
        }
    }
    return fullPath;
})

const options = cleanEnv(argv, {
    pgPass: pgPass({
        default: path.join((await $`pwd`).toString().trim(), '.pgpass'),
    }),
    outDir: dir({
        default: (await $`pwd`).toString().trim(),
    }),
    hypertable: str({
        desc: 'hypertable name'
    }),
    schema: str({
        desc: 'hypertable schema name',
        default: 'public'
    }),

    // ADMIN_EMAIL: email({ default: 'admin@example.com' }),
    // EMAIL_CONFIG_JSON: json({ desc: 'Additional email parameters' }),
    // NODE_ENV: str({ choices: ['development', 'test', 'production', 'staging'] }),
})
export default options;

export class State {
    constructor(filePath) {
        fs.ensureFileSync(filePath)

        this.filePath = filePath;
    }

    ensureStateFileLoaded() {
        if(!this.value) {
            this.value = fs.readJSONSync(this.filePath, {throws: false});
        }
    }

    /**
     * @return {string|null}
     */
    getLatestChunkName() {
        this.ensureStateFileLoaded();

        if(!this.value) {
            return null;
        }

        return 'chunk' in this.value ? this.value['chunk'] : null;
    }

    writeLatestChunkName(chunk) {
        if(!this.value) {
            this.value = {};
        }
        this.value.chunk = chunk;

        fs.writeJSONSync(this.filePath, this.value);
    }
}

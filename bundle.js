import LocalDrive from "localdrive";
import {pack, rollupFromSourcePlugin} from "bring-your-own-storage-utilities/deploy";
import terser from "@rollup/plugin-terser";

const projectFolder = new LocalDrive(".");
await pack("./index.js", "./dist/index.min.js", {
    plugins: [
        rollupFromSourcePlugin(projectFolder),
        terser()
    ]
});

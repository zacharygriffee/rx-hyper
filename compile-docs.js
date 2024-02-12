import jsdoc2md from "jsdoc-to-markdown"
import path from "path";
import LocalDrive from "localdrive";
import b4a from "b4a";
import {fileURLToPath} from "url";
const p = fileURLToPath(import.meta.url);
const __dirname = path.dirname(p);

// const storageDrive = new LocalDrive(_.path.resolve(__dirname, ".."));
const projectFolder = new LocalDrive(path.resolve(__dirname, "./"));

try {
        await jsdoc2md.render({files: ["./index.js", "lib/**.js"]}).then(
            data => {
                data = `
# rx-hyper API
> See [docs.holepunch.to](https://docs.holepunch.to/) for thorough documentation of the functions. This documentation 
will address the functions currently supported and what maybe different from the non-rx version that this library wraps. 

${data}`;
                return projectFolder.put(`./docs/api.md`, b4a.from(data));
            }
        );

    console.log("Docs created.");
} catch (e) {
    console.error(e);
}

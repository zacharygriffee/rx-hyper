export * as RxCore from "./lib/rx-core.js";
export * as RxCorestore from "./lib/rx-corestore.js";

/**
 * @namespace RxHyper
 */

let installed = 0;
let baseContainer;
let installing = 0;

/**
 * Configurations
 *
 *
 * @property dependencies
 * A List of dependencies needed by this library to operate.
 * Dependencies added should have the name used on npm.
 * <pre>
 *     Necessary Dependencies:
 *     rxjs
 *     rxjs/operators
 *     awilix
 *     compact-encoding
 *     b4a
 *
 *     Optional Dependencies:
 *     random-access-memory   // As long as you declare a storage when creating for RxCore and RxCorestore
 * </pre>
 * @example
 * config = {
 *     dependencies: {
 *         ["the-answer"]: {
 *             async get() {
 *                 return configuration.importModule("the-answer")
 *             }
 *         }
 *     }
 * }
 *
 * @property resolvedDependencies
 * Dependencies resolved via install. If another library utilizes this configuration interface, you can
 * pass this configuration to that library.
 * @property defaultStorage
 * The random access storage dependency to use. IF you use a different random-access-storage, add the dependency
 * to the configuration.dependencies object.
 * @property makeFile
 * How to utilize the default storage to make a random-access-storage instance.
 * @property importModule
 * How to import modules. This function is invoked with (bareSpecifier, cdnFormatter) where you can specify how
 * to format the cdn to use.
 * @memberOf RxHyper
 */
let configuration = {
    resolvedDependencies: {},
    dependencies: {
        ["rxjs"]: {
            get: () => configuration.importModule("rxjs")
        },
        ["rxjs/operators"]: {
            get: () => configuration.importModule("rxjs/operators")
        },
        ["random-access-memory"]: {
            get: () => configuration.importModule("random-access-memory").then(o => o.default),
            optional: true
        },
        ["awilix"]: {
            get: () => configuration.importModule("awilix", () => `https://esm.run/awilix@10.0.1/lib/awilix.browser.js`)
        },
        ["compact-encoding"]: {
            get: () => configuration.importModule("compact-encoding").then(o => o.default)
        },
        ["b4a"]: {
            get: () => configuration.importModule("b4a").then(o => o.default)
        }
    },
    importModule,
    defaultStorage: "random-access-memory",
    makeFile: (RAM, ...args) => new RAM(...args)
}

/**
 * Install necessary dependencies to operate the base level RxHyper functions. This is automatically called
 * by higher level installs like RxCore.install()
 * @param config Modifications to the default configuration.
 * @memberOf RxHyper
 */
async function install(config = {}) {
    configuration = {...configuration, ...config};
    if (installed++ && baseContainer) return baseContainer;
    if (installing++) {
        return new Promise((resolve) => {
            const timer = setInterval(() => {
                if (!installing) {
                    resolve(baseContainer);
                    clearInterval(timer);
                }
            }, 100);
        })
    }
    const [
        rxjs,
        rxjsOperators,
        {createContainer, asFunction, asValue, aliasTo},
        defaultRandomAccess,
        cenc,
        b4a
    ] = await installDependency(["rxjs", "rxjs/operators", "awilix", configuration.defaultStorage, "compact-encoding", "b4a"], configuration);

    baseContainer = createContainer();
    installing--;
    return baseContainer.register({
        rx: asValue({...rxjsOperators, ...rxjs}),
        makeFile: asFunction(({randomAccess}) => (...args) => configuration.makeFile(randomAccess, ...args)),
        // rxjs wants to test 'schedule' and throws awilix.
        // This has no purpose in this library as of now.
        schedule: asValue(null),
        createContainer: asValue(createContainer),
        asFunction: asValue(asFunction),
        asValue: asValue(asValue),
        aliasTo: asValue(aliasTo),
        cenc: asValue(cenc),
        b4a: asValue(b4a),
        randomAccess: asValue(defaultRandomAccess)
    });
}

export async function installDependency(name) {
    if (Array.isArray(name)) {
        return Promise.all(
            name.map(
                o => installDependency(...(Array.isArray(o) ? o : [o]), configuration)
            )
        )
    }
    const record = (configuration.dependencies)[name] || {};
    const {optional} = record;
    try {
        return (configuration.resolvedDependencies)[name] ||= await (configuration.dependencies)[name].get();
    } catch (e) {
        if (!optional) {
            throw new Error(`Non-optional dependency '${name}' could not be resolved.`);
        }
        return {};
    }
}

async function importModule(urlOrModuleSpecifier, cdnFormatter = (specifier, config) => {
    return `https://esm.run/${specifier}`;
}) {
    let isUrl, isNodeLike = typeof process !== "undefined" && process?.versions?.node;

    try {
        new URL(urlOrModuleSpecifier);
        isUrl = true;
    } catch (e) {
        isUrl = false;
    }

    if (isUrl && isNodeLike) {
        throw new Error("You cannot import url modules via node.");
    }

    return await import(isUrl ? urlOrModuleSpecifier : cdnFormatter(urlOrModuleSpecifier, configuration));
}

export {install, configuration}

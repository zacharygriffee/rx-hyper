import {configuration, install as installBase, installDependency} from "../index.js";
import {fromCore, install as installCore} from "./rx-core.js";
import {extend} from "./extend.js";
import {isStream} from "./is-stream.js";
import {takeSync} from "./takeSync.js";

/**
 * @namespace RxHyper.RxCorestore
 */


/**
 * Convenience sync method of RxCorestore.get$
 * @memberOf RxHyper.RxCorestore
 */
function get({corestore}) {
    return config => fromCore(corestore.get(config))
}

/**
 * Get a RxCore from the RxCorestore.
 * @param config Configuration to pass to the underlying corestore.get function
 * @memberOf RxHyper.RxCorestore
 */
function get$({get, rx}) {
    return (config) => rx.of(get(config))
}

/**
 * Get a session RxCorestore from the underlying RxCorestore.
 * @param config Configuration to pass to the session
 * @memberOf RxHyper.RxCorestore
 */
function session({corestore}) {
    return config => fromCorestore(corestore.session(config))
}

/**
 * Get a namepsaced RxCorestore from the underlying RxCorestore.
 * @param config Configuration to pass to the namespaced corestore
 * @memberOf RxHyper.RxCorestore
 */
function namespace({corestore}) {
    return config => fromCorestore(corestore.namespace(config))
}

/**
 * An Observable for the 'core-open' event.
 * @memberOf RxHyper.RxCorestore
 */
function onCoreOpen$({rx, corestore}) {
    return rx.fromEvent(corestore, "core-open");
}

/**
 * An Observable for the 'core-close' event.
 * @memberOf RxHyper.RxCorestore
 */
function onCoreClose$({rx, corestore}) {
    return rx.fromEvent(corestore, "core-close");
}

/**
 * Experimental.
 *
 * ** Backpressure is not handled at the moment.
 * ** Not yet supported in browser unless you utilize a relayed transport socket.
 *
 * Replicate corestore over rxjs streams.
 *
 * @example
 *
 * const corestore1 = corestore1.create();
 * const corestore2 = corestore2.create();
 *
 * // Ensure that the 'initiator/client' is the one calling replicate$
 * corestore1.replicate$(corestore2);
 * // This is same as above.
 * corestore2.replicate$(corestore1.replicate$());
 *
 * @memberOf RxHyper.RxCorestore
 */
function replicate$({corestore, rx, Corestore}) {
    return otherStream => {
        if (otherStream instanceof Corestore)
            otherStream = fromCorestore(otherStream);
        if (otherStream?.isRxCorestore) otherStream = otherStream.replicate$();
        if (otherStream && isStream(otherStream)) {
            const _otherStream = otherStream;
            otherStream = extend(
                rx.fromEvent(_otherStream, "data"),
                {
                    next(buff) {
                        _otherStream.write(buff);
                    },
                    complete() {
                        _otherStream.end();
                    },
                    error(e) {
                        _otherStream.destroy(e);
                    }
                }
            );
        }
        const isInitiator = !!otherStream;
        const stream = corestore.replicate(isInitiator);

        if (otherStream) {
            rx.fromEvent(stream, "data").subscribe(otherStream);
            return otherStream.subscribe({
                next(buff) {
                    stream.write(buff);
                },
                complete() {
                    stream.end();
                },
                error(e) {
                    stream.destroy(e);
                }
            })
        } else {
            const stream$ = rx.fromEvent(stream, "data");
            return extend(stream$, {
                next(buff) {
                    stream.write(buff);
                },
                complete() {
                    stream.end();
                },
                error(e) {
                    stream.destroy(e);
                },
                stream
            })
        }
    };
}

/**
 * Create a findingPeers observable. Automatically puts a 6-second timer. You can add your own factory to
 * have your own conditions as to when the findingPeers is over. The `doneFactory` has the RxCorestore's container, so you
 * can access any of the dependencies including rxjs.
 *
 * @example
 * findingPeers$({rx}) => {
 *     // 10 seconds instead of 6
 *     return rx.timer(10000);
 * }).subscribe();
 *
 *
 * @memberOf RxHyper.RxCorestore
 */
function findingPeers$(cradle) {
    const {rx, corestore} = cradle;
    return (doneFactory = defaultDoneFactory) => rx.of(corestore.findingPeers()).pipe(
        rx.concatMap(
            (doneFunction) => doneFactory(cradle)
                .pipe(
                    rx.map(() => doneFunction())
                )
        )
    )

    function defaultDoneFactory() {
        return rx.timer(6000)
    }
}

/**
 * Create an RxCorestore from an existing plain corestore.
 * @param corestore corestore to wrap
 * @memberOf RxHyper.RxCorestore
 */
function fromCorestore(corestore) {
    return corestoreBaseContainer
        .createScope()
        .register({
            corestore: asFunction(() => {
                return corestore
            }).scoped()
        })
        .cradle;
}

/**
 * Create a new RxCorestore.
 * @param config Configuration the corestore will use.
 * @memberOf RxHyper.RxCorestore
 */
function create(config = {}) {
    const {
        rx
    } = corestoreBaseContainer.cradle;
    if (typeof config === "number") config = Array(config);
    if (rx.isObservable(config) || Array.isArray(config)) {
        const results = [];
        rx.from(config).pipe(takeSync(rx)).subscribe(config => results.push(config))
        return results.map(create);
    }
    const {
        storage = corestoreBaseContainer.cradle.makeFile
    } = config;
    return corestoreBaseContainer
        .createScope()
        .register(
            {
                storage: asValue(storage),
                config: asValue(config),
                corestore: asFunction(({Corestore, storage, config}) => new Corestore(storage, config)).scoped()
            }
        ).cradle;
}

let installed = 0;
let installing = 0;
let corestoreBaseContainer;
let createContainer, asFunction, asValue, aliasTo;

async function installLocalDependencies() {
    return configuration.dependencies["corestore"] ||= {
        get: () => configuration.importModule("corestore").then(o => o.default)
    }
}

/**
 * Install dependencies necessary for RxCorestore operation.
 *
 * Since my libraries are peer-to-peer centric, the dependency responsibility should be on the local client instead of
 * the server, since p2p tries to limit or remove server-dependency.
 *
 * @example
 * // You got the corestore imported already.
 * import Corestore from "corestore";
 * await install({
 *     dependencies: {
 *         corestore: {
 *              // Get can be async
 *              get() {
 *                  return Corestore
 *              }
 *         }
 *     }
 * }
 *
 * @param config Modifications to the default configuration.
 * @memberOf RxHyper.RxCorestore
 */
async function install(config = {}) {
    config = {...configuration, ...config};
    if (installed++ && corestoreBaseContainer) return corestoreBaseContainer;
    if (installing++) {
        return new Promise((resolve) => {
            const timer = setInterval(() => {
                if (!installing) {
                    resolve(corestoreBaseContainer);
                    clearInterval(timer);
                }
            }, 100);
        })
    }
    const baseContainer = await installBase(config);
    await installCore(config);
    await installLocalDependencies();
    corestoreBaseContainer = baseContainer.createScope();
    ({
        createContainer, asFunction, asValue, aliasTo
    } = corestoreBaseContainer.cradle);
    const Corestore = await installDependency("corestore");
    installing--;
    return corestoreBaseContainer.register({
        isRxCorestore: asValue(true),
        Corestore: asValue(Corestore),
        replicate$: asFunction(replicate$).scoped(),
        get$: asFunction(get$).scoped(),
        get: asFunction(get).scoped(),
        session: asFunction(session).scoped(),
        namespace: asFunction(namespace).scoped(),
        onCoreOpen$: asFunction(onCoreOpen$).scoped(),
        onCoreClose$: asFunction(onCoreClose$).scoped(),
        close: asFunction(({corestore}) => () => corestore.close()).scoped(),
        findingPeers$: asFunction(findingPeers$).scoped(),
        // todo: next, complete, and error.
        next: asFunction(() => {}),
        complete: asFunction(() => {}),
        error: asFunction(() => {})
    });
}

export {
    fromCorestore,
    create,
    install
}

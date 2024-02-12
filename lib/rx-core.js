import {configuration, install as installBase, installDependency} from "../index.js";
import {extend} from "./extend.js";
import {isStream} from "./is-stream.js";
import {takeSync} from "./takeSync.js";

/**
 * @namespace RxHyper.RxCore
 */

function session({core}) {
    return options => fromCore(core.session(options))
}

function snapshot({core}) {
    return options => fromCore(core.snapshot(options))
}

/**
 * Experimental.
 *
 * ** Backpressure is not handled at the moment.
 * ** Not yet supported in browser unless you utilize a relayed socket.
 *
 * Replicate cores over rxjs streams.
 *
 * @example
 *
 * const core1 = RxCore.create();
 * await core1.ready();
 * const core2 = RxCore.create({key: core1.key});
 *
 * // Ensure that the 'initiator/client' is the one calling replicate$
 * core2.replicate$(core1);
 * // This is same as above.
 * core2.replicate$(core1.replicate$());
 * // You can use a plain core as well
 * core2.replicate$(core1.core.replicate(false));
 *
 * @memberOf RxHyper.RxCore
 */
function replicate$({core, rx, Hypercore}) {
    return otherStream => {
        if (otherStream instanceof Hypercore)
            otherStream = fromCore(otherStream);
        if (otherStream?.isRxCore) otherStream = otherStream.replicate$();
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
        const stream = core.replicate(isInitiator);

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
 * have your own conditions as to when the findingPeers is over. The `doneFactory` has the RxCore's container, so you
 * can access any of the dependencies including rxjs.
 *
 * @example
 * findingPeers$({rx}) => {
 *     // 10 seconds instead of 6
 *     return rx.timer(10000);
 * }).subscribe();
 *
 *
 * @memberOf RxHyper.RxCore
 */
function findingPeers$(cradle) {
    const {rx, ready$} = cradle;
    return (doneFactory = defaultDoneFactory) => ready$.pipe(
        rx.switchMap(
            core => rx.of(core.findingPeers()).pipe(
                rx.concatMap(
                    (doneFunction) => doneFactory(cradle)
                        .pipe(
                            rx.map(() => doneFunction())
                        )
                )
            )
        )
    )

    function defaultDoneFactory() {
        return rx.timer(6000)
    }
}

/**
 * Download range of blocks from remote core.
 * @param [range] range.start range.end
 * @memberOf RxHyper.RxCore
 */
function download$({rx, ready$}) {
    return range => ready$.pipe(
        rx.switchMap(
            (core) => core.download(range).done().then(() => core)
        )
    )
}

/**
 * Observable for the 'peer-remove' event
 *
 * Difference is, it emits the core that caused the event.
 *
 * @memberOf RxHyper.RxCore
 */
function onPeerRemove$({ready$, rx}) {
    return ready$.pipe(
        rx.switchMap(
            core => rx.fromEvent(core, "peer-remove")
                .pipe(
                    rx.map(() => core)
                )
        )
    );
}

/**
 * Observable for the 'peer-add' event
 *
 * Difference is, it emits the core that caused the event.
 *
 * @memberOf RxHyper.RxCore
 */
function onPeerAdd$({ready$, rx}) {
    return ready$.pipe(
        rx.switchMap(
            core => rx.fromEvent(core, "peer-add")
                .pipe(
                    rx.map(() => core)
                )
        )
    );
}

/**
 * Observable for the 'close' event
 *
 * Difference is, it emits the core that caused the event.
 *
 * @memberOf RxHyper.RxCore
 */
function onClose$({ready$, rx}) {
    return ready$.pipe(
        rx.switchMap(
            core => rx.fromEvent(core, "close")
                .pipe(
                    rx.map(() => core)
                )
        )
    );
}

/**
 * Observable for the 'append' event.
 *
 * Difference is, it emits the core that caused the event.
 *
 * @memberOf RxHyper.RxCore
 */
function onAppend$({ready$, rx}) {
    return ready$.pipe(
        rx.switchMap(
            core => rx.fromEvent(core, "append")
                .pipe(
                    rx.map(() => core)
                )
        )
    );
}

/**
 * Get a block of the core.
 * @param index the block number to get.
 * @param [config] The config to pass to the core.get handler
 * @memberOf RxHyper.RxCore
 */
function get$({ready$, rx}) {
    return (index, config) => {
        return ready$.pipe(
            rx.switchMap(
                (core) => core.get(index, config)
            )
        )
    }
}

/**
 * An append InputObservable.
 *
 * @example
 * // Appends hello and world blocks to the core.
 * append$(({rx}) => rx.of("hello", "world")).subscribe();
 * // You can also just use a value
 * append$(["hello", "world"]).subscribe();
 *
 * @param [factoryOrValue] see example.
 * @memberOf RxHyper.RxCore
 */
function append$(cradle) {
    const {rx, ready$} = cradle;
    return factoryOrValue => ready$.pipe(
        rx.switchMap(
            core =>
                rx.from((
                    typeof factoryOrValue === "function" ?
                            factoryOrValue(cradle) :
                            rx.of(factoryOrValue)
                    )
                ).pipe(
                    rx.concatMap(
                        value => core.append(value).then((o) => ({...o, value}))
                    )
                )
        )
    )
}

/**
 * Emits when the core is ready. Most of the RxCore functions wait for the core to be ready
 * before executing. Just like the plain hypercore, id, key, discoverykey, and other properties won't be availabe
 * untill after the core is ready.
 *
 * @example
 * ready$.subscribe((core) => {
 *     // do stuff with the readied core.
 * })
 * @memberOf RxHyper.RxCore
 */
function ready$({rx, core}) {
    return rx.defer(() => core.ready()).pipe(rx.map(() => core))
}

/**
 * Create a read stream of the core.
 * @param [config] see hypercore createReadStream for configuration.
 * @memberOf RxHyper.RxCore
 */
function createReadStream$({rx, ready$}) {
    return config => ready$.pipe(
        rx.switchMap(core => core.createReadStream(config))
    );
}

/**
 * Create a byte read stream of the core.
 * @param [config] see hypercore createReadStream for configuration.
 * @memberOf RxHyper.RxCore
 */
function createByteStream$({rx, ready$}) {
    return config => ready$.pipe(
        rx.switchMap(core => core.createByteStream(config))
    )
}

/**
 * Create a core from a replication stream.
 * @param stream$ A stream, rxCore, or plain hypercore.
 * @param key The key of the hypercore for replication. Unnecessary if stream$ is a rxCore or hypercore.
 * @param config If a new hypercore is constructed from this, these configurations are passed to that new hypercore.
 * @memberOf RxHyper.RxCore
 */
function fromReplication(stream$, key, config) {
    const {Hypercore, b4a} = coreBaseContainer.cradle;
    ({stream$, key, config} = parseArguments([stream$, key, config]));
    if (key?.isRxCore) key = key.key;
    const _config = {key, ...config};
    const core = create(_config);
    core.core.once("close", core.replicate$(stream$).unsubscribe);
    return core;

    function parseArguments(args) {
        const result = {};
        for (let arg of args) {
            if (arg instanceof Hypercore || arg?.isRxCore || b4a.isBuffer(arg)) {
                result.stream$ ||= arg;
                result.key = arg?.key || arg;
            } else if (typeof arg === "object") {
                result.config = arg;
            }
        }
        if (!result.config) result.config = {};
        return result;
    }
}

// Not yet implemented.
function from(source, config) {
    const {
        Hypercore
    } = coreBaseContainer.cradle;
    if (source.isRxCore) {
        return source;
    } else if (source instanceof Hypercore) {
        return fromCore(source)
    } else if (source.isRxCorestore) {
        return source.get(config)
    }
}
/**
 * Make an existing hypercore into a RxCore.
 * @param {Hypercore} core A hypercore
 * @memberOf RxHyper.RxCore
 */
function fromCore(core) {
    return coreBaseContainer
        .createScope()
        .register({
            core: asFunction(() => {
                return core
            }).scoped()
        })
        .cradle;
}

/**
 * Create an RxCore.
 * @param config Configuration passed to the hypercore.
 * @memberOf RxHyper.RxCore
 */
function create(config = {}) {
    const {
        rx
    } = coreBaseContainer.cradle;
    if (typeof config === "number") config = Array(config);
    if (rx.isObservable(config) || Array.isArray(config)) {
        const results = [];
        rx.from(config).pipe(takeSync(rx)).subscribe(config => results.push(config))
        return results.map(create);
    }
    const {
        storage = coreBaseContainer.cradle.makeFile
    } = config;
    return coreBaseContainer
        .createScope()
        .register({
            storage: asValue(storage),
            config: asValue(config),
            core: asFunction(({Hypercore, storage, config}) => {
                return new Hypercore(storage, config)
            }).scoped()
        })
        .cradle;
}

let installed = 0;
let installing = 0;
let coreBaseContainer;
let createContainer, asFunction, asValue, aliasTo;

async function installLocalDependencies() {
    return configuration.dependencies["hypercore"] ||= {
        get: () => configuration.importModule("hypercore").then(o => o.default)
    }
}

/**
 * Install dependencies for the operation of an RxCore.
 *
 * Since my libraries are peer-to-peer centric, the dependency responsibility should be on the local client instead of
 * the server, since p2p tries to limit or remove server-dependency.
 *
 * @example
 * // You got the hypercore imported already.
 * import Hypercore from "hypercore";
 * await install({
 *     dependencies: {
 *         hypercore: {
 *              // Get can be async
 *              get() {
 *                  return Hypercore
 *              }
 *         }
 *     }
 * }
 *
 * @param config Any modifications to the default configuration
 * @memberOf RxHyper.RxCore
 */
async function install(config = {}) {
    config = {...configuration, ...config};
    if (installed++ && coreBaseContainer) return coreBaseContainer;
    if (installing++) {
        return new Promise((resolve) => {
            const timer = setInterval(() => {
                if (!installing) {
                    resolve(coreBaseContainer);
                    clearInterval(timer);
                }
            }, 100);
        })
    }
    const baseContainer = await installBase(config);
    await installLocalDependencies();
    coreBaseContainer = baseContainer.createScope();
    ({
        createContainer, asFunction, asValue, aliasTo
    } = coreBaseContainer.cradle);
    const Hypercore = await installDependency("hypercore");
    installing--;
    return coreBaseContainer.register({
        isRxCore: asValue(true),
        Hypercore: asValue(Hypercore),
        ready$: asFunction(ready$).scoped(),
        createReadStream$: asFunction(createReadStream$).scoped(),
        createByteStream$: asFunction(createByteStream$).scoped(),
        append$: asFunction(append$).scoped(),
        append: asFunction(({core}) => blocks => core.append(blocks)),
        get: asFunction(({core}) => (index, config) => core.get(index, config)),
        download$: asFunction(download$).scoped(),
        replicate$: asFunction(replicate$).scoped(),
        session: asFunction(session).scoped(),
        snapshot: asFunction(snapshot).scoped(),
        onAppend$: asFunction(onAppend$).scoped(),
        onPeerRemoved$: asFunction(onPeerRemove$).scoped(),
        onPeerAdd$: asFunction(onPeerAdd$).scoped(),
        onClose$: asFunction(onClose$).scoped(),
        findingPeers$: asFunction(findingPeers$).scoped(),
        // todo: next, complete, and error will most likely change
        //       don't depend on it.
        next: asFunction(({core}) => blocks => {
            return core.append(blocks);
        }).scoped(),
        complete: asFunction(({core}) => () => {}).scoped(),
        error: asFunction(({core}) => () => core.close()).scoped(),

        key: asFunction(({core}) => core.key).transient(),
        discoveryKey: asFunction(({core}) => core.discoveryKey).transient(),
        get$: asFunction(get$).scoped(),
        close: asFunction(({core}) => () => core.close()),
        ready: asFunction(({core}) => () => core.ready().then(() => core))
    });
}

export {
    fromReplication,
    fromCore,
    create,
    install
};

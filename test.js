import {test, solo, skip} from "brittle";
import rxjs from "rxjs";
import b4a from "b4a";
import cenc from "compact-encoding";
import rxjsOperators from "rxjs/operators";
import * as Awilix from "awilix";
import Hypercore from "hypercore";
import LocalDrive from "localdrive";
import Corestore from "corestore";
import RAM from "random-access-memory";
import {RxCore, RxCorestore} from "./index.js";

const rx = {...rxjsOperators, ...rxjs};
let corestoreContainer;

const installationConfiguration = {
    dependencies: {
        rxjs: { get() { return rxjs; }},
        ["rxjs/operators"]: { get() { return rxjsOperators }},
        awilix: { get() { return Awilix }},
        hypercore: { get() { return Hypercore; }},
        ["random-access-memory"]: { get() { return RAM; }},
        b4a: { get() { return b4a; }},
        ["compact-encoding"]: { get() { return cenc; }},
        corestore: { get() { return Corestore; }}
    }
}

test("install", async t => {
    corestoreContainer = await RxCorestore.install(installationConfiguration);

    // Create extension to the corestoreContainer
    corestoreContainer.register({
        extension$: Awilix.asFunction(({rx}) => rx.from(["hello", "world"])).scoped()
    });

    const rxCorestore = RxCorestore.create();
    let extensionResult = [];

    rxCorestore.extension$.subscribe(
        (o) => extensionResult.push(o)
    );

    t.alike(extensionResult, ["hello", "world"]);
    const rxCore = rxCorestore.get({name: "power"});
    t.ok(rxCore.isRxCore);
    t.teardown(() => rxCore.close());
});

test("basic tests", async t => {
    const core1 = RxCore.create({valueEncoding: "json"});
    await core1.append("hello");
    t.is(await core1.get(0), "hello");
    t.is(await rx.firstValueFrom(core1.get$(0)), "hello");
    await core1.close();
    await t.exception(() => core1.get(0));
});

test("concat appends, create read stream, and create a session core", t => {
    t.plan(5);
    const core = RxCore.create({valueEncoding: "json"});
    const coreSession = core.session({valueEncoding: "json"});
    rx.concat(
        core.append$(() => rx.of("hello")).pipe(rx.repeat(4)),
        core.append$(() => rx.of("world")).pipe(rx.repeat(4))
    ).subscribe({
        complete() {
            coreSession.createReadStream$().pipe(rx.takeLast(2)).subscribe(
                {
                    next(o) {
                        t.is(o, "world");
                    }
                }
            );
        }
    });

    core.createReadStream$({live: true}).pipe(rx.take(3)).subscribe(
        o => t.is(o, "hello")
    );

    t.teardown(async () => {
        await core.close();
        await coreSession.close();
    });
});

test("merge core appends", t => {
    t.plan(20);
    const core = RxCore.create({valueEncoding: "json"});
    rx.merge(
        core.append$(() => rx.of("hello")).pipe(rx.repeat(4)),
        core.append$(() => rx.of("world")).pipe(rx.repeat(4))
    ).subscribe({
        next(result) {
            t.ok(result.value === "hello" || result.value === "world");
        },
        complete() {
            core.createReadStream$().pipe(rx.take(8)).subscribe(
                o => t.ok(o === "hello" || o === "world")
            );
        }
    });

    core.createReadStream$({live: true}).pipe(rx.take(4)).subscribe(
        o => {
            t.ok(o === "hello" || o === "world");
        }
    );

    t.teardown(async () => {
        await core.close();
    });
});

test("rxCorestore", async t => {
    t.plan(1);
    const corestore = RxCorestore.create();
    const results = [];
    const correctResults = ["sriracha", "louisiana", "spicy", "goldens"].join(",");
    rx.concat(
        corestore.get$({name: "hotsauce", valueEncoding: "json"}),
        corestore.get$({name: "mustard", valueEncoding: "json"})
    ).pipe(
        rx.concatMap(
            (core, i) => {
                return core.append$(i === 0 ? ["sriracha", "louisiana"] : ["spicy", "goldens"])
                    .pipe(
                        rx.map(() => core)
                    );
            }
        ),
        rx.toArray(),
        rx.switchMap(
            ([hot, mustard]) => {
                return rx.concat(
                    hot.get$(0),
                    hot.get$(1),
                    mustard.get$(0),
                    mustard.get$(1)
                )
            }
        )
    ).subscribe(
        {
            async next(o) {
                results.push(o);
            },
            async complete() {
                t.is(results.join(","), correctResults);
            },
            error(e) {
                t.fail();
            }
        }
    );

    t.teardown(() => corestore.close());
});

// The following does not work in browser yet unless utilizing relay.

test("rxCore.replicate$", async (t) => {
    t.plan(5);
    // Can only run install once, so any repeat installs
    // will just return the core container and can extend the functionality if necessary.
    /* const coreContainer = */ await RxCore.install(installationConfiguration);
    const expectations = ["hello", "world", "foo", "bar"];
    const core1 = RxCore.create({valueEncoding: "utf8"});
    await core1.ready();
    const core2 = RxCore.create({valueEncoding: "utf8", key: core1.key});

    core2.replicate$(core1);
    let index = 0;
    core2.createReadStream$({live: true})
        .pipe(
            rx.take(4)
        )
        .subscribe(
            {
                next(value) {
                    t.is(expectations[index++], value);
                },
                complete() {
                    t.pass();
                }
            }
    );

    core1.append$(() => rx.of(...expectations)).subscribe();
    t.teardown(async () => await core1.close() && await core2.close() )
});

test("rxCorestore.replicate$", async (t) => {
    t.plan(5);
    // Can only run install once, so any repeat installs
    // will just return the corestore container and can extend the functionality if necessary.
    /* const coreContainer = */ await RxCorestore.install(installationConfiguration);
    const expectations = ["hello", "world", "foo", "bar"];
    const corestore1 = RxCorestore.create();
    const corestore2 = RxCorestore.create();

    corestore1.replicate$(corestore2);

    const core1 = corestore1.get({name: "a", valueEncoding: "utf8"});
    await core1.ready();
    const core2 = corestore2.get({key: core1.key, valueEncoding: "utf8"});

    let index = 0;
    core2.createReadStream$({live: true})
        .pipe(
            rx.take(4)
        )
        .subscribe(
            {
                next(value) {
                    t.is(expectations[index++], value);
                },
                complete() {
                    t.pass();
                }
            }
        );

    core1.append$(() => rx.of(...expectations)).subscribe();
    t.teardown(async () => await corestore1.close() && await corestore2.close() )
});
# RxHyper

### RxJS wrappers for holepunch tools
#### https://docs.holepunch.to/

Current support status
- [x] Hypercore
- [x] Corestore
- [ ] Hyperbee
- [ ] Hyperdrive
- [ ] Hyperswarm
- [ ] HyperDHT
- [ ] Autobase
- [ ] Protomux
- [ ] SecretStream

Planned to extend
- [ ] RxObjectCore
  - Core that deals with only json objects.
- [ ] RxCascadeCore extends RxObjectCore
  - Take all existing chunk objects and combine them into one object 
  - Options to go top bottom or bottom top

## [API Documentation](https://github.com/zacharygriffee/rx-hyper/blob/master/docs/api.md)

## Installation

> You import your own dependencies. This library is peer-to-peer centric without a server in mind. So the
> downloading and installing of dependencies is up to the developer.

```ecmascript 6
import rxjs from "rxjs";
import b4a from "b4a";
import cenc from "compact-encoding";
import rxjsOperators from "rxjs/operators";
import * as Awilix from "awilix";
import Hypercore from "hypercore";
import Corestore from "corestore";
import RAM from "random-access-memory";

import {RxCore, RxCorestore} from "rx-hyper";
// Install dependencies for the tool you want to use
// If you only use RxCore then just RxCore.install
await RxCorestore.install({
    dependencies: {
        rxjs: { get() { return rxjs; }},
        ["rxjs/operators"]: { get() { return rxjsOperators }},
        awilix: { get() { return Awilix }},
        hypercore: { get() { return Hypercore; }},
        b4a: { get() { return b4a; }},
        ["compact-encoding"]: { get() { return cenc; }},
        // Only needed if you use corestore
        corestore: { get() { return Corestore; }},
        // Optional if you supply storage to each create function.
        ["random-access-memory"]: { get() { return RAM; }, optional: true },
    },
    // Which dependency should be used for default storage.
    // Should be a random-access-storage.
    defaultStorage: "random-access-memory",
    // How to make the file from the default imported dependency
    makeFile: (RAM, buff, config) => new RAM(buff, config)
});
// or let the library download them from CDN
await RxCore.install();
```

## Use

```ecmascript 6
const core$ = RxCore.create({valueEncoding: "json"});
const [core1$, core2$] = RxCore.create(2);
const [core3$, remoteCore$] = RxCore.create([{valueEncoding: "utf8"}, {key: someRemoteCoreKey}]);

const corestore$ = RxCorestore.create();

// The completion of observable does not close the core.
// This isn't very good RxJS but serves as an example of capability.
corestore$
    .get$({name: "someCore", valueEncoding: "utf8"})
    .pipe(rx.switchMap((core) => core.ready$))
    .subscribe(
        async rxCore => {
            rxCore.onAppend$.subscribe(
                () => console.log("Core appended")
            );
            
            rx.concat(
                // Has a factory that passes the dependencies 
                // and other RxCore functions.
                // Expects the function to return an Observable.
                rxCore.append$(({rx}) => {
                    return rx.of("hello", "world")
                }),
                // Or do it classically.
                rxCore.append$(["hello", "world"])
            ).subscribe(
                appendResult => {
                     // Do stuff with result.
                }
            );
        }
    );

```

## Test it

```sh
npm test
```

Distributed under the MIT license. See ``LICENSE`` for more information.


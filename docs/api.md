
# rx-hyper API
> See [docs.holepunch.to](https://docs.holepunch.to/) for thorough documentation of the functions. This documentation 
will address the functions currently supported and what maybe different from the non-rx version that this library wraps. 

<a name="RxHyper"></a>

## RxHyper : <code>object</code>
**Kind**: global namespace  

* [RxHyper](#RxHyper) : <code>object</code>
    * [.configuration](#RxHyper.configuration)
    * [.RxCore](#RxHyper.RxCore) : <code>object</code>
        * [.replicate$()](#RxHyper.RxCore.replicate$)
        * [.findingPeers$()](#RxHyper.RxCore.findingPeers$)
        * [.download$([range])](#RxHyper.RxCore.download$)
        * [.onPeerRemove$()](#RxHyper.RxCore.onPeerRemove$)
        * [.onPeerAdd$()](#RxHyper.RxCore.onPeerAdd$)
        * [.onClose$()](#RxHyper.RxCore.onClose$)
        * [.onAppend$()](#RxHyper.RxCore.onAppend$)
        * [.get$(index, [config])](#RxHyper.RxCore.get$)
        * [.append$([factoryOrValue])](#RxHyper.RxCore.append$)
        * [.ready$()](#RxHyper.RxCore.ready$)
        * [.createReadStream$([config])](#RxHyper.RxCore.createReadStream$)
        * [.createByteStream$([config])](#RxHyper.RxCore.createByteStream$)
        * [.fromReplication(stream$, key, config)](#RxHyper.RxCore.fromReplication)
        * [.fromCore(core)](#RxHyper.RxCore.fromCore)
        * [.create(config)](#RxHyper.RxCore.create)
        * [.install(config)](#RxHyper.RxCore.install)
    * [.RxCorestore](#RxHyper.RxCorestore) : <code>object</code>
        * [.get()](#RxHyper.RxCorestore.get)
        * [.get$(config)](#RxHyper.RxCorestore.get$)
        * [.session(config)](#RxHyper.RxCorestore.session)
        * [.namespace(config)](#RxHyper.RxCorestore.namespace)
        * [.onCoreOpen$()](#RxHyper.RxCorestore.onCoreOpen$)
        * [.onCoreClose$()](#RxHyper.RxCorestore.onCoreClose$)
        * [.replicate$()](#RxHyper.RxCorestore.replicate$)
        * [.findingPeers$()](#RxHyper.RxCorestore.findingPeers$)
        * [.fromCorestore(corestore)](#RxHyper.RxCorestore.fromCorestore)
        * [.create(config)](#RxHyper.RxCorestore.create)
        * [.install(config)](#RxHyper.RxCorestore.install)
    * [.install(config)](#RxHyper.install)

<a name="RxHyper.configuration"></a>

### RxHyper.configuration
Configurations

**Kind**: static property of [<code>RxHyper</code>](#RxHyper)  
**Properties**

| Name | Description |
| --- | --- |
| dependencies | A List of dependencies needed by this library to operate. Dependencies added should have the name used on npm. <pre>     Necessary Dependencies:     rxjs     rxjs/operators     awilix     compact-encoding     b4a     Optional Dependencies:     random-access-memory   // As long as you declare a storage when creating for RxCore and RxCorestore </pre> |
| resolvedDependencies | Dependencies resolved via install. If another library utilizes this configuration interface, you can pass this configuration to that library. |
| defaultStorage | The random access storage dependency to use. IF you use a different random-access-storage, add the dependency to the configuration.dependencies object. |

**Example**  
```js
config = {
    dependencies: {
        ["the-answer"]: {
            async get() {
                return import("https://esm.run/the-answer")
            }
        }
    }
}
```
<a name="RxHyper.RxCore"></a>

### RxHyper.RxCore : <code>object</code>
**Kind**: static namespace of [<code>RxHyper</code>](#RxHyper)  

* [.RxCore](#RxHyper.RxCore) : <code>object</code>
    * [.replicate$()](#RxHyper.RxCore.replicate$)
    * [.findingPeers$()](#RxHyper.RxCore.findingPeers$)
    * [.download$([range])](#RxHyper.RxCore.download$)
    * [.onPeerRemove$()](#RxHyper.RxCore.onPeerRemove$)
    * [.onPeerAdd$()](#RxHyper.RxCore.onPeerAdd$)
    * [.onClose$()](#RxHyper.RxCore.onClose$)
    * [.onAppend$()](#RxHyper.RxCore.onAppend$)
    * [.get$(index, [config])](#RxHyper.RxCore.get$)
    * [.append$([factoryOrValue])](#RxHyper.RxCore.append$)
    * [.ready$()](#RxHyper.RxCore.ready$)
    * [.createReadStream$([config])](#RxHyper.RxCore.createReadStream$)
    * [.createByteStream$([config])](#RxHyper.RxCore.createByteStream$)
    * [.fromReplication(stream$, key, config)](#RxHyper.RxCore.fromReplication)
    * [.fromCore(core)](#RxHyper.RxCore.fromCore)
    * [.create(config)](#RxHyper.RxCore.create)
    * [.install(config)](#RxHyper.RxCore.install)

<a name="RxHyper.RxCore.replicate$"></a>

#### RxCore.replicate$()
Experimental.

** Backpressure is not handled at the moment.
** Not yet supported in browser unless you utilize a relayed socket.

Replicate cores over rxjs streams.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  
**Example**  
```js
const core1 = RxCore.create();
await core1.ready();
const core2 = RxCore.create({key: core1.key});

// Ensure that the 'initiator/client' is the one calling replicate$
core2.replicate$(core1);
// This is same as above.
core2.replicate$(core1.replicate$());
// You can use a plain core as well
core2.replicate$(core1.core.replicate(false));
```
<a name="RxHyper.RxCore.findingPeers$"></a>

#### RxCore.findingPeers$()
Create a findingPeers observable. Automatically puts a 6-second timer. You can add your own factory to
have your own conditions as to when the findingPeers is over. The `doneFactory` has the RxCore's container, so you
can access any of the dependencies including rxjs.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  
**Example**  
```js
findingPeers$({rx}) => {
    // 10 seconds instead of 6
    return rx.timer(10000);
}).subscribe();
```
<a name="RxHyper.RxCore.download$"></a>

#### RxCore.download$([range])
Download range of blocks from remote core.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  

| Param | Description |
| --- | --- |
| [range] | range.start range.end |

<a name="RxHyper.RxCore.onPeerRemove$"></a>

#### RxCore.onPeerRemove$()
Observable for the 'peer-remove' event

Difference is, it emits the core that caused the event.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  
<a name="RxHyper.RxCore.onPeerAdd$"></a>

#### RxCore.onPeerAdd$()
Observable for the 'peer-add' event

Difference is, it emits the core that caused the event.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  
<a name="RxHyper.RxCore.onClose$"></a>

#### RxCore.onClose$()
Observable for the 'close' event

Difference is, it emits the core that caused the event.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  
<a name="RxHyper.RxCore.onAppend$"></a>

#### RxCore.onAppend$()
Observable for the 'append' event.

Difference is, it emits the core that caused the event.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  
<a name="RxHyper.RxCore.get$"></a>

#### RxCore.get$(index, [config])
Get a block of the core.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  

| Param | Description |
| --- | --- |
| index | the block number to get. |
| [config] | The config to pass to the core.get handler |

<a name="RxHyper.RxCore.append$"></a>

#### RxCore.append$([factoryOrValue])
An append InputObservable.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  

| Param | Description |
| --- | --- |
| [factoryOrValue] | see example. |

**Example**  
```js
// Appends hello and world blocks to the core.
append$(({rx}) => rx.of("hello", "world")).subscribe();
// You can also just use a value
append$(["hello", "world"]).subscribe();
```
<a name="RxHyper.RxCore.ready$"></a>

#### RxCore.ready$()
Emits when the core is ready. Most of the RxCore functions wait for the core to be ready
before executing. Just like the plain hypercore, id, key, discoverykey, and other properties won't be availabe
untill after the core is ready.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  
**Example**  
```js
ready$.subscribe((core) => {
    // do stuff with the readied core.
})
```
<a name="RxHyper.RxCore.createReadStream$"></a>

#### RxCore.createReadStream$([config])
Create a read stream of the core.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  

| Param | Description |
| --- | --- |
| [config] | see hypercore createReadStream for configuration. |

<a name="RxHyper.RxCore.createByteStream$"></a>

#### RxCore.createByteStream$([config])
Create a byte read stream of the core.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  

| Param | Description |
| --- | --- |
| [config] | see hypercore createReadStream for configuration. |

<a name="RxHyper.RxCore.fromReplication"></a>

#### RxCore.fromReplication(stream$, key, config)
Create a core from a replication stream.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  

| Param | Description |
| --- | --- |
| stream$ | A stream, rxCore, or plain hypercore. |
| key | The key of the hypercore for replication. Unnecessary if stream$ is a rxCore or hypercore. |
| config | If a new hypercore is constructed from this, these configurations are passed to that new hypercore. |

<a name="RxHyper.RxCore.fromCore"></a>

#### RxCore.fromCore(core)
Make an existing hypercore into a RxCore.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  

| Param | Type | Description |
| --- | --- | --- |
| core | <code>Hypercore</code> | A hypercore |

<a name="RxHyper.RxCore.create"></a>

#### RxCore.create(config)
Create an RxCore.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  

| Param | Description |
| --- | --- |
| config | Configuration passed to the hypercore. |

<a name="RxHyper.RxCore.install"></a>

#### RxCore.install(config)
Install dependencies for the operation of an RxCore.

Since my libraries are peer-to-peer centric, the dependency responsibility should be on the client instead of
the server, because there is no server in p2p.

**Kind**: static method of [<code>RxCore</code>](#RxHyper.RxCore)  

| Param | Description |
| --- | --- |
| config | Any modifications to the default configuration |

**Example**  
```js
// You got the hypercore imported already.
import Hypercore from "hypercore";
await install({
    dependencies: {
        hypercore: {
             // Get can be async
             get() {
                 return Hypercore
             }
        }
    }
}
```
<a name="RxHyper.RxCorestore"></a>

### RxHyper.RxCorestore : <code>object</code>
**Kind**: static namespace of [<code>RxHyper</code>](#RxHyper)  

* [.RxCorestore](#RxHyper.RxCorestore) : <code>object</code>
    * [.get()](#RxHyper.RxCorestore.get)
    * [.get$(config)](#RxHyper.RxCorestore.get$)
    * [.session(config)](#RxHyper.RxCorestore.session)
    * [.namespace(config)](#RxHyper.RxCorestore.namespace)
    * [.onCoreOpen$()](#RxHyper.RxCorestore.onCoreOpen$)
    * [.onCoreClose$()](#RxHyper.RxCorestore.onCoreClose$)
    * [.replicate$()](#RxHyper.RxCorestore.replicate$)
    * [.findingPeers$()](#RxHyper.RxCorestore.findingPeers$)
    * [.fromCorestore(corestore)](#RxHyper.RxCorestore.fromCorestore)
    * [.create(config)](#RxHyper.RxCorestore.create)
    * [.install(config)](#RxHyper.RxCorestore.install)

<a name="RxHyper.RxCorestore.get"></a>

#### RxCorestore.get()
Convenience sync method of RxCorestore.get$

**Kind**: static method of [<code>RxCorestore</code>](#RxHyper.RxCorestore)  
<a name="RxHyper.RxCorestore.get$"></a>

#### RxCorestore.get$(config)
Get a RxCore from the RxCorestore.

**Kind**: static method of [<code>RxCorestore</code>](#RxHyper.RxCorestore)  

| Param | Description |
| --- | --- |
| config | Configuration to pass to the underlying corestore.get function |

<a name="RxHyper.RxCorestore.session"></a>

#### RxCorestore.session(config)
Get a session RxCorestore from the underlying RxCorestore.

**Kind**: static method of [<code>RxCorestore</code>](#RxHyper.RxCorestore)  

| Param | Description |
| --- | --- |
| config | Configuration to pass to the session |

<a name="RxHyper.RxCorestore.namespace"></a>

#### RxCorestore.namespace(config)
Get a namepsaced RxCorestore from the underlying RxCorestore.

**Kind**: static method of [<code>RxCorestore</code>](#RxHyper.RxCorestore)  

| Param | Description |
| --- | --- |
| config | Configuration to pass to the namespaced corestore |

<a name="RxHyper.RxCorestore.onCoreOpen$"></a>

#### RxCorestore.onCoreOpen$()
An Observable for the 'core-open' event.

**Kind**: static method of [<code>RxCorestore</code>](#RxHyper.RxCorestore)  
<a name="RxHyper.RxCorestore.onCoreClose$"></a>

#### RxCorestore.onCoreClose$()
An Observable for the 'core-close' event.

**Kind**: static method of [<code>RxCorestore</code>](#RxHyper.RxCorestore)  
<a name="RxHyper.RxCorestore.replicate$"></a>

#### RxCorestore.replicate$()
Experimental.

** Backpressure is not handled at the moment.
** Not yet supported in browser unless you utilize a relayed transport socket.

Replicate corestore over rxjs streams.

**Kind**: static method of [<code>RxCorestore</code>](#RxHyper.RxCorestore)  
**Example**  
```js
const corestore1 = corestore1.create();
const corestore2 = corestore2.create();

// Ensure that the 'initiator/client' is the one calling replicate$
corestore1.replicate$(corestore2);
// This is same as above.
corestore2.replicate$(corestore1.replicate$());
```
<a name="RxHyper.RxCorestore.findingPeers$"></a>

#### RxCorestore.findingPeers$()
Create a findingPeers observable. Automatically puts a 6-second timer. You can add your own factory to
have your own conditions as to when the findingPeers is over. The `doneFactory` has the RxCorestore's container, so you
can access any of the dependencies including rxjs.

**Kind**: static method of [<code>RxCorestore</code>](#RxHyper.RxCorestore)  
**Example**  
```js
findingPeers$({rx}) => {
    // 10 seconds instead of 6
    return rx.timer(10000);
}).subscribe();
```
<a name="RxHyper.RxCorestore.fromCorestore"></a>

#### RxCorestore.fromCorestore(corestore)
Create an RxCorestore from an existing plain corestore.

**Kind**: static method of [<code>RxCorestore</code>](#RxHyper.RxCorestore)  

| Param | Description |
| --- | --- |
| corestore | corestore to wrap |

<a name="RxHyper.RxCorestore.create"></a>

#### RxCorestore.create(config)
Create a new RxCorestore.

**Kind**: static method of [<code>RxCorestore</code>](#RxHyper.RxCorestore)  

| Param | Description |
| --- | --- |
| config | Configuration the corestore will use. |

<a name="RxHyper.RxCorestore.install"></a>

#### RxCorestore.install(config)
Install dependencies necessary for RxCorestore operation.

Since my libraries are peer-to-peer centric, the dependency responsibility should be on the client instead of
the server, because there is no server in p2p.

**Kind**: static method of [<code>RxCorestore</code>](#RxHyper.RxCorestore)  

| Param | Description |
| --- | --- |
| config | Modifications to the default configuration. |

**Example**  
```js
// You got the corestore imported already.
import Corestore from "corestore";
await install({
    dependencies: {
        corestore: {
             // Get can be async
             get() {
                 return Corestore
             }
        }
    }
}
```
<a name="RxHyper.install"></a>

### RxHyper.install(config)
Install necessary dependencies to operate the base level RxHyper functions. This is automatically called
by higher level installs like RxCore.install()

**Kind**: static method of [<code>RxHyper</code>](#RxHyper)  

| Param | Description |
| --- | --- |
| config | Modifications to the default configuration. |


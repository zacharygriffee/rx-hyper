export function takeSync(rx) {
    return (source) => new rx.Observable((subscriber) => {
        const subscription = source.subscribe(subscriber);
        subscriber.complete();
        return subscription;
    });
}
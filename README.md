# streaming-json-stringifier

If you have to JSON-stringify large things, it can block the event loop in
NodeJS. This package allows you to circumvent that by turning `stringify`
into a generator where you can pause computation as desired. This was a POC.

In terms of perf, it is significantly slower than the built-in stringify,
so only use this if event-loop blocking is a real problem.

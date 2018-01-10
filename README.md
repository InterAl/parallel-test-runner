# parallel-test-runner

### Run your Mocha tests faster

parallel-test-runner is a parallel test runner for Mocha.
It runs your test files on several node processes, and does not require making any changes to your existing tests.
I was able to obtain a 2-3x speed increase in running time for my existing projects by using this package, which is pretty cool.

### Installation
```bash
$ npm i -S parallel-test-runner
```

### Usage

Create a new runner file:

parallelTestRunner.js:

```javascript
#!/usr/bin/env node

const {runner} = require('parallel-test-runner');
const path = require('path');

runner()
    .config({
        pattern: 'test/**/*.test.js', //mandatory
        shuffleFiles: false, //optional
        slowTestPatterns: ['SlowTestFilePattern.js'], //optional
        requireFiles: [path.resolve(__dirname, '../test/setup.js')], //optional
        parallelFactor: 4 //The number of processes the test runner will spawn
    })
    .run()
    .then(() => {
        process.exit(0);
    })
    .catch(() => {
        process.exit(1);
    });
```

Now you can simply execute ./parallelTestRunner.js to run your tests.

I might add a CLI support in the future.

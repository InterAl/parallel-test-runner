const runner = require('../src/runner2');
const path = require('path');

runner()
    .config({
        pattern: 'test/**/*.gg.js',
        shuffleFiles: false,
        slowTestPatterns: ['slowTest.gg.js'],
        processName: path.resolve(__dirname, '../node_modules/mocha/bin/mocha'),
        runnerArgs: files => [
            '-R', 'json-stream'
        ]
    })
    .run()
    .then(() => {
        process.exit();
    })

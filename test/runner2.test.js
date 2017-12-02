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
        ],
        requireFiles: [path.resolve(__dirname, './lala.js')]
    })
    .run()
    .then(() => {
        process.exit();
    })

const {runner2} = require('../src/index.js');
const path = require('path');

runner2()
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

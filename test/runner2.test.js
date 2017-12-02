const {runner2} = require('../src/index.js');
const path = require('path');

runner2()
    .config({
        debug: true,
        pattern: 'test/**/*.gg.js',
        shuffleFiles: false,
        slowTestPatterns: ['slowTest.gg.js'],
        requireFiles: [path.resolve(__dirname, './lala.js')]
    })
    .run()
    .then(() => {
        process.exit();
    })

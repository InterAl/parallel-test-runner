const path = require('path');
const sinon = require('sinon');
const createRunner = require('../src/runner');

const red = '\x1b[31m', green = '\x1b[32m', cyan = '\x1b[36m', reset = '\x1b[0m';

describe('runner', () => {
    let logSpy;

    it('report failures', () => {
        return run().then(() => {
            sinon.assert.calledWith(logSpy, red, 'failures:', 2);
        });
    });

    it('report passes', () => {
        return run().then(() => {
            sinon.assert.calledWith(logSpy, green, 'passes:', 4);
        });
    });

    it('report pendings', () => {
        return run().then(() => {
            sinon.assert.calledWith(logSpy, cyan, 'pending:', 1);
        });
    });

    function run() {
        setup();

        return createRunner()
            .config({
                pattern: 'test/**/*.gg.js',
                shuffleFiles: false,
                slowTestPatterns: ['slowTest.gg.js'],
                processName: path.resolve(__dirname, '../node_modules/mocha/bin/mocha'),
                getSpawnArgs: files => [
                    '-R', 'json-stream',
                    ...files.map(f => path.resolve(__dirname, '../') + '/' + f)
                ]
            })
            .run();
    }

    function setup() {
        logSpy = sinon.spy();
        const log = console.log;
        console.log = (...args) => {
            logSpy(...args);
            log(...args);
        };
    }
});

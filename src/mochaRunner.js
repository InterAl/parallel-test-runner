const Mocha = require('mocha');
const serializeError = require('serialize-error');
const parentProcessApi = require('./parentProcessApi');

console.log('i am alive');

parentProcessApi.listenTo('runFile', runFile);

parentProcessApi.onReady();

function runFile({filename, messageTimestamp}) {
    try {
        const start = new Date();
        console.log('job run delay', start - new Date(messageTimestamp));

        const mocha = new Mocha();

        mocha.addFile(
            filename
        );

        console.log('running mocha on', filename);

        const startTime = new Date();

        const runner = mocha.run(exitCode => {
            const duration = new Date() - startTime;
            const stats = typeof runner === 'undefined' ? {} : runner.stats;
            parentProcessApi.onSuiteDone(filename, filename, duration, exitCode, stats);
        });

        runner.on('fail', (test, err) => {
            parentProcessApi.onTestDone(filename, test.title, false, serializeError(err));
        });

        runner.on('pass', test => {
            parentProcessApi.onTestDone(filename, test.title, true);
        });
    } catch (err) {
        parentProcessApi.onSuiteDone(filename, filename, null, 1, {});
    }
}

process.on('uncaughtException', parentProcessApi.onUncaughtException);

const Mocha = require('mocha');
const serializeError = require('serialize-error');

console.log('i am alive');

process.send({
    type: 'ready'
});

process.on('message', handleMessage);

function handleMessage(m) {
    switch (m.type) {
        case 'runFile':
            runFile(m);
            break;
    }
}

function runFile({filename}) {
    const mocha = new Mocha();

    mocha.addFile(
        filename
    );

    console.log('running mocha on', filename);

    const startTime = new Date();

    const runner = mocha.run(exitCode => {
        const duration = new Date() - startTime;
        onSuiteDone(filename, filename, duration, exitCode, runner.stats);
    });

    runner.on('fail', (test, err) => {
        onTestDone(filename, test.title, false, err);
    });

    runner.on('pass', test => {
        onTestDone(filename, test.title, true);
    });
}

function onTestDone(filename, title, pass, error) {
    process.send({
        type: 'testDone',
        filename,
        title,
        passed: pass,
        failed: !pass,
        error
    });
}

function onSuiteDone(filename, title, duration, exitCode, stats) {
    process.send({
        type: 'suiteDone',
        filename,
        title,
        duration,
        passed: exitCode === 0,
        stats
    });
}

function onUncaughtException(err) {
    process.send({
        type: 'uncaughtException',
        error: serializeError(err)
    });
}

process.on('uncaughtException', onUncaughtException);

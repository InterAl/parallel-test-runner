exports.onReady = function() {
    process.send({
        type: 'ready'
    });
};

exports.onTestDone = function(filename, title, pass, error) {
    process.send({
        type: 'testDone',
        filename,
        title,
        passed: pass,
        failed: !pass,
        error
    });
};

exports.onSuiteDone = function(filename, title, duration, exitCode, stats) {
    process.send({
        type: 'suiteDone',
        filename,
        title,
        duration,
        passed: exitCode === 0,
        stats
    });
};

exports.onUncaughtException = function(err) {
    process.send({
        type: 'uncaughtException',
        error: serializeError(err)
    });
};

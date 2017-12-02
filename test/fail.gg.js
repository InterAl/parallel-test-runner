const {assert} = require('chai');

describe('fail', () => {
    it('fail', () => {
        assert.equal(0, 1);
    });
    it('fail22', () => {
        assert.equal(2, 3);
    });
    it('pass33', () => {
        assert.equal(2, 2);
    });
});

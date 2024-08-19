const { chai } = require("./test-helpers/test-helper");

describe("Basic Test", function() {
  let expect;

  before(async function() {
    expect = (await chai()).expect;
  });

  it("should pass", function(done) {
    expect(true).to.be.true;
    done();
  });
});


var sayHello = require('../src/hello');

describe('Test for hello', function() {
  it('should be hello world', function() {
    (sayHello('world')).should.eql('Hello, world!');
  });
});

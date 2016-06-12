'use strict';

var sinon = require('sinon');
var _ = require('lodash');
var $ = require('jquery');

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('$interpolate', function () {
  
  beforeEach(function () {
    delete window.angular;
    publishExternalAPI();
  });

  it('should exist', function () {
    var injector = createInjector(['ng']);
    injector.has('$interpolate').should.be.true();
  });

  it('produces an identity function for static content', function () {
    var injector = createInjector(['ng']);
    var $interpolate = injector.get('$interpolate');

    var interp = $interpolate('hello');
    interp.should.be.Function();
    interp().should.eql('hello');
  });

  it('evaluates a single expression', function () {
    var injector = createInjector(['ng']);
    var $interpolate = injector.get('$interpolate');

    var interp = $interpolate('{{anAttr}}');
    interp({anAttr: '42'}).should.eql('42');
  });

  it('evaluates many expressions', function () {
    var injector = createInjector(['ng']);
    var $interpolate = injector.get('$interpolate');

    var interp = $interpolate('{{anAttr}}, then {{anotherAttr}}!');
    interp({anAttr: '42', anotherAttr: 43}).should.eql('42, then 43!');
  });

  it('passes through ill-defined interpolations', function () {
    var injector = createInjector(['ng']);
    var $interpolate = injector.get('$interpolate');

    var interp = $interpolate('why u no }}work{{');
    interp({}).should.eql('why u no }}work{{');
  });

  it('turns nulls into empty strings', function () {
    var injector = createInjector(['ng']);
    var $interpolate = injector.get('$interpolate');

    var interp = $interpolate('{{aNull}}');
    interp({aNull: null}).should.eql('');
  });

  it('turns undefineds into empty strings', function () {
    var injector = createInjector(['ng']);
    var $interpolate = injector.get('$interpolate');

    var interp = $interpolate('{{anUndefined}}');
    interp({anUndefined: undefined}).should.eql('');
  });

  it('turns numbers into strings', function () {
    var injector = createInjector(['ng']);
    var $interpolate = injector.get('$interpolate');

    var interp = $interpolate('{{aNumber}}');
    interp({aNumber: 42}).should.eql('42');
  });

  it('turns booleans into strings', function () {
    var injector = createInjector(['ng']);
    var $interpolate = injector.get('$interpolate');

    var interp = $interpolate('{{aBoolean}}');
    interp({aBoolean: true}).should.eql('true');
  });

  it('turns arrays into JSON strings', function () {
    var injector = createInjector(['ng']);
    var $interpolate = injector.get('$interpolate');

    var interp = $interpolate('{{anArray}}');
    interp({anArray: [1, 2, [3]]}).should.eql('[1,2,[3]]');
  });

  it('turns objects into JSON strings', function () {
    var injector = createInjector(['ng']);
    var $interpolate = injector.get('$interpolate');

    var interp = $interpolate('{{anObject}}');
    interp({anObject: {a: 1, b: '2'}}).should.eql('{"a":1,"b":"2"}');
  });
});

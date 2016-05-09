'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var hashKey = require('../src/hash_map').hashKey;

describe('hash', function () {
  
  describe('hashKey', function () {
    
    it('is undefined:undefined for undefined', function() {
      hashKey(undefined).should.eql('undefined:undefined');
    });
    
        
    it('is object:null for null', function() {
      hashKey(null).should.eql('object:null');
    });

    it('is boolean:true for true', function() {
      hashKey(true).should.eql('boolean:true');
    });
    

    it('is boolean:false for false', function() {
      hashKey(false).should.eql('boolean:false');
    });
    

    it('is number:42 for 42', function() {
      hashKey(42).should.eql('number:42');
    });
        
    it('is string:42 for "42"', function() {
      hashKey('42').should.eql('string:42');
    });
    
    it('is object:[unique id] for objects', function () {
      hashKey({}).should.match(/^object:\S+$/);
    });
    
    it('is the same key when asked for the same object many times.', function () {
      var object = {};
      hashKey(object).should.eql(hashKey(object));
    });
    
    it('does not change when object value changes.', function () {
      var object = {a: 42};
      var hash1 = hashKey(object);
      object.a = 43;
      var hash2 = hashKey(object);
      hash1.should.eql(hash2);
    });
    
    it('is not the same for different objects even with the same value.', function () {
      var obj1 = {a: 42};
      var obj2 = {a: 42};
      hashKey(obj1).should.not.eql(hashKey(obj2));
    });
    
    it('is function:[unique id] fro functions', function () {
      var fn = function (a) { return a; }
      hashKey(fn).should.match(/^function:\S+/);
    });
    
    it('is the same key when asked for the same function many times', function () {
      var fn = function () {};
      hashKey(fn).should.eql(hashKey(fn));
    });
    
    it('is not the same for different identical functions', function () {
      var fn1 = function() {return 42;}
      var fn2 = function() {return 42;}
      hashKey(fn1).should.not.eql(hashKey(fn2));
    });
    
    it('stores the hash key in the $$hashKey attribute', function () {
      var obj = {a: 42};
      var hash = hashKey(obj);
      obj.$$hashKey.should.eql(hash.match(/^object:(\S+)$/)[1]); // index 1. capture value.
    });
    
    it('uses preassigned $$hashKey', function() {
      hashKey({$$hashKey: 42}).should.eql('object:42');
    });
    
    it('supports a function $$hashKey', function () {
      hashKey({$$hashKey: _.constant(42)}).should.eql('object:42');
    });
    
    it('calls the function $$hashKey as a method with the correct this.', function () {
      
    });
        
  });
  
  
  
});
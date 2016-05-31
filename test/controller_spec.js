'use strict';

var sinon = require('sinon');
var _ = require('lodash');

var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('$controller', function () {

  beforeEach(function () {
    delete window.angular;
    publishExternalAPI();
  });

  it('instantiates controller functions', function () {
    var injector = createInjector(['ng']);
    var $controller = injector.get('$controller');

    function MyController() {
      this.invoked = true;
    }

    var controller = $controller(MyController);

    controller.should.be.Object();
    controller.should.be.instanceOf(MyController);
  });

  it('injects dependencies to controller functions', function () {
    var injector = createInjector(['ng', function ($provide) {
      $provide.constant('aDep', 42);
    }]);
    var $controller = injector.get('$controller');

    function MyController(aDep) {
      this.theDep = aDep;
    }

    var controller = $controller(MyController);
    controller.theDep.should.eql(42);
  });

  it('allows injecting locals to controller functions', function () {
    var injector = createInjector(['ng']);
    var $controller = injector.get('$controller');

    function MyController(aDep) {
      this.theDep = aDep;
    }

    var controller = $controller(MyController, {aDep: 42});
    controller.theDep.should.eql(42);
  });

  it('allows registering controllers at config time', function () {
    function MyController() {

    }
    var injector = createInjector(['ng', function ($controllerProvider) {
      $controllerProvider.register('MyController', MyController);
    }]);

    var $controller = injector.get('$controller');

    var controller = $controller('MyController');
    controller.should.be.Object();
    controller.should.be.instanceOf(MyController);
  });

  it('allows registring several controllers in an object', function () {
    function MyController() {
    }
    function MyOtherController() {
    }
    var injector = createInjector(['ng', function ($controllerProvider) {
      $controllerProvider.register({
        MyController: MyController,
        MyOtherController: MyOtherController
      });
    }]);

    var $controller = injector.get('$controller');

    var controller = $controller('MyController');
    var otherController = $controller('MyOtherController');

    controller.should.be.instanceOf(MyController);
    otherController.should.be.instanceOf(MyOtherController);
  });

  it('allows registering controllers through modules', function () {
    var module = window.angular.module('myModule', []);
    module.controller('MyController', function MyController() { });
    var injector = createInjector(['ng', 'myModule']);

    var $controller = injector.get('$controller');
    var controller = $controller('MyController');
    controller.should.be.Object();
  });

  it('does not normally look controllers up from window', function () {
    window.MyController = function MyController() { };
    var injector = createInjector(['ng']);
    var $controller = injector.get('$controller');

    (function () {
      $controller('MyController');
    }).should.throw();
  });

  it('looks up controllers from window when so configured', function () {
    window.MyController = function MyController() { };
    var injector = createInjector(['ng', function ($controllerProvider) {
      $controllerProvider.allowGlobals();
    }]);

    var $controller = injector.get('$controller');
    var controller = $controller('MyController');
    controller.should.be.Object();
    controller.should.be.instanceOf(window.MyController);
  });

});

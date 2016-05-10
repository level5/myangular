'use stict';

var _ = require('lodash');

function $FilterProvider($provide) {
  
  this.register = function register(name, factory) {
    if (_.isObject(name)) {
      return _.map(name, function(factory, name) {
        return this.register(name, factory);
      }.bind(this));
    } else {
      return $provide.factory(name + 'Filter', factory);
    }
  };

  this.$get = ['$injector', function($injector) {
    return function filter(name) {
      return $injector.get(name + 'Filter');
    };
  }];

  this.register('filter', require('./filter_filter'));
}
$FilterProvider.$inject = ['$provide'];

module.exports = $FilterProvider;

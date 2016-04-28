'use strict';

var _ = require('lodash');

function filterFilter() {
  return function(array, filterExpr) {
    var predicateFn;
    if (_.isFunction(filterExpr)) {
      predicateFn = filterExpr;
    } else if (_.isString(filterExpr)) {
      predicateFn = createPredicateFn(filterExpr);
    } else {
      return array;
    }
    return _.filter(array, predicateFn);
  };
}

function createPredicateFn(expression) {
  return function (item) {
    console.log(item, expression);
    return item.indexOf(expression) >= 0; 
  }
}

module.exports = filterFilter;
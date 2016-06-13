'use strict';

var ngClickDirective = function () {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      element.on('click', function (evt) {
        scope.$eval(attrs.ngClick, {$event: evt});
        scope.$apply();
      });
    }
  };
};
module.exports = ngClickDirective;

'use strict';

var _ = require('lodash');

function $HttpProvider() {

  var defaults = this.defaults = {
    headers: {
      common: {
        Accept: 'application/json, text/plain, */*'
      },
      post: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      put: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      patch: {
        'Content-Type': 'application/json;charset=utf-8'
      }
    }
  };

  this.$get = [
    '$httpBackend',
    '$q',
    '$rootScope',
    function ($httpBackend, $q, $rootScope) {
      function $http(requestConfig) {
        var deferred = $q.defer();

        var config = _.extend({
          method: 'GET'
        }, requestConfig);
        config.headers = mergeHeaders(requestConfig);

        if(_.isUndefined(config.withCredentials) &&
            !_.isUndefined(defaults.withCredentials)) {
          config.withCredentials = defaults.withCredentials;
        }

        var reqData = transformData(config.data, config.transformRequest);

        if (_.isUndefined(reqData)) {
          _.forEach(config.headers, function(v, k) {
            if (k.toLowerCase() === 'content-type') {
              delete config.headers[k];
            }
          });
        }

        function transformData(data, transform) {
          if (_.isFunction(transform)) {
            return transform(data)
          } else {
            return _.reduce(transform, function(data, fn) {
              return fn(data);
            }, data);
          }
        }

        function done(status, response, headersString, statusText) {
          status = Math.max(status, 0);
          deferred[isSuccess(status) ? 'resolve': 'reject']({
            status: status,
            data: response,
            statusText: statusText,
            headers: headersGetter(headersString),
            config: config
          });
          if(!$rootScope.$$phase) {
            $rootScope.$apply();
          }
        }

        function headersGetter(headers) {
          var headersObj;
          return function (name) {
            headersObj = headersObj || parseHeaders(headers);
            if (name) {
              return headersObj[name.toLowerCase()];
            } else {
              return headersObj;
            }
          };

          function parseHeaders(headers) {
            var lines = headers.split('\n');
            return _.transform(lines, function(result, line) {
              var separatorAt = line.indexOf(':');
              var name =
                _.trim(line.substr(0, separatorAt)).toLowerCase();
              var value =
                _.trim(line.substr(separatorAt + 1));
              if (name) {
                result[name] = value;
              }
            }, {});
          }
        }

        function isSuccess(status) {
          return status >= 200 && status < 300;
        }

        function mergeHeaders(config) {
          var reqHeaders = _.extend({}, config.headers);
          var defHeaders = _.extend(
            {},
            defaults.headers.common,
            defaults.headers[(config.method || 'get').toLowerCase()]
          );

          _.forEach(defHeaders, function (value, key) {
            var headerExists = _.some(reqHeaders, function(v, k) {
              return k.toLowerCase() === key.toLowerCase();
            });
            if (!headerExists) {
              reqHeaders[key] = value;
            }
          });

          return executeHeadeFns(reqHeaders, config);
        }

        function executeHeadeFns(headers, config) {
          return _.transform(headers, function(result, v, k) {
            if (_.isFunction(v)) {
              v = v(config);
              if (_.isNull(v) || _.isUndefined(v)) {
                delete result[k];
              } else {
                result[k] = v;
              }
            }
          }, headers);
        }

        $httpBackend(
          config.method,
          config.url,
          reqData,
          done,
          config.headers,
          config.withCredentials
        );
        return deferred.promise;
      }
      $http.defaults = defaults
      return $http;
  }];
}

module.exports = $HttpProvider;

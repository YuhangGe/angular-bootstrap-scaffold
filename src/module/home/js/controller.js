import app from 'app';
import { v, xxxx } from '../../../service/n';
import { v as v2 } from '../../../service/n2';

class A {
  constructor() {
    console.log('xxx');
  }
}

app.controller('HomeCtrl', [
  '$scope',
  '$timeout',
  function($scope, $timeout) {
    $scope.nn = v();
    var a = new A();
    xxxx();
    function loop() {
      $scope.nn = v2();
      $timeout(loop, 1500);
    }
    loop();
  }
]);

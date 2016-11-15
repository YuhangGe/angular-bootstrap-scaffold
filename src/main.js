import app from 'app';
/**
 * 任何 directives, filters 都需要创建者在此处声明引用。因为使用者在 html 中使用它们时，
 * 很容易遗漏，因此需要创建者负责在此处声明。
 */



// 不需要在 main.js 里面引入所有的 controller, 和 directives/filters 不同，
// controller 的引入原则是，在用到的模块的最顶部自己 import 。因为使用者一定是要
// 显示地声明要使用的 controller，他有能力手动引入自己需要用的 controller
import './module/home/js/controller';
import _h_tpl from './module/home/index.html';

app.config(['$stateProvider', function($stateProvider) {
  $stateProvider.state({
    name: 'default',
    url: '',
    template: _h_tpl,
    controller: 'HomeCtrl'
  }).state({
    name: 'home',
    url: '/',
    template: _h_tpl,
    controller: 'HomeCtrl'
  })
}]).run([function() {
  console.log('running');
}]);
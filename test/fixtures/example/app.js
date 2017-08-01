'use strict';

module.exports = app => {
  console.log('### app.js')
  app.messenger.on('egg-ready', () => {
    console.log('### egg-ready send to parent');
    // 发送给 parent
    process.send({
      action: 'app2parent',
      data: 'app -> parent',
      to: 'parent',
    });
  });

  app.messenger.on('parent2app', msg => console.log('### got parent2app', msg));
};

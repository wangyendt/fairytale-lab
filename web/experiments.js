/* Extension point: add a local entry page and register it here to grow the lab.
   Experiments own their interaction/model, while the catalog links their pages. */
window.EXPERIMENT_CATALOG = Object.freeze([
  Object.freeze({
    id: 'mouse-strongman',
    title: '鼠国大力士',
    subtitle: '杠杆与定滑轮 · 可自由组装',
    entry: 'mouse.html',
    theme: 'mechanics',
    principles: ['杠杆', '定滑轮']
  }),
  Object.freeze({
    id: 'hand-shadow',
    title: '光与小手的影子',
    subtitle: '移动光源与手 · 3D 手影观察',
    entry: 'shadow.html',
    theme: 'light',
    principles: ['光沿直线传播', '点光源投影']
  }),
  Object.freeze({
    id: 'cosmic-voyage',
    title: '从街角到黑洞',
    subtitle: '连续尺度远航 · 黑洞拖拽互动',
    entry: 'cosmos.html',
    theme: 'cosmos',
    principles: ['宇宙尺度', '轨道运动', '引力与黑洞']
  })
]);

/* Playwright browser-tool integration check. Execute as a function with a Page.
   Start a static server for web/, then pass its page at index.html to this check. */
async (page) => {
  await page.bringToFront();
  await page.locator('[data-open-experiment=hand-shadow]').click();
  const f=page.frameLocator('#experimentFrame');
  await f.locator('#renderStatus').waitFor({state:'hidden'});
  const snapshot=()=>page.locator('#experimentFrame').evaluate(el=>el.contentWindow.ShadowLab.snapshot());
  const checks=[];
  await f.locator('#resetExperiment').click();const baseline=await snapshot();
  await f.locator('[data-preset=near-light]').click();const close=await snapshot();
  await f.locator('#captureBtn').click();
  await f.locator('[data-preset=near-ground]').click();const low=await snapshot();
  if(!(close.metrics.magnification>baseline.metrics.magnification&&baseline.metrics.magnification>low.metrics.magnification))throw Error('Projection scaling failed');
  if(low.reference?.hand.y!==close.hand.y)throw Error('Reference did not stay fixed');
  checks.push({name:'projection-and-reference',baseline:baseline.metrics.magnification,near:close.metrics.magnification,low:low.metrics.magnification});
  await f.locator('#resetExperiment').click();
  const offset=await page.locator('#experimentFrame').boundingBox();
  for(const kind of ['hand','light']){
    const before=await snapshot(),p=await page.locator('#experimentFrame').evaluate((el,k)=>el.contentWindow.ShadowLab.screenPoint(k),kind);
    await page.mouse.move(offset.x+p.x,offset.y+p.y);await page.mouse.down();await page.mouse.move(offset.x+p.x+50,offset.y+p.y+12,{steps:10});await page.mouse.up();
    const after=await snapshot();if(Math.hypot(before[kind].x-after[kind].x,before[kind].z-after[kind].z)<.05||before[kind].y!==after[kind].y)throw Error(kind+' direct drag failed');
    checks.push({name:kind+'-direct-pointer-drag',passed:true});
  }
  const height=await f.locator('[data-height=hand]').boundingBox(),before=await snapshot();
  await page.mouse.move(height.x+height.width/2,height.y+height.height/2);await page.mouse.down();await page.mouse.move(height.x+height.width/2,height.y+height.height/2-35,{steps:10});await page.mouse.up();
  if((await snapshot()).hand.y<=before.hand.y)throw Error('Height handle failed');
  checks.push({name:'vertical-handle',passed:true});
  await f.locator('#resetExperiment').click();await f.locator('[data-select=hand]').first().click();await f.locator('#heightSlider').focus();await page.keyboard.press('End');
  if((await snapshot()).metrics.valid||!(await f.locator('#sceneWarning').isVisible()))throw Error('Invalid-height warning failed');
  checks.push({name:'low-source-warning',passed:true});
  await f.locator('#resetExperiment').click();
  return {ok:true,checks,renderer:(await snapshot()).renderer};
}

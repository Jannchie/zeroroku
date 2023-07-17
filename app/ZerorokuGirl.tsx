'use client';
import { useEffect, useRef } from 'react';
import { Application } from '@pixi/app';
import { Ticker } from '@pixi/core';

export function ZerorokuGirl () {
  const canvas = useRef(null);
  useEffect(() => {
    if ((window as any).Live2DCubismCore) {
      (async function () {
        if (canvas.current === null) return;
        const app = new Application({
          view: canvas.current,
          height: 1180,
          width: 1024,
          backgroundAlpha: 0,
        });
        import('pixi-live2d-display/cubism4').then(async ({ Live2DModel }) => {
          Live2DModel.registerTicker(Ticker);
          const model = await Live2DModel.from('06-v2.model3.json');
          app.stage.addChild(model);
          model.rotation = Math.PI;
          model.skew.x = Math.PI;
          model.scale.set(1, 1);
          model.anchor.set(0.5, 0.5);
          model.position.set(512, 900);
        });
      })();
    }
  }, []);
  return (
    <canvas
      ref={canvas}
      className="w-full"
      id="canvas"
    />
  );
}

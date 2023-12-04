import React, { useRef, useEffect } from 'react'

const FrameCanvas = (props: { [x: string]: any; draw: any; frameRate: any }) => { 
  const { draw, frameRate, ...rest } = props
  const canvasRef = useRef(null)
  
  useEffect(() => {
    const canvas : HTMLCanvasElement = canvasRef.current as unknown as HTMLCanvasElement
    if (canvas !== null) {
      const context = canvas.getContext("2d")
      let frameCount = 0
      let animationFrameId : number
      let then = Date.now()
      let fpsInterval = 1000 / frameRate
      
      const render = () => {
          // request another frame

          animationFrameId = window.requestAnimationFrame(render);

          // calc elapsed time since last loop

          let now = Date.now();
          let elapsed = now - then;

          // if enough time has elapsed, draw the next frame

          if (elapsed > fpsInterval) {
              frameCount++

              // Get ready for next frame by setting then=now, but also adjust for your
              // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
              then = now - (elapsed % fpsInterval);

              // Put your drawing code here
              draw(context, frameCount)
          }
      }
      render()
      
      return () => {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [draw, frameRate])
  
  return <canvas id="canvas" ref={canvasRef} {...rest}/>
}

export default FrameCanvas
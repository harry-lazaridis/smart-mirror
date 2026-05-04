import React, { useState, useEffect, useRef } from "react";

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let radius = canvas.height / 2;
    ctx.translate(radius, radius);
    let clockRadius = canvas.height * 0.4;

    drawClock(ctx, canvas, clockRadius); //needed for clock symbol delay 

    const i = setInterval(() => {
    drawClock(ctx, canvas, clockRadius);
    setTime(new Date()); }, 1000);
  

    return () => clearInterval(i);
  }, []);

  /* W3schools is used for drawing the clock symbol (https://www.w3schools.com/graphics/canvas_clock.asp)*/ 
  function drawClock (ctx, canvas, clockRadius){
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    drawClockFace (ctx, clockRadius);
    drawClockNumbers(ctx, clockRadius);
    drawClockHands (ctx, clockRadius);
  }

  function drawClockFace (ctx, radius){
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'black';
    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = radius * 0.03;
    ctx.stroke();
  }

  function drawClockNumbers (ctx, radius){
    ctx.font = radius * 0.17 + "px Inter";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";


    for(let num = 1; num < 13; num++){
      let ang = num * Math.PI / 6;
      ctx.rotate(ang);
      ctx.translate(0, -radius * 0.85);
      ctx.rotate(-ang);
      ctx.fillText(num.toString(), 0, 0);
      ctx.rotate(ang);
      ctx.translate(0, radius * 0.85);
      ctx.rotate(-ang);
    }
  }

  function drawClockHands (ctx, radius){
    const now = new Date();
      let hour = now.getHours();
      let minute = now.getMinutes();
      let second = now.getSeconds();

  
        hour = hour%12;
        hour = (hour*Math.PI/6)+(minute*Math.PI/(6*60))+(second*Math.PI/(360*60));
        drawHand(ctx, hour, radius*0.5, radius*0.05);
      
        minute = (minute*Math.PI/30)+(second*Math.PI/(30*60));
        drawHand(ctx, minute, radius*0.7, radius*0.05);
      
  }

  function drawHand (ctx, position, length, width){
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.strokeStyle = "white";
    ctx.lineCap = "square";
    ctx.moveTo(0,0);
    ctx.rotate(position);
    ctx.lineTo(0, -length);
    ctx.stroke();
    ctx.rotate(-position);
  }

  return (
    <div style={styles.box}>
      <div style={styles.top}>
        <div style={styles.analogclock}> <canvas ref={canvasRef} width={180} height={180}></canvas> </div>
        <div style={styles.digitaltime}>{time.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit", hour12: false})}</div>
      </div>
      <div style={styles.bottom}>{time.toLocaleDateString("en-GB", {weekday: "long", month: "long", day: "numeric"})}</div>
      
    </div>
  );
}

const styles = {
  center: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    padding: "8cqi",
    textAlign: "center",
  },
  label: {
    margin: 0,
    opacity: 0.7,
    letterSpacing: "0.08em",
    fontSize: "clamp(10px, 6cqi, 20px)",
    textTransform: "uppercase",
  },
  time: {
    margin: "3cqi 0 0",
    lineHeight: 1.05,
    fontWeight: 700,
    fontSize: "clamp(18px, 15cqi, 72px)",
  },

  box: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    flexDirection: "column",
  },

  digitaltime: {
    fontFamily: "Inter",
    fontSize: "90px",
  },

  analogclock: {
    height: "180px",
    width: "180px",
    
  },

  top: {
    display: "flex",
    alignItems: "center",
    gap: "30px"
  },

  bottom: {
    fontSize: "50px",
    fontFamily: "Inter",
  },
};

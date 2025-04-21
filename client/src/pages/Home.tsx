import { useEffect, useRef, useState } from "react";
import Highcharts from "highcharts";
import { apiRequest } from "@/lib/queryClient";
// Uncomment and use this import when you add your mp3 to the assets folder
// import backgroundMusic from "@/assets/background-music.mp3";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);

  // Handle click to enter
  const handleEnter = async () => {
    try {
      setShowOverlay(false);
      
      if (audioRef.current) {
        audioRef.current.volume = 0.3; // Lower volume for better experience
        audioRef.current.currentTime = 0; // Reset to start
        audioRef.current.loop = true; // Enable looping
        await audioRef.current.play();
      }
    } catch (err) {
      console.error("Error playing audio:", err);
    }
  };

  // Initialize wireframe background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number, height: number;
    let points: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
    }> = [];
    const numPoints = 200;  // Further increased for density
    const connectionDistance = 200; // Increased for more connections
    const pointSize = 2;  // Keeping the same size for clear nodes
    
    const colors = {
      c1: 'rgba(143, 77, 172, 0.8)', // Purple
      c2: 'rgba(91, 119, 190, 0.8)', // Blue
      c3: 'rgba(255, 255, 255, 0.5)', // White with transparency
    };
    
    function resizeCanvas() {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initPoints();
    }
    
    function initPoints() {
      points = [];
      for (let i = 0; i < numPoints; i++) {
        const colorKeys = Object.keys(colors);
        const colorKey = colorKeys[Math.floor(Math.random() * colorKeys.length)] as keyof typeof colors;
        
        points.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          color: colors[colorKey]
        });
      }
    }
    
    function drawPoints() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        
        point.x += point.vx;
        point.y += point.vy;
        
        if (point.x < 0 || point.x > width) point.vx *= -1;
        if (point.y < 0 || point.y > height) point.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(point.x, point.y, pointSize, 0, Math.PI * 2);
        ctx.fillStyle = point.color;
        ctx.fill();
        
        for (let j = i + 1; j < points.length; j++) {
          const otherPoint = points[j];
          const dx = point.x - otherPoint.x;
          const dy = point.y - otherPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < connectionDistance) {
            const gradient = ctx.createLinearGradient(
              point.x, point.y, otherPoint.x, otherPoint.y
            );
            gradient.addColorStop(0, point.color);
            gradient.addColorStop(1, otherPoint.color);
            
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(otherPoint.x, otherPoint.y);
            ctx.strokeStyle = gradient;
            ctx.globalAlpha = 1 - (distance / connectionDistance);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      
      requestAnimationFrame(drawPoints);
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    drawPoints();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Initialize chart
  useEffect(() => {
    if (typeof Highcharts === 'undefined') {
      console.error('Highcharts not loaded');
      return;
    }

    // First, get historical data
    const fetchHistoricalData = async () => {
      try {
        const response = await apiRequest('GET', '/api/stats', undefined);
        const data = await response.json();
        
        // Create chart with historical data
        initializeChart(data.stats || []);
      } catch (error) {
        console.error("Error fetching historical data:", error);
        // Initialize chart anyway, even without historical data
        initializeChart([]);
      }
    };
    
    const initializeChart = (historyData: any[]) => {
      // Convert database timestamps to chart points
      const initialData = historyData.map(stat => {
        return [new Date(stat.timestamp).getTime(), stat.count];
      }).sort((a, b) => a[0] - b[0]); // Sort by time ascending
      
      chartRef.current = Highcharts.chart('graph', {
        chart: {
          type: 'line',
          backgroundColor: '#000000',
          style: {
            fontFamily: 'monospace'
          },
          animation: {
            duration: 500
          },
          spacing: [20, 10, 20, 10]
        },
        credits: {
          enabled: false
        },
        title: {
          text: 'DSTAT',
          style: {
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold'
          },
          align: 'center'
        },
        xAxis: {
          type: 'datetime',
          labels: {
            style: {
              color: '#ffffff',
              fontSize: '10px'
            }
          },
          lineColor: '#333333',
          tickColor: '#333333',
          gridLineColor: '#111111'
        },
        yAxis: {
          labels: {
            style: {
              color: '#ffffff',
              fontSize: '10px'
            }
          },
          gridLineColor: '#111111',
          lineColor: '#333333',
          tickColor: '#333333',
          title: {
            text: 'Requests',
            style: {
              color: '#ffffff',
              fontSize: '12px'
            }
          }
        },
        series: [{
          name: 'Total Requests',
          color: '#ffffff',
          lineWidth: 1,
          marker: {
            enabled: false
          },
          data: initialData
        }],
        legend: {
          enabled: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          style: {
            color: '#ffffff',
            fontSize: '10px'
          },
          borderColor: '#333'
        },
        plotOptions: {
          line: {
            animation: {
              duration: 300
            }
          }
        }
      } as any);

      // Start the real-time updates
      const updateData = () => {
        apiRequest('GET', `/api/rps?${Date.now()}`, undefined)
          .then(response => response.json())
          .then(data => {
            if (!chartRef.current) return;
            const x = Date.now();
            const y = data.c || 0;
            const series = chartRef.current.series[0];
            series.addPoint([x, y], true, series.data.length > 30);
          })
          .catch(error => {
            console.error("Error fetching data:", error);
          });
      };

      const interval = setInterval(updateData, 1000);
      return () => clearInterval(interval);
    };
    
    fetchHistoricalData();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <>
      <canvas 
        ref={canvasRef} 
        id="wireframe-bg" 
        style={{
          position: 'fixed',
          top: 0, 
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0
        }}
      ></canvas>
      
      {showOverlay && (
        <div 
          className="cte" 
          id="cte" 
          onClick={handleEnter}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            cursor: 'pointer',
            transition: 'opacity .5s ease',
          }}
        >
          <div 
            className="cte-text"
            style={{
              fontFamily: "'Poppins',sans-serif",
              fontWeight: 500,
              color: '#fff',
              fontSize: '24px',
              textAlign: 'center',
              userSelect: 'none',
            }}
          >
            Click to Enter
          </div>
        </div>
      )}
      
      <audio 
        ref={audioRef}
        id="mainm"
        src="/background-music.mp3"
        preload="auto"
        loop
        style={{ display: 'none' }}
      />
      
      <div className="main-container" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh',
        width: '100%',
        marginTop: '5vh'
      }}>
        <div 
          className="mainl glitch-text"
          style={{
            whiteSpace: 'pre',
            textAlign: 'center',
            marginBottom: '10px',
            width: '100%',
            fontSize: '.65em',
            lineHeight: 1.2,
            overflowX: 'auto',
            maxWidth: '100%',
            position: 'relative',
            zIndex: 1,
            fontFamily: 'monospace',
            color: '#ffffff',
            letterSpacing: '0.5px'
          }}
        >
{`$$$$$$$$\\  $$$$$$\\  $$\\   $$\\ $$$$$$$$\\ 
\\____$$  |$$  __$$\\ $$$\\  $$ |$$  _____|
    $$  / $$ /  $$ |$$$$\\ $$ |$$ |      
   $$  /  $$$$$$$$ |$$ $$\\$$ |$$$$$\\    
  $$  /   $$  __$$ |$$ \\$$$$ |$$  __|   
 $$  /    $$ |  $$ |$$ |\\$$$ |$$ |      
$$$$$$$$\\ $$ |  $$ |$$ | \\$$ |$$$$$$$$\\ 
\\________|\\___|  \\__|\\__|  \\__|\\_______|`}
        </div>
        
        <div 
          className="links"
          style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            padding: '10px',
            width: '90%',
            maxWidth: '500px',
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 1,
            marginTop: '15px',
          }}
        >
          <a 
            href="https://www.roblox.com/users/2460326111/profile" 
            target="_blank"
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontSize: '16px',
              margin: '10px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 20px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '4px',
              transition: 'all .3s ease',
              width: '200px',
              position: 'relative',
              overflow: 'hidden',
              zIndex: 1,
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ marginRight: '10px', width: '22px', height: '22px' }}>
              <path fill="#fff" d="M12 0C5.37 0 0 5.37 0 12c0 6.63 5.37 12 12 12 6.63 0 12-5.37 12-12 0-6.63-5.37-12-12-12zm0 5.37c1.86 0 3.37 1.51 3.37 3.37 0 1.86-1.51 3.37-3.37 3.37-1.86 0-3.37-1.51-3.37-3.37 0-1.86 1.51-3.37 3.37-3.37zm0 13.26c-2.79 0-5.26-1.43-6.71-3.6.03-2.23 4.47-3.46 6.71-3.46 2.24 0 6.68 1.23 6.71 3.46-1.45 2.17-3.92 3.6-6.71 3.6z"/>
            </svg>
            Roblox: KING1310Z
          </a>
          <a 
            href="https://discord.com/users/zane_0xo" 
            target="_blank"
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontSize: '16px',
              margin: '10px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 20px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '4px',
              transition: 'all .3s ease',
              width: '200px',
              position: 'relative',
              overflow: 'hidden',
              zIndex: 1,
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" style={{ marginRight: '10px', width: '22px', height: '22px' }}>
              <path fill="#fff" d="M248 8a248 248 0 1 0 0 496 248 248 0 0 0 0-496m115 169c-4 39-20 134-28 178-4 19-10 25-17 25-14 2-25-9-39-18l-56-38c-24-16-8-24 6-39 3-4 67-61 68-67l-1-4-5-1q-4 1-105 70-15 10-27 9c-9 0-26-5-38-9-16-5-28-7-27-16q1-7 18-14l145-62c69-29 83-34 92-34 2 0 7 1 10 3a11 11 0 0 1 4 7 44 44 0 0 1 0 10"/>
            </svg> 
            Discord: zane_0xo
          </a>
        </div>
        
        <div 
          className="line"
          style={{
            width: '60%',
            height: '1px',
            background: '#333',
            margin: '15px 0',
            position: 'relative',
            zIndex: 1,
          }}
        ></div>
        
        <div 
          className="stats"
          style={{
            backgroundColor: '#000',
            padding: '5px',
            width: '90%',
            maxWidth: '800px',
            margin: '10px auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div id="graph" style={{ width: '100%', height: '300px' }}></div>
        </div>
      </div>

      <style>{`
        .main-container {
          padding-bottom: 30px;
        }
        
        @media screen and (max-width: 768px) {
          .mainl {
            font-size: .5em;
            transform: scale(1, 1);
          }
          .links a {
            font-size: 16px;
            padding: 6px 12px;
          }
          #graph {
            height: 200px;
          }
        }
        
        @media screen and (max-width: 480px) {
          .mainl {
            font-size: .4em;
          }
          .cte-text {
            font-size: 18px;
          }
        }
        
        /* Link hover effects */
        .links a:hover {
          color: #fff;
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0);
        }
        
        .links a::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            #60284A, 
            #435177, 
            #FFFFFF, 
            #60284A
          );
          opacity: 0;
          transform: translate(-50%, -50%);
          transition: opacity 0.3s ease;
          z-index: -2;
          filter: blur(8px);
        }
        
        .links a::after {
          content: '';
          position: absolute;
          top: 1px;
          left: 1px;
          right: 1px;
          bottom: 1px;
          background: #000;
          border-radius: 3px;
          z-index: -1;
        }
        
        .links a:hover::before {
          opacity: 0.8;
          animation: rotateGlow 4s linear infinite;
        }
        
        @keyframes rotateGlow {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}

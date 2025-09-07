import { useEffect, useState } from 'react'

interface Meteor {
  id: number
  x: number
  y: number
  length: number
  speed: number
  angle: number
  opacity: number
}

export default function MeteorShower() {
  const [meteors, setMeteors] = useState<Meteor[]>([])

  useEffect(() => {
    const spawnMeteor = () => {
      const meteor: Meteor = {
        id: Date.now() + Math.random(),
        x: Math.random() * window.innerWidth + 100,
        y: -50,
        length: Math.random() * 100 + 50,
        speed: Math.random() * 8 + 6,
        angle: Math.random() * 30 + 15, // 15-45 degree angle
        opacity: Math.random() * 0.8 + 0.2
      }
      
      setMeteors(prev => [...prev, meteor])
    }

    // Spawn meteors periodically
    const spawnInterval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance every interval
        spawnMeteor()
      }
    }, 2000)

    // Animate meteors
    const animationInterval = setInterval(() => {
      setMeteors(prevMeteors =>
        prevMeteors
          .map(meteor => ({
            ...meteor,
            x: meteor.x - meteor.speed * Math.cos(meteor.angle * Math.PI / 180),
            y: meteor.y + meteor.speed * Math.sin(meteor.angle * Math.PI / 180)
          }))
          .filter(meteor => meteor.x > -200 && meteor.y < window.innerHeight + 100)
      )
    }, 50)

    return () => {
      clearInterval(spawnInterval)
      clearInterval(animationInterval)
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {meteors.map(meteor => (
        <div
          key={meteor.id}
          className="absolute"
          style={{
            left: meteor.x,
            top: meteor.y,
            transform: `rotate(${meteor.angle}deg)`,
          }}
        >
          <div
            className="bg-gradient-to-r from-white via-blue-200 to-transparent rounded-full"
            style={{
              width: `${meteor.length}px`,
              height: '2px',
              opacity: meteor.opacity,
              boxShadow: `0 0 10px rgba(255, 255, 255, ${meteor.opacity})`,
            }}
          />
        </div>
      ))}
    </div>
  )
}
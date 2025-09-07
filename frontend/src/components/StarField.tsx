import { useEffect, useState } from 'react'

interface Star {
  id: number
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  color: string
}

export default function StarField() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    // Initialize stars
    const initialStars: Star[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 3 + 1,
      opacity: Math.random() * 0.8 + 0.2,
      color: ['#ffffff', '#ffd700', '#87ceeb', '#ffc0cb', '#98fb98'][Math.floor(Math.random() * 5)]
    }))
    
    setStars(initialStars)

    // Animate stars
    const interval = setInterval(() => {
      setStars(prevStars =>
        prevStars.map(star => ({
          ...star,
          y: star.y >= window.innerHeight ? -10 : star.y + star.speed,
          x: star.x + Math.sin(star.y * 0.01) * 0.5, // Gentle side movement
          opacity: Math.sin(star.y * 0.01) * 0.5 + 0.5 // Twinkling effect
        }))
      )
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute rounded-full animate-pulse"
          style={{
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            backgroundColor: star.color,
            opacity: star.opacity,
            boxShadow: `0 0 ${star.size * 2}px ${star.color}`,
          }}
        />
      ))}
    </div>
  )
}
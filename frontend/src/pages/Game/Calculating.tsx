import { Link } from "react-router-dom"
import { ChevronLeft } from 'lucide-react';

export default function Stock() {
  return(
    <div>
      <div className="relative text-center">
        <h1 className="text-xl font-bold">계산 게임</h1>
        <Link to="/" className="absolute top-0 left-0"><ChevronLeft /></Link>
      </div>
      <p className="text-center py-4 text-[#666]">당신은 자영업자! 손님들의 계산을 정확하게 도와주세요~!</p>

      {/* game 실행 코드 */}
      <div>

      </div>
    </div>
  )
}
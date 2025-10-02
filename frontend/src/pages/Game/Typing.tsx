import { Link } from "react-router-dom"
import { ChevronLeft } from 'lucide-react';

export default function Typing() {
  return(
    <div>
      <div className="relative text-center">
        <h1 className="text-xl font-bold">타이핑 게임</h1>
        <Link to="/" className="absolute top-0 left-0"><ChevronLeft /></Link>
      </div>
      <p className="text-center py-4 text-[#666]">당신은 회사원! 빠른 손으로 부장님께 사랑을 받으세요~!</p>


      {/* game 실행 코드 */}
      <div>

      </div>
    </div>
  )
}
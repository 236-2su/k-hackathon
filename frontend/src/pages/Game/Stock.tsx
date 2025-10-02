import { Link } from "react-router-dom"
import { ChevronLeft } from 'lucide-react';

export default function Stock() {
  return(
    <div>
      <div className="relative text-center">
        <h1 className="text-xl font-bold">주식 게임</h1>
        <Link to="/" className="absolute top-0 left-0"><ChevronLeft /></Link>
      </div>
      <p className="text-center py-4 text-[#666]">당신은 프리랜서! 뉴스를 보고 다음 차트를 예상해서 투자하세요!</p>

      {/* game 실행 코드 */}
      <div className="bg-gray-100 h-40"> 

      </div>
    </div>
  )
}
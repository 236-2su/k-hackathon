import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      <div className="flex flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-bold mb-4">직업을 선택해주세요</h2>
        <Link to="/game/typing" className="min-w-40 text-center px-8 py-3 bg-gray-300 rounded-lg cursor-pointer hover:bg-gray-400">회사원</Link>
        <Link to="/game/calculating" className="min-w-40 text-center px-8 py-3 bg-gray-300 rounded-lg cursor-pointer hover:bg-gray-400">자영업자</Link>
        <Link to="/game/stock" className="min-w-40 text-center px-8 py-3 bg-gray-300 rounded-lg cursor-pointer hover:bg-gray-400">프리랜서</Link>
      </div>
    </>
  )
}
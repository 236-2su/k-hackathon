import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-center border-b border-[#eee] pb-10">
        <img src="/logo.png" alt="첫걸음 타운" className="w-40" />
        <h1 className="title text-[40px] text-center mt-2">첫걸음 타운</h1>
        <p className="mt-4 text-lg text-slate-600 text-center">
          청소년을 위한 경제교육 플랫폼 '첫걸음타운'의 서비스입니다.<br/>
          아래 메뉴를 통해 첫걸음타운의 서비스를 체험해 보세요.
        </p>
      </section>

      <section className="grid gap-4">
        <h2 className="text-[20px] font-semibold text-slate-800">🎯 맞춤 추천</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/survey"
            className="rounded-lg border border-slate-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-blue-600">설문 기반 추천</h3>
            <p className="mt-2 text-md font-medium text-slate-800">
              간단한 설문을 통해 적금, 예금, 청소년 카드 중에서 나에게 맞는 상품을 추천받아요.
            </p>
          </Link>
          <Link
            to="/chat/finance"
            className="rounded-lg border border-slate-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-emerald-600">금융 챗봇</h3>
            <p className="mt-2 text-md font-medium text-slate-800">
              금융, 용돈 관리, 저축, 카드에 대해 궁금한 점을 물어보세요. 청소년 눈높이로 안내해 드릴게요.
            </p>
          </Link>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-[20px] font-semibold text-slate-800">🕹 체험 게임</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/game/typing"
            className="rounded-lg bg-slate-100 px-6 py-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md hover:bg-slate-200"
          >
            타자 연습
          </Link>
          <Link
            to="/game/calculating"
            className="rounded-lg bg-slate-100 px-6 py-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md hover:bg-slate-200"
          >
            계산 게임
          </Link>
          <Link
            to="/game/stock"
            className="rounded-lg bg-slate-100 px-6 py-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md hover:bg-slate-200"
          >
            주식 게임
          </Link>
        </div>
      </section>
    </div>
  );
}
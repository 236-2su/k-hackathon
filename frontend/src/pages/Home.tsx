import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-3xl bg-blue-50/60 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">무엇을 도와드릴까요?</h1>
        <p className="mt-2 text-sm text-slate-600">
          아래 메뉴에서 설문에 참여하거나 챗봇과 대화해 보세요.
        </p>
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg font-semibold text-slate-800">🎯 맞춤 추천 &amp; Q&amp;A</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/survey"
            className="rounded-3xl border border-slate-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h3 className="text-sm font-semibold text-blue-600">설문 기반 추천</h3>
            <p className="mt-2 text-sm text-slate-600">
              간단한 설문을 통해 적금, 예금, 청소년 카드 중에서 나에게 맞는 상품을 추천받아요.
            </p>
          </Link>
          <Link
            to="/chat/finance"
            className="rounded-3xl border border-slate-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h3 className="text-sm font-semibold text-emerald-600">금융 Q&amp;A 챗봇</h3>
            <p className="mt-2 text-sm text-slate-600">
              금융, 용돈 관리, 저축, 카드에 대해 궁금한 점을 물어보세요. 청소년 눈높이로 안내해 드릴게요.
            </p>
          </Link>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg font-semibold text-slate-800">🕹 체험 게임</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/game/typing"
            className="rounded-2xl bg-slate-100 px-6 py-4 text-center text-sm font-semibold text-slate-700 transition hover:-translate-y-1 hover:bg-slate-200"
          >
            타자 연습
          </Link>
          <Link
            to="/game/calculating"
            className="rounded-2xl bg-slate-100 px-6 py-4 text-center text-sm font-semibold text-slate-700 transition hover:-translate-y-1 hover:bg-slate-200"
          >
            계산 게임
          </Link>
          <Link
            to="/game/stock"
            className="rounded-2xl bg-slate-100 px-6 py-4 text-center text-sm font-semibold text-slate-700 transition hover:-translate-y-1 hover:bg-slate-200"
          >
            주식 게임
          </Link>
        </div>
      </section>
    </div>
  );
}
import { useNavigate } from "react-router-dom";

type Props = {
  className?: string;
};

export default function BackButton({ className }: Props) {
  const navigate = useNavigate();
  const goBack = () => {
    // history가 없으면 홈으로
    try {
      if (window.history.length > 1) navigate(-1);
      else navigate("/");
    } catch {
      navigate("/");
    }
  };

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    padding: 0,
    background: "transparent",
    border: "none",
    color: "#64748b", // slate-500 (조금 더 옅게)
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
  };

  return (
    <button type="button" onClick={goBack} aria-label="뒤로가기" className={className} style={baseStyle}>
      ◀
    </button>
  );
}

import { useLocation } from "react-router-dom";
import BackButton from "./BackButton";

export default function BackButtonOverlay() {
  const location = useLocation();
  // 홈/챗봇/설문에서는 표시하지 않음
  const path = location?.pathname || "/";
  if (
    path === "/" ||
    path.startsWith("/chat") ||
    path.startsWith("/survey")
  ) {
    return null;
  }
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: 50,
      }}
    >
      <BackButton />
    </div>
  );
}

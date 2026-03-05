import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";
import type { Article } from "@/lib/types";
import type { T } from "@/i18n";

interface Props {
  article: Article;
  t: T["articles"];
  onClose: () => void;
}

export function PosterGenerator({ article, t, onClose }: Props) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  // 专属分享链接
  const shareUrl = `${window.location.origin}?article=${article.idiot_id}`;

  const handleGenerate = async () => {
    if (!posterRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2, // 提高清晰度
        useCORS: true,
        backgroundColor: "#0a0a0c",
      });
      setImgUrl(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("Failed to generate poster:", err);
    }
    setGenerating(false);
  };

  const downloadPoster = () => {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = `IDIOT-Report-${article.idiot_id}.png`;
    a.click();
  };

  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 999 }}>
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ background: "#111113", border: "1px solid var(--gold)", padding: 32, maxWidth: 500, width: "90vw", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <h3 style={{ fontSize: 18, fontFamily: "var(--mono)", color: "var(--gold)", marginBottom: 20 }}>
          {imgUrl ? "🎉 海报已生成" : "正在生成病理报告..."}
        </h3>

        {!imgUrl ? (
          <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
            {/* 需要被截图的真实 DOM（对用户可见以确认效果） */}
            <div 
              ref={posterRef} 
              style={{
                width: 400,
                background: "var(--bg)",
                border: "2px solid var(--border)",
                padding: "32px",
                position: "relative",
                margin: "0 auto",
                boxSizing: "border-box"
              }}
            >
              {/* 顶部 Header */}
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--gold-dim)", paddingBottom: 16, marginBottom: 24 }}>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 16, color: "var(--gold)", fontWeight: 600, letterSpacing: 2 }}>I.D.I.O.T.</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", letterSpacing: 4 }}>若智学刊</div>
                </div>
                <div style={{ textAlign: "right" }}>
                 <div style={{ fontSize: 10, fontFamily: "var(--serif-cn)", color: "#ef4444", border: "1px solid #ef4444", padding: "2px 6px", display: "inline-block", marginBottom: 4 }}>
                  诊断报告单
                 </div>
                  <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-ghost)" }}>{article.idiot_id}</div>
                </div>
              </div>

              {/* 诊断分类与指数 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-faint)", marginBottom: 4 }}>诊断分类 (CLASSIFICATION)</div>
                  <div style={{ background: "rgba(212,175,55,0.1)", color: "var(--gold)", padding: "4px 10px", fontSize: 12, fontFamily: "var(--mono)", display: "inline-block" }}>
                    {article.classification}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-faint)", marginBottom: 4 }}>荒诞指数</div>
                  <div style={{ fontSize: 24, color: "var(--gold)", fontWeight: 600, lineHeight: 1 }}>
                    {article.rating || "N/A"} <span style={{ fontSize: 14 }}>/ 5.0</span>
                  </div>
                </div>
              </div>

              {/* 文章核心 */}
              <h2 style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.4, marginBottom: 16, color: "var(--text)" }}>
                {article.title_zh || article.title_en}
              </h2>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, borderLeft: "2px solid var(--gold)", paddingLeft: 12 }}>
                {(article.abstract_zh || article.abstract_en).slice(0, 120)}...
              </div>

              {/* 底部二维码区 */}
              <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 20, marginTop: 20, display: "flex", gap: 16, alignItems: "center" }}>
                <QRCodeSVG value={shareUrl} size={64} bgColor="#0a0a0c" fgColor="#d4af37" />
                <div>
                  <div style={{ fontSize: 12, fontFamily: "var(--serif-cn)", color: "var(--text-faint)", marginBottom: 4 }}>作者：{article.authors} </div>
                  <div style={{ fontSize: 10, color: "var(--text-ghost)" }}>长按识别二维码或访问：</div>
                  <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--gold)" }}>idiotjournal.org</div>
                </div>
              </div>
            </div>

            {/* 遮罩层：防止用户在截图时选中文本 */}
            <div style={{ position: "absolute", inset: 0, zIndex: 10 }} />
          </div>
        ) : (
          <img src={imgUrl} alt="Poster Preview" style={{ width: "100%", maxWidth: 400, border: "1px solid var(--border)" }} />
        )}

        <div style={{ display: "flex", gap: 16, marginTop: 32, width: "100%", justifyContent: "center" }}>
          {!imgUrl ? (
            <button className="bp" style={{ width: 200 }} onClick={handleGenerate} disabled={generating}>
              {generating ? "绘制中..." : "生成专属海报"}
            </button>
          ) : (
            <>
              <button className="bp" style={{ flex: 1, background: "var(--gold)", color: "var(--bg)" }} onClick={downloadPoster}>
                保存到相册 / 下载
              </button>
              <button className="bp" style={{ flex: 1, borderColor: "var(--text-ghost)", color: "var(--text-muted)" }} onClick={() => setImgUrl(null)}>
                重新生成
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  Type,
  Palette,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  MessageCircle,
  Square,
  Minus,
  Flag,
} from "lucide-react";
import {
  BookPage,
  TextPosition,
  TextBackground,
  TextStyle,
  TEXT_POSITIONS,
  TEXT_BACKGROUNDS,
  TEXT_STYLES,
  TEXT_COLORS,
} from "./types";

interface TextCustomizerProps {
  page: BookPage;
  onUpdatePage: (updates: Partial<BookPage>) => void;
}

export default function TextCustomizer({
  page,
  onUpdatePage,
}: TextCustomizerProps) {
  const currentPosition = (page.textPosition as TextPosition) || "bottom";
  const currentBackground =
    (page.textBackground as TextBackground) || "gradient";
  const currentStyle = (page.textStyle as TextStyle) || "default";
  const currentColor = page.textColor || "#FFFFFF";

  return (
    <div className='space-y-6'>
      {/* Posición del texto */}
      <div>
        <label className='flex items-center gap-2 text-sm font-medium text-text-muted mb-3'>
          <AlignVerticalJustifyEnd className='w-4 h-4' />
          Posición del texto
        </label>
        <div className='grid grid-cols-3 gap-2'>
          {TEXT_POSITIONS.slice(0, 3).map((pos) => (
            <button
              key={pos.id}
              onClick={() => onUpdatePage({ textPosition: pos.id })}
              className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                currentPosition === pos.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}>
              {pos.label}
            </button>
          ))}
        </div>
        <div className='grid grid-cols-4 gap-2 mt-2'>
          {TEXT_POSITIONS.slice(3).map((pos) => (
            <button
              key={pos.id}
              onClick={() => onUpdatePage({ textPosition: pos.id })}
              className={`p-2 rounded-lg border text-[10px] font-medium transition-all ${
                currentPosition === pos.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              }`}>
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fondo del texto */}
      <div>
        <label className='flex items-center gap-2 text-sm font-medium text-text-muted mb-3'>
          <MessageCircle className='w-4 h-4' />
          Estilo de fondo
        </label>
        <div className='space-y-2'>
          {TEXT_BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              onClick={() => onUpdatePage({ textBackground: bg.id })}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                currentBackground === bg.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}>
              <div className='w-8 h-8 rounded flex items-center justify-center bg-surface'>
                {bg.id === "none" && (
                  <Minus className='w-4 h-4 text-text-muted' />
                )}
                {bg.id === "gradient" && (
                  <div className='w-6 h-4 bg-gradient-to-t from-black to-transparent rounded' />
                )}
                {bg.id === "bubble" && (
                  <MessageCircle className='w-4 h-4 text-text-muted' />
                )}
                {bg.id === "box" && (
                  <Square className='w-4 h-4 text-text-muted' />
                )}
                {bg.id === "banner" && (
                  <Flag className='w-4 h-4 text-text-muted' />
                )}
              </div>
              <div className='flex-1 text-left'>
                <div className='text-sm font-medium'>{bg.label}</div>
                <div className='text-xs text-text-muted'>{bg.preview}</div>
              </div>
              {currentBackground === bg.id && (
                <div className='w-2 h-2 rounded-full bg-primary' />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Color del texto */}
      <div>
        <label className='flex items-center gap-2 text-sm font-medium text-text-muted mb-3'>
          <Palette className='w-4 h-4' />
          Color del texto
        </label>
        <div className='flex flex-wrap gap-2'>
          {TEXT_COLORS.map((color) => (
            <button
              key={color.id}
              onClick={() => onUpdatePage({ textColor: color.color })}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                currentColor === color.color
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-primary/50"
              }`}
              style={{ backgroundColor: color.color }}
              title={color.label}
            />
          ))}
          {/* Color personalizado */}
          <label
            className='w-8 h-8 rounded-full border-2 border-dashed border-border hover:border-primary cursor-pointer flex items-center justify-center overflow-hidden'
            title='Color personalizado'>
            <input
              type='color'
              value={currentColor}
              onChange={(e) => onUpdatePage({ textColor: e.target.value })}
              className='absolute opacity-0 w-0 h-0'
            />
            <div className='w-4 h-4 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500' />
          </label>
        </div>
      </div>

      {/* Estilo de fuente */}
      <div>
        <label className='flex items-center gap-2 text-sm font-medium text-text-muted mb-3'>
          <Type className='w-4 h-4' />
          Estilo de letra
        </label>
        <div className='grid grid-cols-2 gap-2'>
          {TEXT_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onUpdatePage({ textStyle: style.id })}
              className={`p-3 rounded-lg border transition-all ${
                currentStyle === style.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}>
              <span
                className='text-sm'
                style={{
                  fontFamily: style.fontFamily,
                  fontWeight: style.fontWeight as any,
                }}>
                {style.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview en tiempo real */}
      <div>
        <label className='text-sm font-medium text-text-muted mb-3 block'>
          Vista previa
        </label>
        <div className='relative h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg overflow-hidden'>
          <TextPreview
            text={page.text || "Texto de ejemplo"}
            position={currentPosition}
            background={currentBackground}
            style={currentStyle}
            color={currentColor}
          />
        </div>
      </div>
    </div>
  );
}

// Vista previa del texto
function TextPreview({
  text,
  position,
  background,
  style,
  color,
}: {
  text: string;
  position: TextPosition;
  background: TextBackground;
  style: TextStyle;
  color: string;
}) {
  const styleConfig = TEXT_STYLES.find((s) => s.id === style);

  const getPositionClass = () => {
    switch (position) {
      case "top":
        return "top-0 left-0 right-0";
      case "center":
        return "top-1/2 left-0 right-0 -translate-y-1/2";
      case "bottom":
        return "bottom-0 left-0 right-0";
      case "top-left":
        return "top-0 left-0";
      case "top-right":
        return "top-0 right-0";
      case "bottom-left":
        return "bottom-0 left-0";
      case "bottom-right":
        return "bottom-0 right-0";
      default:
        return "bottom-0 left-0 right-0";
    }
  };

  const getBackgroundStyle = (): React.CSSProperties => {
    switch (background) {
      case "none":
        return { textShadow: "1px 1px 3px rgba(0,0,0,0.8)" };
      case "gradient":
        return {
          background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
          padding: "1rem 0.5rem 0.25rem",
        };
      case "bubble":
        return {
          background: "white",
          color: "#000",
          borderRadius: "0.5rem",
          padding: "0.25rem 0.5rem",
          margin: "0.25rem",
          border: "2px solid #333",
          maxWidth: "fit-content",
        };
      case "box":
        return {
          background: "rgba(0,0,0,0.75)",
          borderRadius: "0.25rem",
          padding: "0.25rem 0.5rem",
          margin: "0.25rem",
        };
      case "banner":
        return {
          background:
            "linear-gradient(90deg, transparent, rgba(0,0,0,0.8) 10%, rgba(0,0,0,0.8) 90%, transparent)",
          padding: "0.25rem 0.75rem",
          textAlign: "center",
        };
      default:
        return {};
    }
  };

  return (
    <div
      className={`absolute ${getPositionClass()}`}
      style={getBackgroundStyle()}>
      <p
        className='text-xs leading-snug truncate'
        style={{
          fontFamily: styleConfig?.fontFamily,
          fontWeight: styleConfig?.fontWeight as any,
          color: background === "bubble" ? "#000" : color,
        }}>
        {text.slice(0, 40)}...
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Palette, Tag, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import {
  BookStyle,
  BOOK_STYLES,
  THEME_CATEGORIES,
  VISUAL_CATEGORIES,
} from "./types";

interface StyleSelectorProps {
  selectedStyle: BookStyle;
  onStyleChange: (style: BookStyle) => void;
  selectedThemeCategories: string[];
  onThemeCategoriesChange: (categories: string[]) => void;
  selectedVisualCategories: string[];
  onVisualCategoriesChange: (categories: string[]) => void;
}

export default function StyleSelector({
  selectedStyle,
  onStyleChange,
  selectedThemeCategories,
  onThemeCategoriesChange,
  selectedVisualCategories,
  onVisualCategoriesChange,
}: StyleSelectorProps) {
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [showAllVisual, setShowAllVisual] = useState(false);

  const toggleThemeCategory = (id: string) => {
    if (selectedThemeCategories.includes(id)) {
      onThemeCategoriesChange(selectedThemeCategories.filter((c) => c !== id));
    } else {
      onThemeCategoriesChange([...selectedThemeCategories, id]);
    }
  };

  const toggleVisualCategory = (id: string) => {
    if (selectedVisualCategories.includes(id)) {
      onVisualCategoriesChange(
        selectedVisualCategories.filter((c) => c !== id)
      );
    } else {
      onVisualCategoriesChange([...selectedVisualCategories, id]);
    }
  };

  const visibleThemes = showAllThemes
    ? THEME_CATEGORIES
    : THEME_CATEGORIES.slice(0, 8);
  const visibleVisual = showAllVisual
    ? VISUAL_CATEGORIES
    : VISUAL_CATEGORIES.slice(0, 4);

  return (
    <div className='space-y-6'>
      {/* Estilo del libro */}
      <div>
        <label className='flex items-center gap-2 text-sm font-medium text-text-muted mb-3'>
          <Sparkles className='w-4 h-4' />
          Estilo del libro
        </label>
        <div className='grid grid-cols-2 gap-2'>
          {BOOK_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onStyleChange(style.id)}
              className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                selectedStyle === style.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}>
              <div className='flex items-start gap-2'>
                <span className='text-2xl'>{style.emoji}</span>
                <div className='flex-1 min-w-0'>
                  <div className='text-sm font-semibold truncate'>
                    {style.label}
                  </div>
                  <div className='text-[10px] text-text-muted line-clamp-2'>
                    {style.description}
                  </div>
                </div>
              </div>
              {selectedStyle === style.id && (
                <div className='absolute top-1 right-1 w-2 h-2 rounded-full bg-primary' />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Categorías temáticas */}
      <div>
        <label className='flex items-center gap-2 text-sm font-medium text-text-muted mb-3'>
          <Tag className='w-4 h-4' />
          Temática
          {selectedThemeCategories.length > 0 && (
            <span className='ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full'>
              {selectedThemeCategories.length} seleccionadas
            </span>
          )}
        </label>
        <div className='flex flex-wrap gap-2'>
          {visibleThemes.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleThemeCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedThemeCategories.includes(cat.id)
                  ? "bg-primary text-white"
                  : "bg-surface border border-border hover:border-primary"
              }`}>
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
        {THEME_CATEGORIES.length > 8 && (
          <button
            onClick={() => setShowAllThemes(!showAllThemes)}
            className='flex items-center gap-1 text-xs text-primary hover:text-primary-hover mt-2 mx-auto'>
            {showAllThemes ? (
              <>
                Ver menos <ChevronUp className='w-3 h-3' />
              </>
            ) : (
              <>
                Ver más ({THEME_CATEGORIES.length - 8} más){" "}
                <ChevronDown className='w-3 h-3' />
              </>
            )}
          </button>
        )}
      </div>

      {/* Categorías visuales */}
      <div>
        <label className='flex items-center gap-2 text-sm font-medium text-text-muted mb-3'>
          <Palette className='w-4 h-4' />
          Estilo visual
          {selectedVisualCategories.length > 0 && (
            <span className='ml-auto text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full'>
              {selectedVisualCategories.length} seleccionadas
            </span>
          )}
        </label>
        <div className='space-y-2'>
          {visibleVisual.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleVisualCategory(cat.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                selectedVisualCategories.includes(cat.id)
                  ? "border-secondary bg-secondary/10"
                  : "border-border hover:border-secondary/50"
              }`}>
              <span className='text-xl'>{cat.emoji}</span>
              <div className='flex-1 text-left'>
                <div className='text-sm font-medium'>{cat.label}</div>
                <div className='text-[10px] text-text-muted'>
                  {cat.description}
                </div>
              </div>
              {selectedVisualCategories.includes(cat.id) && (
                <div className='w-2 h-2 rounded-full bg-secondary' />
              )}
            </button>
          ))}
        </div>
        {VISUAL_CATEGORIES.length > 4 && (
          <button
            onClick={() => setShowAllVisual(!showAllVisual)}
            className='flex items-center gap-1 text-xs text-secondary hover:text-secondary/80 mt-2 mx-auto'>
            {showAllVisual ? (
              <>
                Ver menos <ChevronUp className='w-3 h-3' />
              </>
            ) : (
              <>
                Ver más ({VISUAL_CATEGORIES.length - 4} más){" "}
                <ChevronDown className='w-3 h-3' />
              </>
            )}
          </button>
        )}
      </div>

      {/* Resumen de selección */}
      {(selectedThemeCategories.length > 0 ||
        selectedVisualCategories.length > 0) && (
        <div className='p-3 bg-surface rounded-lg border border-border'>
          <div className='text-xs text-text-muted mb-2'>Tu libro será:</div>
          <div className='flex flex-wrap gap-1'>
            <span className='text-xs bg-primary/20 text-primary px-2 py-0.5 rounded'>
              {BOOK_STYLES.find((s) => s.id === selectedStyle)?.label}
            </span>
            {selectedThemeCategories.map((id) => {
              const cat = THEME_CATEGORIES.find((c) => c.id === id);
              return (
                <span
                  key={id}
                  className='text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded'>
                  {cat?.emoji} {cat?.label}
                </span>
              );
            })}
            {selectedVisualCategories.map((id) => {
              const cat = VISUAL_CATEGORIES.find((c) => c.id === id);
              return (
                <span
                  key={id}
                  className='text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded'>
                  {cat?.emoji} {cat?.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import {
  Book,
  Sparkles,
  Download,
  RefreshCw,
  Coins,
  ShoppingCart,
  X,
  Loader2,
  Edit3,
  Wand2,
  Image as ImageIcon,
  Upload,
  Camera,
  User,
  Trash2,
  LogIn,
  LogOut,
  Shield,
  Settings,
  Type,
} from "lucide-react";

// Componentes locales
import BookViewer from "./BookViewer";
import StyleSelector from "./StyleSelector";
import TextCustomizer from "./TextCustomizer";
import GeneratingOverlay from "./GeneratingOverlay";
import DraftBookOverlay from "./DraftBookOverlay";

// Tipos
import {
  BookData,
  BookPage,
  CreditPack,
  ViewMode,
  BookStyle,
  BOOK_STYLES,
} from "./types";

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className='h-screen bg-background flex items-center justify-center'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      }>
      <EditorContent />
    </Suspense>
  );
}

function EditorContent() {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  // ============================================
  // ESTADOS
  // ============================================

  // Usuario
  const [credits, setCredits] = useState(0);
  const [loadingUser, setLoadingUser] = useState(true);

  // Creación de libro
  const [kidName, setKidName] = useState("");
  const [theme, setTheme] = useState("");
  const [bookStyle, setBookStyle] = useState<BookStyle>("cartoon");
  const [selectedThemeCategories, setSelectedThemeCategories] = useState<
    string[]
  >([]);
  const [selectedVisualCategories, setSelectedVisualCategories] = useState<
    string[]
  >([]);

  // Foto del niño
  const [kidPhoto, setKidPhoto] = useState<File | null>(null);
  const [kidPhotoPreview, setKidPhotoPreview] = useState<string | null>(null);
  const [characterDescription, setCharacterDescription] = useState<
    string | null
  >(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  // Libro
  const [book, setBook] = useState<BookData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("spread");

  // Edición de texto
  const [editingText, setEditingText] = useState<{
    pageNumber: number;
    text: string;
  } | null>(null);

  // UI
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("");
  const [generatingPhase, setGeneratingPhase] = useState<
    "story" | "images" | "finishing"
  >("story");
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showDraftOverlay, setShowDraftOverlay] = useState(false);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [downloadingPdf, setDownloadingPdf] = useState<
    "digital" | "print" | null
  >(null);
  const [activeTab, setActiveTab] = useState<"create" | "style" | "text">(
    "create"
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ============================================
  // EFECTOS
  // ============================================

  useEffect(() => {
    if (sessionStatus === "loading") return;
    fetchUserData();
    fetchCreditPacks();

    if (searchParams.get("success") === "true") {
      setTimeout(() => fetchUserData(), 1000);
    }
  }, [searchParams, sessionStatus, session?.user?.id]);

  // ============================================
  // FUNCIONES DE DATOS
  // ============================================

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      setCredits(data.credits || 0);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchCreditPacks = async () => {
    try {
      const res = await fetch("/api/stripe/checkout");
      const data = await res.json();
      setCreditPacks(data.packs || []);
    } catch (error) {
      console.error("Error loading packs:", error);
    }
  };

  // ============================================
  // MANEJADORES DE FOTO
  // ============================================

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      alert("Por favor, sube una imagen JPG, PNG, WebP o GIF");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("La imagen es demasiado grande. Máximo 10MB");
      return;
    }

    setKidPhoto(file);
    setKidPhotoPreview(URL.createObjectURL(file));
    setAnalyzingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/analyze-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.description) {
        setCharacterDescription(data.description);
      }
    } catch (error) {
      console.error("Error analyzing photo:", error);
      setCharacterDescription(
        "Un niño adorable con rasgos únicos que le hacen especial"
      );
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setKidPhoto(null);
    setKidPhotoPreview(null);
    setCharacterDescription(null);
  };

  // ============================================
  // GENERACIÓN DE HISTORIA (GRATIS - Solo textos)
  // ============================================

  const handleGenerateStory = async () => {
    if (!kidName.trim() || !theme.trim()) {
      alert("Por favor, introduce el nombre del niño y el tema de la historia");
      return;
    }

    setIsGenerating(true);
    setGeneratingStatus("Creando la historia...");
    setGeneratingPhase("story");
    setGeneratingProgress(10);

    try {
      // Crear libro
      const createRes = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kidName: kidName.trim(),
          theme: theme.trim(),
          style: bookStyle,
          categories: [...selectedThemeCategories, ...selectedVisualCategories],
          characterDescription: characterDescription || undefined,
        }),
      });

      const { book: newBook } = await createRes.json();

      if (!newBook) {
        throw new Error("No se pudo crear el libro");
      }

      setGeneratingProgress(30);
      setGeneratingStatus("Escribiendo la historia...");

      // Progreso visual
      const progressInterval = setInterval(() => {
        setGeneratingProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return Math.min(prev + 5, 90);
        });
      }, 1000);

      // Generar SOLO la historia (textos) - GRATIS
      const genRes = await fetch(`/api/books/${newBook.id}/generate-story`, {
        method: "POST",
      });

      clearInterval(progressInterval);

      const genData = await genRes.json();

      if (genData.error) {
        throw new Error(genData.error);
      }

      setGeneratingProgress(100);
      setGeneratingStatus("¡Historia lista!");

      await new Promise((resolve) => setTimeout(resolve, 500));

      setBook(genData.book);
      setCurrentPage(0);

      // Mostrar el overlay explicativo de draft
      setShowDraftOverlay(true);
    } catch (error) {
      console.error("Error generating story:", error);
      alert("Error al generar la historia. Por favor, inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
      setGeneratingStatus("");
    }
  };

  // ============================================
  // GENERACIÓN DE IMÁGENES (CUESTA 5 CRÉDITOS)
  // ============================================

  const handleGenerateImages = async () => {
    if (!book) return;

    // Verificar créditos con el API
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      const currentCredits = data.credits || 0;
      setCredits(currentCredits);

      if (currentCredits < 5) {
        setShowCreditsModal(true);
        return;
      }
    } catch (error) {
      console.error("Error checking credits:", error);
      alert("Error al verificar créditos. Inténtalo de nuevo.");
      return;
    }

    setIsGenerating(true);
    setGeneratingStatus("Creando ilustraciones...");
    setGeneratingPhase("images");
    setGeneratingProgress(10);

    try {
      // Progreso visual
      const progressInterval = setInterval(() => {
        setGeneratingProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return Math.min(prev + 3, 90);
        });
      }, 2000);

      // Generar imágenes - CUESTA CRÉDITOS
      const genRes = await fetch(`/api/books/${book.id}/generate-images`, {
        method: "POST",
      });

      clearInterval(progressInterval);

      const genData = await genRes.json();

      if (genData.needsCredits) {
        setShowCreditsModal(true);
        return;
      }

      if (genData.error) {
        throw new Error(genData.error);
      }

      setGeneratingPhase("finishing");
      setGeneratingStatus("¡Finalizando tu libro!");
      setGeneratingProgress(95);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setGeneratingProgress(100);

      setBook(genData.book);
      setCredits((prev) => prev - 5);
    } catch (error) {
      console.error("Error generating images:", error);
      alert(
        "Error al generar las ilustraciones. Por favor, inténtalo de nuevo."
      );
    } finally {
      setIsGenerating(false);
      setGeneratingStatus("");
    }
  };

  // ============================================
  // GENERACIÓN DE LIBRO COMPLETO (flujo legacy)
  // ============================================

  const handleGenerateBook = async () => {
    if (!kidName.trim() || !theme.trim()) {
      alert("Por favor, introduce el nombre del niño y el tema de la historia");
      return;
    }

    // Verificar créditos con el API
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      const currentCredits = data.credits || 0;
      setCredits(currentCredits);

      if (currentCredits < 5) {
        setShowCreditsModal(true);
        return;
      }
    } catch (error) {
      console.error("Error checking credits:", error);
      alert("Error al verificar créditos. Inténtalo de nuevo.");
      return;
    }

    setIsGenerating(true);
    setGeneratingStatus("Creando tu libro...");
    setGeneratingPhase("story");
    setGeneratingProgress(10);

    try {
      // Crear libro
      const createRes = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kidName: kidName.trim(),
          theme: theme.trim(),
          style: bookStyle,
          categories: [...selectedThemeCategories, ...selectedVisualCategories],
          characterDescription: characterDescription || undefined,
        }),
      });

      const { book: newBook } = await createRes.json();

      if (!newBook) {
        throw new Error("No se pudo crear el libro");
      }

      setGeneratingProgress(20);
      setGeneratingStatus("Escribiendo la historia...");

      // Progreso visual
      const progressInterval = setInterval(() => {
        setGeneratingProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          const increment = prev < 40 ? 8 : prev < 60 ? 4 : prev < 80 ? 2 : 1;
          return Math.min(prev + increment, 90);
        });
      }, 2000);

      setTimeout(() => {
        setGeneratingPhase("images");
        setGeneratingStatus("Creando ilustraciones mágicas...");
      }, 5000);

      // Generar contenido
      const genRes = await fetch(`/api/books/${newBook.id}/generate`, {
        method: "POST",
      });

      clearInterval(progressInterval);

      const genData = await genRes.json();

      if (genData.needsCredits) {
        setShowCreditsModal(true);
        return;
      }

      if (genData.error) {
        throw new Error(genData.error);
      }

      setGeneratingPhase("finishing");
      setGeneratingStatus("¡Finalizando tu libro!");
      setGeneratingProgress(95);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setGeneratingProgress(100);

      setBook(genData.book);
      setCredits((prev) => prev - 5);
      setCurrentPage(0);
    } catch (error) {
      console.error("Error generating book:", error);
      alert("Error al generar el libro. Por favor, inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
      setGeneratingStatus("");
    }
  };

  // ============================================
  // REGENERACIÓN DE PÁGINA
  // ============================================

  const handleRegeneratePage = async (pageNumber: number) => {
    if (!book) return;

    const page = book.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return;

    setIsRegenerating(true);

    try {
      const res = await fetch(
        `/api/books/${book.id}/pages/${pageNumber}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customPrompt: "" }),
        }
      );

      const data = await res.json();

      if (data.needsCredits) {
        setShowCreditsModal(true);
        return;
      }

      if (data.page) {
        setBook({
          ...book,
          pages: book.pages.map((p) =>
            p.pageNumber === pageNumber ? data.page : p
          ),
        });
        setCredits((prev) => prev - 1);
      }
    } catch (error) {
      console.error("Error regenerating page:", error);
      alert("Error al regenerar la página");
    } finally {
      setIsRegenerating(false);
    }
  };

  // ============================================
  // GUARDAR TEXTO
  // ============================================

  const handleSaveText = async () => {
    if (!book || !editingText) return;

    try {
      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber: editingText.pageNumber,
          text: editingText.text,
        }),
      });

      if (res.ok) {
        setBook({
          ...book,
          pages: book.pages.map((p) =>
            p.pageNumber === editingText.pageNumber
              ? { ...p, text: editingText.text }
              : p
          ),
        });
      }
    } catch (error) {
      console.error("Error saving text:", error);
    } finally {
      setEditingText(null);
    }
  };

  // Función para actualizar texto de una página desde el PageEditor
  const handleUpdatePageText = async (pageNumber: number, text: string) => {
    if (!book) return;

    // Actualizar localmente primero
    setBook({
      ...book,
      pages: book.pages.map((p) =>
        p.pageNumber === pageNumber ? { ...p, text } : p
      ),
    });

    // Guardar en el servidor
    try {
      await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber,
          text,
        }),
      });
    } catch (error) {
      console.error("Error saving text:", error);
    }
  };

  // ============================================
  // ACTUALIZAR PÁGINA (para personalización de texto)
  // ============================================

  const handleUpdatePage = async (
    pageNumber: number,
    updates: Partial<BookPage>
  ) => {
    if (!book) return;

    // Actualizar localmente primero
    setBook({
      ...book,
      pages: book.pages.map((p) =>
        p.pageNumber === pageNumber ? { ...p, ...updates } : p
      ),
    });

    // TODO: Guardar en el servidor cuando tengamos el endpoint
  };

  // ============================================
  // DESCARGA PDF
  // ============================================

  const handleDownloadPDF = async (type: "digital" | "print") => {
    if (!book) return;

    setDownloadingPdf(type);

    try {
      const res = await fetch(
        `/api/books/${book.id}/pdf/download?type=${type}`
      );

      if (!res.ok) throw new Error("Error downloading PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${book.title || "libro"}-${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Error al descargar el PDF");
    } finally {
      setDownloadingPdf(null);
    }
  };

  // ============================================
  // COMPRA DE CRÉDITOS
  // ============================================

  const handleBuyCredits = async (packId: string) => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert("Error al crear el checkout");
    }
  };

  // ============================================
  // PÁGINA SELECCIONADA
  // ============================================

  const selectedPageData =
    book?.pages.find((p) => p.pageNumber === selectedPage) || null;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className='h-screen flex flex-col overflow-hidden bg-bg'>
      {/* Header */}
      <header className='flex-shrink-0 bg-bg-light border-b border-border'>
        <div className='px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            {/* Botón menú móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className='lg:hidden p-2 rounded-lg bg-surface border border-border hover:border-primary transition-colors'>
              <Settings className='w-5 h-5' />
            </button>
            <Link href='/' className='flex items-center gap-2'>
              <div className='w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center'>
                <Book className='w-4 h-4 sm:w-5 sm:h-5 text-white' />
              </div>
              <span className='font-bold hidden sm:inline'>
                <span className='text-primary'>Libros</span>
                <span className='text-secondary'>IA</span>
              </span>
            </Link>
          </div>

          <div className='flex items-center gap-2 sm:gap-3'>
            {/* Créditos */}
            <button
              onClick={() => setShowCreditsModal(true)}
              className='flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-surface border border-border hover:border-primary transition-colors'>
              <Coins className='w-4 h-4 sm:w-5 sm:h-5 text-primary' />
              <span className='font-semibold text-sm sm:text-base'>
                {loadingUser ? "..." : credits}
              </span>
              <span className='text-text-muted text-xs sm:text-sm hidden sm:inline'>
                créditos
              </span>
            </button>

            {/* Usuario */}
            {sessionStatus === "loading" ? (
              <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface animate-pulse' />
            ) : session?.user ? (
              <div className='flex items-center gap-1.5 sm:gap-2'>
                {session.user.role === "ADMIN" && (
                  <Link
                    href='/admin'
                    className='p-1.5 sm:p-2 rounded-lg bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-colors'
                    title='Panel Admin'>
                    <Shield className='w-4 h-4 sm:w-5 sm:h-5' />
                  </Link>
                )}
                <Link
                  href='/perfil'
                  className='flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-surface border border-border hover:border-primary transition-colors'>
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "Avatar"}
                      className='w-6 h-6 sm:w-7 sm:h-7 rounded-full'
                    />
                  ) : (
                    <div className='w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/20 flex items-center justify-center'>
                      <User className='w-3 h-3 sm:w-4 sm:h-4 text-primary' />
                    </div>
                  )}
                  <span className='text-xs sm:text-sm font-medium hidden md:inline max-w-[80px] truncate'>
                    {session.user.name || session.user.email?.split("@")[0]}
                  </span>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className='p-1.5 sm:p-2 rounded-lg bg-surface border border-border hover:border-red-500 hover:text-red-500 transition-colors'
                  title='Cerrar sesión'>
                  <LogOut className='w-4 h-4 sm:w-5 sm:h-5' />
                </button>
              </div>
            ) : (
              <Link
                href='/login'
                className='flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm sm:text-base transition-colors'>
                <LogIn className='w-4 h-4 sm:w-5 sm:h-5' />
                <span className='hidden xs:inline'>Entrar</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className='flex-1 flex overflow-hidden relative'>
        {/* Overlay para cerrar sidebar en móvil */}
        {mobileMenuOpen && (
          <div
            className='fixed inset-0 bg-black/50 z-40 lg:hidden'
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Panel Izquierdo - Sidebar con scroll */}
        <aside
          className={`
            fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
            w-[85vw] sm:w-80 flex-shrink-0 bg-bg-light border-r border-border flex flex-col
            transform transition-transform duration-300 ease-in-out
            ${
              mobileMenuOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }
            lg:transform-none
          `}>
          {/* Header del sidebar móvil */}
          <div className='flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border lg:hidden'>
            <span className='font-bold text-lg'>Opciones</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className='p-2 rounded-lg hover:bg-surface transition-colors'>
              <X className='w-5 h-5' />
            </button>
          </div>

          {/* Tabs del sidebar */}
          <div className='flex-shrink-0 flex border-b border-border'>
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "create"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-muted hover:text-text"
              }`}>
              <Wand2 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
              Crear
            </button>
            <button
              onClick={() => setActiveTab("style")}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "style"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-muted hover:text-text"
              }`}>
              <Settings className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
              Estilo
            </button>
            <button
              onClick={() => setActiveTab("text")}
              disabled={!book}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "text"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-muted hover:text-text"
              } ${!book ? "opacity-50 cursor-not-allowed" : ""}`}>
              <Type className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
              Texto
            </button>
          </div>

          {/* Contenido del sidebar con scroll */}
          <div className='flex-1 overflow-y-auto p-3 sm:p-4'>
            {activeTab === "create" && (
              <div className='space-y-4 sm:space-y-6'>
                {/* Nombre del protagonista */}
                <div>
                  <label className='block text-xs sm:text-sm font-medium text-text-muted mb-1.5 sm:mb-2'>
                    Nombre del protagonista
                  </label>
                  <input
                    type='text'
                    value={kidName}
                    onChange={(e) => setKidName(e.target.value)}
                    placeholder='Ej: Sofía'
                    className='w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-surface border border-border rounded-lg sm:rounded-xl text-sm sm:text-base text-text placeholder-text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all'
                  />
                </div>

                {/* Tema */}
                <div>
                  <label className='block text-xs sm:text-sm font-medium text-text-muted mb-1.5 sm:mb-2'>
                    Tema de la historia
                  </label>
                  <textarea
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder='Ej: Una aventura en el espacio buscando estrellas mágicas'
                    rows={3}
                    className='w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-surface border border-border rounded-lg sm:rounded-xl text-sm sm:text-base text-text placeholder-text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none'
                  />
                </div>

                {/* Foto del niño */}
                <div>
                  <label className='block text-xs sm:text-sm font-medium text-text-muted mb-1.5 sm:mb-2'>
                    <Camera className='w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1' />
                    Foto del protagonista (opcional)
                  </label>

                  {!kidPhotoPreview ? (
                    <label className='flex flex-col items-center justify-center w-full h-28 sm:h-32 border-2 border-dashed border-border rounded-lg sm:rounded-xl cursor-pointer hover:border-primary transition-colors'>
                      <Upload className='w-6 h-6 sm:w-8 sm:h-8 text-text-muted mb-1.5 sm:mb-2' />
                      <span className='text-xs sm:text-sm text-text-muted'>
                        Subir foto
                      </span>
                      <input
                        type='file'
                        accept='image/*'
                        onChange={handlePhotoUpload}
                        className='hidden'
                      />
                    </label>
                  ) : (
                    <div className='relative'>
                      <img
                        src={kidPhotoPreview}
                        alt='Preview'
                        className='w-full h-28 sm:h-32 object-cover rounded-lg sm:rounded-xl'
                      />
                      {analyzingPhoto && (
                        <div className='absolute inset-0 bg-black/50 rounded-lg sm:rounded-xl flex items-center justify-center'>
                          <div className='text-white text-center'>
                            <Loader2 className='w-5 h-5 sm:w-6 sm:h-6 animate-spin mx-auto mb-1.5 sm:mb-2' />
                            <span className='text-xs'>Analizando...</span>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={handleRemovePhoto}
                        className='absolute top-2 right-2 p-1 sm:p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600'>
                        <Trash2 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                      </button>
                    </div>
                  )}

                  {characterDescription && (
                    <p className='mt-1.5 sm:mt-2 text-xs text-text-muted bg-surface p-2 rounded-lg'>
                      ✨ {characterDescription}
                    </p>
                  )}
                </div>

                {/* Botones de Generación - Flujo de 2 pasos */}
                {!book ? (
                  // PASO 1: Generar historia (GRATIS)
                  <div className='space-y-2 sm:space-y-3'>
                    <button
                      onClick={() => {
                        handleGenerateStory();
                        setMobileMenuOpen(false);
                      }}
                      disabled={
                        isGenerating || !kidName.trim() || !theme.trim()
                      }
                      className='w-full py-3 sm:py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base'>
                      {isGenerating ? (
                        <>
                          <Loader2 className='w-4 h-4 sm:w-5 sm:h-5 animate-spin' />
                          <span className='truncate'>{generatingStatus}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className='w-4 h-4 sm:w-5 sm:h-5' />
                          Crear historia (GRATIS)
                        </>
                      )}
                    </button>
                    <p className='text-xs text-text-muted text-center'>
                      ✨ Genera los textos gratis. Podrás editarlos antes de
                      añadir ilustraciones.
                    </p>
                  </div>
                ) : book.status === "DRAFT" ? (
                  // PASO 2: Libro en borrador - Puede editar textos y generar imágenes
                  <div className='space-y-2 sm:space-y-3'>
                    <div className='p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg sm:rounded-xl'>
                      <p className='text-xs sm:text-sm text-amber-600 font-medium mb-1'>
                        📝 Borrador listo
                      </p>
                      <p className='text-xs text-text-muted'>
                        Edita los textos haciendo doble clic en las miniaturas.
                        Cuando estés satisfecho, genera las ilustraciones.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        handleGenerateImages();
                        setMobileMenuOpen(false);
                      }}
                      disabled={isGenerating}
                      className='w-full py-3 sm:py-4 bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base'>
                      {isGenerating ? (
                        <>
                          <Loader2 className='w-4 h-4 sm:w-5 sm:h-5 animate-spin' />
                          <span className='truncate'>{generatingStatus}</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className='w-4 h-4 sm:w-5 sm:h-5' />
                          Generar ilustraciones (5 créditos)
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setBook(null)}
                      className='w-full py-2 text-text-muted hover:text-red-500 text-xs sm:text-sm transition-colors'>
                      Descartar y empezar de nuevo
                    </button>
                  </div>
                ) : (
                  // COMPLETADO: Mostrar opciones de descarga y nuevo libro
                  <div className='space-y-2 sm:space-y-3'>
                    <div className='p-2.5 sm:p-3 bg-green-500/10 border border-green-500/30 rounded-lg sm:rounded-xl'>
                      <p className='text-xs sm:text-sm text-green-600 font-medium'>
                        ✅ ¡Libro completado!
                      </p>
                    </div>
                    <button
                      onClick={() => setBook(null)}
                      className='w-full py-2.5 sm:py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base'>
                      <Sparkles className='w-4 h-4 sm:w-5 sm:h-5' />
                      Crear nuevo libro
                    </button>
                  </div>
                )}

                {/* Descargas PDF */}
                {book && book.status === "COMPLETED" && (
                  <div className='space-y-2 pt-3 sm:pt-4 border-t border-border'>
                    <h4 className='text-xs sm:text-sm font-medium text-text-muted mb-1.5 sm:mb-2'>
                      <Download className='w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1' />
                      Descargar PDF
                    </h4>
                    <button
                      onClick={() => handleDownloadPDF("digital")}
                      disabled={downloadingPdf !== null}
                      className='w-full py-2 bg-surface border border-border hover:border-primary text-text font-medium rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm'>
                      {downloadingPdf === "digital" ? (
                        <Loader2 className='w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin' />
                      ) : (
                        <Download className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                      )}
                      PDF
                    </button>
                    <button
                      onClick={() => handleDownloadPDF("print")}
                      disabled={downloadingPdf !== null}
                      className='w-full py-2 bg-surface border border-border hover:border-primary text-text font-medium rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm'>
                      {downloadingPdf === "print" ? (
                        <Loader2 className='w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin' />
                      ) : (
                        <ImageIcon className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                      )}
                      PDF formato impresión
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "style" && (
              <StyleSelector
                selectedStyle={bookStyle}
                onStyleChange={setBookStyle}
                selectedThemeCategories={selectedThemeCategories}
                onThemeCategoriesChange={setSelectedThemeCategories}
                selectedVisualCategories={selectedVisualCategories}
                onVisualCategoriesChange={setSelectedVisualCategories}
              />
            )}

            {activeTab === "text" && selectedPageData && (
              <TextCustomizer
                page={selectedPageData}
                onUpdatePage={(updates) =>
                  handleUpdatePage(selectedPageData.pageNumber, updates)
                }
              />
            )}

            {activeTab === "text" && !selectedPage && book && (
              <div className='space-y-4'>
                <div className='text-center text-text-muted py-4'>
                  <Edit3 className='w-10 h-10 mx-auto mb-3 opacity-50' />
                  <p className='text-sm'>
                    Selecciona una página para editar el texto
                  </p>
                </div>

                {/* Grid de páginas para seleccionar */}
                <div className='grid grid-cols-3 gap-2'>
                  {book.pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setSelectedPage(page.pageNumber)}
                      className='relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all group'>
                      {page.imageUrl ? (
                        <img
                          src={page.imageUrl}
                          alt={`Página ${page.pageNumber}`}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <div className='w-full h-full bg-surface flex items-center justify-center'>
                          <span className='text-xs text-text-muted'>
                            {page.pageNumber}
                          </span>
                        </div>
                      )}
                      <div className='absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center'>
                        <Edit3 className='w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity' />
                      </div>
                      <div className='absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] text-center py-0.5'>
                        {page.pageNumber === 1
                          ? "Portada"
                          : `Pág ${page.pageNumber}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "text" && !book && (
              <div className='text-center text-text-muted py-8'>
                <Edit3 className='w-12 h-12 mx-auto mb-4 opacity-50' />
                <p>Primero genera un libro para editar el texto</p>
              </div>
            )}
          </div>

          {/* Panel de página seleccionada */}
          {selectedPage !== null && book && (
            <div className='flex-shrink-0 p-4 border-t border-border bg-surface'>
              <div className='flex items-center justify-between mb-3'>
                <span className='text-sm font-medium'>
                  Página {selectedPage}
                </span>
                <button
                  onClick={() => setSelectedPage(null)}
                  className='p-1 hover:bg-bg rounded'>
                  <X className='w-4 h-4' />
                </button>
              </div>
              <button
                onClick={() => handleRegeneratePage(selectedPage)}
                disabled={isRegenerating}
                className='w-full py-2 bg-secondary hover:bg-secondary/80 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2'>
                {isRegenerating ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <RefreshCw className='w-4 h-4' />
                )}
                Regenerar (1 crédito)
              </button>
            </div>
          )}
        </aside>

        {/* Área Principal - Visualización del Libro */}
        <main className='flex-1 flex flex-col overflow-hidden bg-bg'>
          {!book ? (
            isGenerating ? (
              <div className='flex-1 flex items-center justify-center'>
                <GeneratingOverlay
                  kidName={kidName}
                  theme={theme}
                  phase={generatingPhase}
                  progress={generatingProgress}
                  status={generatingStatus}
                />
              </div>
            ) : (
              <div className='flex-1 flex items-center justify-center'>
                <div className='text-center'>
                  <div className='w-32 h-32 mx-auto mb-6 rounded-2xl bg-surface flex items-center justify-center'>
                    <Book className='w-16 h-16 text-text-muted' />
                  </div>
                  <h3 className='text-xl font-bold mb-2'>
                    Crea tu primer libro
                  </h3>
                  <p className='text-text-muted max-w-md'>
                    Introduce el nombre del protagonista y el tema para generar
                    una historia única con ilustraciones mágicas.
                  </p>
                </div>
              </div>
            )
          ) : (
            <BookViewer
              book={book}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              selectedPage={selectedPage}
              onSelectPage={(page) => {
                setSelectedPage(page);
                if (page !== null) setActiveTab("text");
              }}
              editingText={editingText}
              onEditText={setEditingText}
              onSaveText={handleSaveText}
              onUpdatePageText={handleUpdatePageText}
              onGenerateImages={handleGenerateImages}
              credits={credits}
            />
          )}
        </main>
      </div>

      {/* Overlay explicativo cuando el libro está en DRAFT (historia generada, sin imágenes) */}
      <DraftBookOverlay
        kidName={kidName || book?.kidName || ""}
        theme={theme || book?.theme || ""}
        pageCount={book?.pages.length || 12}
        credits={credits}
        onGenerateImages={() => {
          setShowDraftOverlay(false);
          handleGenerateImages();
        }}
        onEditTexts={() => {
          setShowDraftOverlay(false);
          // El usuario puede hacer clic en las páginas para editar
        }}
        isVisible={showDraftOverlay}
        onClose={() => setShowDraftOverlay(false)}
      />

      {/* Modal de Créditos */}
      <AnimatePresence>
        {showCreditsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4'
            onClick={() => setShowCreditsModal(false)}>
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className='bg-bg-light rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full sm:max-w-md border-t sm:border border-border max-h-[85vh] overflow-y-auto'
              onClick={(e) => e.stopPropagation()}>
              <div className='flex items-center justify-between mb-4 sm:mb-6'>
                <h2 className='text-xl sm:text-2xl font-bold'>
                  Comprar Créditos
                </h2>
                <button
                  onClick={() => setShowCreditsModal(false)}
                  className='p-2 hover:bg-surface rounded-lg transition-colors'>
                  <X className='w-5 h-5' />
                </button>
              </div>

              <p className='text-sm sm:text-base text-text-muted mb-4 sm:mb-6'>
                Tienes <span className='text-primary font-bold'>{credits}</span>{" "}
                créditos. Compra más para seguir creando libros.
              </p>

              <div className='space-y-3 sm:space-y-4'>
                {creditPacks.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => handleBuyCredits(pack.id)}
                    className={`w-full p-3 sm:p-4 rounded-xl text-left transition-all ${
                      pack.popular
                        ? "bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary"
                        : "bg-surface border border-border hover:border-primary"
                    }`}>
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='font-bold text-sm sm:text-base'>
                            {pack.name}
                          </span>
                          {pack.popular && (
                            <span className='px-1.5 sm:px-2 py-0.5 bg-primary text-white text-[10px] sm:text-xs font-bold rounded'>
                              Popular
                            </span>
                          )}
                        </div>
                        <p className='text-xs sm:text-sm text-text-muted'>
                          {pack.description}
                        </p>
                      </div>
                      <div className='text-right'>
                        <div className='text-lg sm:text-xl font-bold'>
                          {pack.priceFormatted}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className='mt-4 sm:mt-6 text-center text-xs sm:text-sm text-text-muted'>
                <ShoppingCart className='w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1' />
                Pago seguro con Stripe
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

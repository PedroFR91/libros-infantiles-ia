"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import {
  Book,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  RefreshCw,
  Coins,
  ShoppingCart,
  X,
  Check,
  Loader2,
  Edit3,
  Wand2,
  FileText,
  Image as ImageIcon,
  Upload,
  Camera,
  User,
  Trash2,
  LogIn,
  LogOut,
  Shield,
} from "lucide-react";

// Types
interface BookPage {
  id: string;
  pageNumber: number;
  text: string | null;
  imagePrompt: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

interface BookData {
  id: string;
  title: string | null;
  kidName: string;
  theme: string;
  status: "DRAFT" | "GENERATING" | "COMPLETED" | "ERROR";
  pages: BookPage[];
}

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceFormatted: string;
  description: string;
  popular?: boolean;
}

// Categories
const CATEGORIES = [
  { id: "bombero", label: "Bombero", emoji: "🚒" },
  { id: "policia", label: "Policía", emoji: "👮" },
  { id: "explorador", label: "Explorador", emoji: "🧭" },
  { id: "astronauta", label: "Astronauta", emoji: "🚀" },
  { id: "veterinaria", label: "Veterinaria", emoji: "🐾" },
  { id: "pirata", label: "Pirata", emoji: "🏴‍☠️" },
  { id: "princesa", label: "Princesa", emoji: "👑" },
  { id: "dinosaurios", label: "Dinosaurios", emoji: "🦕" },
  { id: "futbol", label: "Fútbol", emoji: "⚽" },
  { id: "espacio", label: "Espacio", emoji: "🌟" },
  { id: "magia", label: "Magia", emoji: "✨" },
  { id: "animales", label: "Animales", emoji: "🦁" },
  { id: "coches", label: "Coches", emoji: "🚗" },
  { id: "oceano", label: "Océano", emoji: "🌊" },
  { id: "superheroe", label: "Superhéroe", emoji: "🦸" },
  { id: "hadas", label: "Hadas", emoji: "🧚" },
];

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen bg-background flex items-center justify-center'>
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

  // User state
  const [credits, setCredits] = useState(0);
  const [loadingUser, setLoadingUser] = useState(true);

  // Book creation state
  const [kidName, setKidName] = useState("");
  const [theme, setTheme] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Book state
  const [book, setBook] = useState<BookData | null>(null);
  const [currentSpread, setCurrentSpread] = useState(0); // 0 = pages 1-2, 1 = pages 3-4, etc
  const [selectedPage, setSelectedPage] = useState<number | null>(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("");
  const [generatingPhase, setGeneratingPhase] = useState<
    "story" | "images" | "finishing"
  >("story");
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [editingText, setEditingText] = useState<{
    pageNumber: number;
    text: string;
  } | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState<
    "digital" | "print" | null
  >(null);

  // Photo upload state
  const [kidPhoto, setKidPhoto] = useState<File | null>(null);
  const [kidPhotoPreview, setKidPhotoPreview] = useState<string | null>(null);
  const [characterDescription, setCharacterDescription] = useState<
    string | null
  >(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  // Load user data - esperar a que la sesión esté determinada
  useEffect(() => {
    // No cargar hasta que sepamos el estado de la sesión
    if (sessionStatus === "loading") return;

    fetchUserData();
    fetchCreditPacks();

    // Check for success from Stripe
    if (searchParams.get("success") === "true") {
      // Pequeño delay para asegurar que el webhook procesó el pago
      setTimeout(() => fetchUserData(), 1000);
    }
  }, [searchParams, sessionStatus, session?.user?.id]);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      console.log("Credits loaded:", data.credits, "User:", data.user?.email);
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

  // Handle photo upload and analysis
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      alert("Por favor, sube una imagen JPG, PNG, WebP o GIF");
      return;
    }

    // Validate file size (max 10MB)
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

      if (data.error) {
        throw new Error(data.error);
      }

      setCharacterDescription(data.characterDescription);
    } catch (error) {
      console.error("Error analyzing photo:", error);
      alert(
        "Error al analizar la foto. Puedes continuar sin ella o intentar con otra imagen."
      );
      setCharacterDescription(null);
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setKidPhoto(null);
    setKidPhotoPreview(null);
    setCharacterDescription(null);
  };

  // Create and generate book
  const handleGenerateBook = async () => {
    if (!kidName.trim() || !theme.trim()) {
      alert("Por favor, introduce el nombre del niño y el tema de la historia");
      return;
    }

    // Si aún estamos cargando, esperar
    if (loadingUser || sessionStatus === "loading") {
      console.log("Esperando a cargar créditos...");
      return;
    }

    console.log("Credits check:", credits, "loadingUser:", loadingUser);
    if (credits < 5) {
      setShowCreditsModal(true);
      return;
    }

    setIsGenerating(true);
    setGeneratingStatus("Creando tu libro...");
    setGeneratingPhase("story");
    setGeneratingProgress(10);

    try {
      // Create book
      const createRes = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kidName: kidName.trim(),
          theme: theme.trim(),
          categories: selectedCategories,
          characterDescription: characterDescription || undefined,
        }),
      });

      const { book: newBook } = await createRes.json();

      if (!newBook) {
        throw new Error("No se pudo crear el libro");
      }

      setGeneratingProgress(20);
      setGeneratingStatus("Escribiendo la historia...");

      // Simular progreso visual mientras genera
      const progressInterval = setInterval(() => {
        setGeneratingProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          // Progreso más lento conforme avanza
          const increment = prev < 40 ? 8 : prev < 60 ? 4 : prev < 80 ? 2 : 1;
          return Math.min(prev + increment, 90);
        });
      }, 2000);

      // Cambiar fase después de un tiempo
      setTimeout(() => {
        setGeneratingPhase("images");
        setGeneratingStatus("Creando ilustraciones mágicas...");
      }, 5000);

      // Generate content
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

      // Pequeño delay para mostrar el mensaje final
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setGeneratingProgress(100);

      setBook(genData.book);
      setCredits((prev) => prev - 5);
      setCurrentSpread(0);
    } catch (error) {
      console.error("Error generating book:", error);
      alert("Error al generar el libro. Por favor, inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
      setGeneratingStatus("");
    }
  };

  // Regenerate page
  const handleRegeneratePage = async (pageNumber: number) => {
    if (!book || credits < 1) {
      setShowCreditsModal(true);
      return;
    }

    setIsRegenerating(true);

    try {
      const res = await fetch(
        `/api/books/${book.id}/pages/${pageNumber}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customPrompt: customPrompt || undefined,
            regenerateImage: true,
            regenerateText: true,
          }),
        }
      );

      const data = await res.json();

      if (data.needsCredits) {
        setShowCreditsModal(true);
        return;
      }

      if (data.page) {
        setBook((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pages: prev.pages.map((p) =>
              p.pageNumber === pageNumber ? { ...p, ...data.page } : p
            ),
          };
        });
        setCredits((prev) => prev - 1);
        setCustomPrompt("");
      }
    } catch (error) {
      console.error("Error regenerating page:", error);
      alert("Error al regenerar la página");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Save text edit
  const handleSaveText = async () => {
    if (!book || !editingText) return;

    try {
      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: [
            { pageNumber: editingText.pageNumber, text: editingText.text },
          ],
        }),
      });

      const data = await res.json();

      if (data.book) {
        setBook(data.book);
      }
    } catch (error) {
      console.error("Error saving text:", error);
    } finally {
      setEditingText(null);
    }
  };

  // Download PDF
  const handleDownloadPDF = async (type: "digital" | "print") => {
    if (!book) return;

    setDownloadingPdf(type);

    try {
      // First generate PDF
      await fetch(`/api/books/${book.id}/pdf?type=${type}`, {
        method: "POST",
      });

      // Then download
      const link = document.createElement("a");
      link.href = `/api/books/${book.id}/pdf/download?type=${type}`;
      link.download = `${book.kidName}-libro-${type}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Error al descargar el PDF");
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Buy credits
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

  // Toggle category
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Get current pages for spread view
  const getCurrentPages = () => {
    if (!book?.pages) return { left: null, right: null };
    const leftIndex = currentSpread * 2;
    const rightIndex = leftIndex + 1;
    return {
      left: book.pages[leftIndex] || null,
      right: book.pages[rightIndex] || null,
    };
  };

  const { left: leftPage, right: rightPage } = getCurrentPages();
  const totalSpreads = book?.pages ? Math.ceil(book.pages.length / 2) : 0;

  return (
    <div className='min-h-screen bg-bg flex flex-col'>
      {/* Header */}
      <header className='flex-shrink-0 bg-bg-light border-b border-border'>
        <div className='px-4 py-3 flex items-center justify-between'>
          <Link href='/' className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-lg bg-primary flex items-center justify-center'>
              <Book className='w-5 h-5 text-white' />
            </div>
            <span className='font-bold'>
              <span className='text-primary'>Libros</span>
              <span className='text-secondary'>IA</span>
            </span>
          </Link>

          <div className='flex items-center gap-3'>
            {/* Credits */}
            <button
              onClick={() => setShowCreditsModal(true)}
              className='flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border hover:border-primary transition-colors'>
              <Coins className='w-5 h-5 text-primary' />
              <span className='font-semibold'>
                {loadingUser ? "..." : credits}
              </span>
              <span className='text-text-muted text-sm hidden sm:inline'>
                créditos
              </span>
            </button>

            {/* User Menu */}
            {sessionStatus === "loading" ? (
              <div className='w-10 h-10 rounded-full bg-surface animate-pulse' />
            ) : session?.user ? (
              <div className='flex items-center gap-2'>
                {/* Admin Badge */}
                {session.user.role === "ADMIN" && (
                  <Link
                    href='/admin'
                    className='p-2 rounded-lg bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition-colors'
                    title='Panel Admin'>
                    <Shield className='w-5 h-5' />
                  </Link>
                )}

                {/* User Avatar */}
                <div className='flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border'>
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "Avatar"}
                      className='w-7 h-7 rounded-full'
                    />
                  ) : (
                    <div className='w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center'>
                      <User className='w-4 h-4 text-primary' />
                    </div>
                  )}
                  <span className='text-sm font-medium hidden sm:inline max-w-[100px] truncate'>
                    {session.user.name || session.user.email?.split("@")[0]}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className='p-2 rounded-lg bg-surface border border-border hover:border-red-500 hover:text-red-500 transition-colors'
                  title='Cerrar sesión'>
                  <LogOut className='w-5 h-5' />
                </button>
              </div>
            ) : (
              <Link
                href='/login'
                className='flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-colors'>
                <LogIn className='w-5 h-5' />
                <span className='hidden sm:inline'>Iniciar sesión</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className='flex-1 flex overflow-hidden'>
        {/* Left Panel - Inputs */}
        <aside className='w-80 flex-shrink-0 bg-bg-light border-r border-border overflow-y-auto'>
          <div className='p-4 space-y-6'>
            <div>
              <h2 className='text-lg font-bold mb-4 flex items-center gap-2'>
                <Wand2 className='w-5 h-5 text-primary' />
                Crear Libro
              </h2>

              {/* Kid Name */}
              <div className='mb-4'>
                <label className='block text-sm font-medium text-text-muted mb-2'>
                  Nombre del protagonista
                </label>
                <input
                  type='text'
                  value={kidName}
                  onChange={(e) => setKidName(e.target.value)}
                  placeholder='Ej: Sofía'
                  className='w-full px-4 py-3 bg-surface border border-border rounded-xl text-text placeholder-text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all'
                  disabled={isGenerating}
                />
              </div>

              {/* Kid Photo - NEW */}
              <div className='mb-4'>
                <label className='block text-sm font-medium text-text-muted mb-2'>
                  Foto del niño/a (opcional)
                  <span className='block text-xs text-text-muted/70 mt-1'>
                    El personaje se parecerá a la foto
                  </span>
                </label>

                {kidPhotoPreview ? (
                  <div className='relative'>
                    <div className='relative w-full aspect-square max-w-[150px] mx-auto rounded-xl overflow-hidden border-2 border-primary'>
                      <img
                        src={kidPhotoPreview}
                        alt='Foto del niño'
                        className='w-full h-full object-cover'
                      />
                      {analyzingPhoto && (
                        <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                          <div className='text-center text-white'>
                            <Loader2 className='w-6 h-6 animate-spin mx-auto mb-1' />
                            <span className='text-xs'>Analizando...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {characterDescription && !analyzingPhoto && (
                      <div className='mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg'>
                        <div className='flex items-center gap-1 text-green-500 text-xs font-medium mb-1'>
                          <Check className='w-3 h-3' />
                          Características detectadas
                        </div>
                        <p className='text-xs text-text-muted line-clamp-2'>
                          {characterDescription}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleRemovePhoto}
                      disabled={isGenerating || analyzingPhoto}
                      className='absolute top-1 right-1 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50'>
                      <Trash2 className='w-3 h-3' />
                    </button>
                  </div>
                ) : (
                  <label className='block cursor-pointer'>
                    <div className='w-full py-6 border-2 border-dashed border-border hover:border-primary rounded-xl transition-colors flex flex-col items-center justify-center gap-2 bg-surface/50'>
                      <div className='w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center'>
                        <Camera className='w-6 h-6 text-primary' />
                      </div>
                      <span className='text-sm text-text-muted'>
                        Subir foto
                      </span>
                      <span className='text-xs text-text-muted/70'>
                        JPG, PNG, WebP (máx 10MB)
                      </span>
                    </div>
                    <input
                      type='file'
                      accept='image/jpeg,image/png,image/webp,image/gif'
                      onChange={handlePhotoUpload}
                      disabled={isGenerating}
                      className='hidden'
                    />
                  </label>
                )}
              </div>

              {/* Theme */}
              <div className='mb-4'>
                <label className='block text-sm font-medium text-text-muted mb-2'>
                  Tema de la historia
                </label>
                <textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder='Ej: Una aventura en el espacio buscando estrellas mágicas'
                  rows={3}
                  className='w-full px-4 py-3 bg-surface border border-border rounded-xl text-text placeholder-text-muted focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none'
                  disabled={isGenerating}
                />
              </div>

              {/* Categories */}
              <div className='mb-6'>
                <label className='block text-sm font-medium text-text-muted mb-2'>
                  Categorías (opcional)
                </label>
                <div className='flex flex-wrap gap-2'>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      disabled={isGenerating}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                        selectedCategories.includes(cat.id)
                          ? "bg-primary text-white"
                          : "bg-surface border border-border hover:border-primary"
                      }`}>
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateBook}
                disabled={isGenerating || !kidName.trim() || !theme.trim() || loadingUser || sessionStatus === "loading"}
                className='w-full py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2'>
                {isGenerating ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    {generatingStatus}
                  </>
                ) : loadingUser || sessionStatus === "loading" ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    Cargando...
                  </>
                ) : (
                  <>
                    <Sparkles className='w-5 h-5' />
                    Generar libro (5 créditos)
                  </>
                )}
              </button>
            </div>

            {/* Page Editor Panel (when page selected) */}
            {selectedPage !== null && book && (
              <div className='pt-6 border-t border-border'>
                <h3 className='font-bold mb-4 flex items-center gap-2'>
                  <Edit3 className='w-4 h-4' />
                  Página {selectedPage}
                </h3>

                {/* Custom prompt for regeneration */}
                <div className='mb-4'>
                  <label className='block text-sm font-medium text-text-muted mb-2'>
                    Instrucción personalizada (opcional)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder='Ej: Haz que el niño esté más feliz'
                    rows={2}
                    className='w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder-text-muted focus:border-primary outline-none resize-none'
                  />
                </div>

                <button
                  onClick={() => handleRegeneratePage(selectedPage)}
                  disabled={isRegenerating}
                  className='w-full py-3 bg-surface border border-border hover:border-primary text-text font-semibold rounded-xl transition-all flex items-center justify-center gap-2'>
                  {isRegenerating ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      Regenerando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className='w-4 h-4' />
                      Regenerar página (1 crédito)
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedPage(null)}
                  className='w-full py-2 mt-2 text-text-muted hover:text-text text-sm transition-colors'>
                  Cancelar selección
                </button>
              </div>
            )}

            {/* Download buttons */}
            {book?.status === "COMPLETED" && (
              <div className='pt-6 border-t border-border space-y-3'>
                <h3 className='font-bold mb-4 flex items-center gap-2'>
                  <Download className='w-4 h-4' />
                  Descargar PDF
                </h3>

                <button
                  onClick={() => handleDownloadPDF("digital")}
                  disabled={downloadingPdf !== null}
                  className='w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2'>
                  {downloadingPdf === "digital" ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <FileText className='w-4 h-4' />
                  )}
                  PDF Digital
                </button>

                <button
                  onClick={() => handleDownloadPDF("print")}
                  disabled={downloadingPdf !== null}
                  className='w-full py-3 bg-surface border border-border hover:border-primary text-text font-semibold rounded-xl transition-all flex items-center justify-center gap-2'>
                  {downloadingPdf === "print" ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <ImageIcon className='w-4 h-4' />
                  )}
                  PDF Print-Ready
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Center - Book View */}
        <main className='flex-1 flex flex-col overflow-hidden bg-bg'>
          {/* Book Spread */}
          <div className='flex-1 flex items-center justify-center p-8 overflow-hidden'>
            {!book ? (
              isGenerating ? (
                <GeneratingOverlay
                  kidName={kidName}
                  theme={theme}
                  phase={generatingPhase}
                  progress={generatingProgress}
                  status={generatingStatus}
                />
              ) : (
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
              )
            ) : (
              <div className='flex items-center gap-4'>
                {/* Previous button */}
                <button
                  onClick={() =>
                    setCurrentSpread(Math.max(0, currentSpread - 1))
                  }
                  disabled={currentSpread === 0}
                  className='p-3 rounded-full bg-surface border border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all'>
                  <ChevronLeft className='w-6 h-6' />
                </button>

                {/* Book spread */}
                <div className='flex book-shadow rounded-lg overflow-hidden'>
                  {/* Left page */}
                  <div
                    className={`w-[350px] h-[500px] bg-white relative cursor-pointer transition-all ${
                      selectedPage === leftPage?.pageNumber
                        ? "ring-4 ring-primary"
                        : ""
                    }`}
                    onClick={() =>
                      leftPage &&
                      setSelectedPage(
                        selectedPage === leftPage.pageNumber
                          ? null
                          : leftPage.pageNumber
                      )
                    }>
                    {leftPage ? (
                      <>
                        {leftPage.imageUrl && (
                          <div
                            className='absolute inset-0 bg-cover bg-center'
                            style={{
                              backgroundImage: `url(${leftPage.imageUrl})`,
                            }}
                          />
                        )}
                        <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
                        <div className='absolute bottom-0 left-0 right-0 p-4'>
                          {editingText?.pageNumber === leftPage.pageNumber ? (
                            <div className='space-y-2'>
                              <textarea
                                value={editingText.text}
                                onChange={(e) =>
                                  setEditingText({
                                    ...editingText,
                                    text: e.target.value,
                                  })
                                }
                                className='w-full p-2 bg-white/90 text-black text-sm rounded resize-none'
                                rows={4}
                                autoFocus
                              />
                              <div className='flex gap-2'>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveText();
                                  }}
                                  className='px-3 py-1 bg-primary text-white text-xs rounded'>
                                  <Check className='w-3 h-3' />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingText(null);
                                  }}
                                  className='px-3 py-1 bg-surface text-text text-xs rounded'>
                                  <X className='w-3 h-3' />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p
                              className='text-white text-sm leading-relaxed'
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingText({
                                  pageNumber: leftPage.pageNumber,
                                  text: leftPage.text || "",
                                });
                              }}>
                              {leftPage.text}
                            </p>
                          )}
                        </div>
                        <div className='absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs'>
                          {leftPage.pageNumber}
                        </div>
                      </>
                    ) : (
                      <div className='h-full flex items-center justify-center text-text-muted'>
                        Página vacía
                      </div>
                    )}
                  </div>

                  {/* Spine */}
                  <div className='w-2 bg-gradient-to-r from-gray-300 to-gray-200' />

                  {/* Right page */}
                  <div
                    className={`w-[350px] h-[500px] bg-white relative cursor-pointer transition-all ${
                      selectedPage === rightPage?.pageNumber
                        ? "ring-4 ring-primary"
                        : ""
                    }`}
                    onClick={() =>
                      rightPage &&
                      setSelectedPage(
                        selectedPage === rightPage.pageNumber
                          ? null
                          : rightPage.pageNumber
                      )
                    }>
                    {rightPage ? (
                      <>
                        {rightPage.imageUrl && (
                          <div
                            className='absolute inset-0 bg-cover bg-center'
                            style={{
                              backgroundImage: `url(${rightPage.imageUrl})`,
                            }}
                          />
                        )}
                        <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
                        <div className='absolute bottom-0 left-0 right-0 p-4'>
                          {editingText?.pageNumber === rightPage.pageNumber ? (
                            <div className='space-y-2'>
                              <textarea
                                value={editingText.text}
                                onChange={(e) =>
                                  setEditingText({
                                    ...editingText,
                                    text: e.target.value,
                                  })
                                }
                                className='w-full p-2 bg-white/90 text-black text-sm rounded resize-none'
                                rows={4}
                                autoFocus
                              />
                              <div className='flex gap-2'>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveText();
                                  }}
                                  className='px-3 py-1 bg-primary text-white text-xs rounded'>
                                  <Check className='w-3 h-3' />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingText(null);
                                  }}
                                  className='px-3 py-1 bg-surface text-text text-xs rounded'>
                                  <X className='w-3 h-3' />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p
                              className='text-white text-sm leading-relaxed'
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingText({
                                  pageNumber: rightPage.pageNumber,
                                  text: rightPage.text || "",
                                });
                              }}>
                              {rightPage.text}
                            </p>
                          )}
                        </div>
                        <div className='absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-white text-xs'>
                          {rightPage.pageNumber}
                        </div>
                      </>
                    ) : (
                      <div className='h-full flex items-center justify-center text-text-muted'>
                        Página vacía
                      </div>
                    )}
                  </div>
                </div>

                {/* Next button */}
                <button
                  onClick={() =>
                    setCurrentSpread(
                      Math.min(totalSpreads - 1, currentSpread + 1)
                    )
                  }
                  disabled={currentSpread >= totalSpreads - 1}
                  className='p-3 rounded-full bg-surface border border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all'>
                  <ChevronRight className='w-6 h-6' />
                </button>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {book && book.pages.length > 0 && (
            <div className='flex-shrink-0 bg-bg-light border-t border-border p-4'>
              <div className='flex gap-3 overflow-x-auto pb-2'>
                {book.pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => {
                      const spreadIndex = Math.floor((page.pageNumber - 1) / 2);
                      setCurrentSpread(spreadIndex);
                      setSelectedPage(page.pageNumber);
                    }}
                    className={`flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden relative transition-all ${
                      selectedPage === page.pageNumber
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-bg-light"
                        : "hover:ring-2 hover:ring-border"
                    }`}>
                    {page.thumbnailUrl || page.imageUrl ? (
                      <img
                        src={page.thumbnailUrl || page.imageUrl || ""}
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
                    <div className='absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5'>
                      {page.pageNumber}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Credits Modal */}
      <AnimatePresence>
        {showCreditsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4'
            onClick={() => setShowCreditsModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className='bg-bg-light rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto'
              onClick={(e) => e.stopPropagation()}>
              <div className='flex items-center justify-between mb-6'>
                <h2 className='text-2xl font-bold'>Comprar Créditos</h2>
                <button
                  onClick={() => setShowCreditsModal(false)}
                  className='p-2 hover:bg-surface rounded-lg transition-colors'>
                  <X className='w-5 h-5' />
                </button>
              </div>

              <p className='text-text-muted mb-6'>
                Tienes <span className='text-primary font-bold'>{credits}</span>{" "}
                créditos. Compra más para seguir creando libros.
              </p>

              <div className='space-y-4'>
                {creditPacks.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => handleBuyCredits(pack.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      pack.popular
                        ? "bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary"
                        : "bg-surface border border-border hover:border-primary"
                    }`}>
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='font-bold'>{pack.name}</span>
                          {pack.popular && (
                            <span className='px-2 py-0.5 bg-primary text-white text-xs font-bold rounded'>
                              Popular
                            </span>
                          )}
                        </div>
                        <p className='text-sm text-text-muted'>
                          {pack.description}
                        </p>
                      </div>
                      <div className='text-right'>
                        <div className='text-xl font-bold'>
                          {pack.priceFormatted}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className='mt-6 text-center text-sm text-text-muted'>
                <ShoppingCart className='w-4 h-4 inline mr-1' />
                Pago seguro con Stripe
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente de pantalla de generación mejorada
function GeneratingOverlay({
  kidName,
  theme,
  phase,
  progress,
  status,
}: {
  kidName: string;
  theme: string;
  phase: "story" | "images" | "finishing";
  progress: number;
  status: string;
}) {
  const phases = [
    { id: "story", label: "Escribiendo historia", icon: FileText },
    { id: "images", label: "Creando ilustraciones", icon: ImageIcon },
    { id: "finishing", label: "Finalizando", icon: Sparkles },
  ];

  const magicMessages = [
    "Mezclando ingredientes mágicos...",
    "Despertando la imaginación...",
    "Pintando con colores del arcoíris...",
    "Añadiendo polvo de estrellas...",
    "Tejiendo aventuras...",
    "Dando vida a los personajes...",
    "Creando momentos especiales...",
    "Preparando sorpresas...",
  ];

  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % magicMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='w-full max-w-2xl mx-auto px-4'>
      {/* Libro animado central */}
      <div className='relative mb-8'>
        {/* Partículas flotantes */}
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className='absolute'
              initial={{
                x: Math.random() * 400 - 200,
                y: Math.random() * 200 + 100,
                opacity: 0,
                scale: 0,
              }}
              animate={{
                y: [null, -100],
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
                rotate: [0, 360],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut",
              }}>
              <Sparkles
                className={`w-4 h-4 ${
                  i % 3 === 0
                    ? "text-primary"
                    : i % 3 === 1
                    ? "text-yellow-400"
                    : "text-pink-400"
                }`}
              />
            </motion.div>
          ))}
        </div>

        {/* Libro flotante */}
        <motion.div
          className='relative mx-auto w-40 h-48'
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}>
          {/* Sombra del libro */}
          <motion.div
            className='absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/20 rounded-full blur-md'
            animate={{
              scale: [1, 0.9, 1],
              opacity: [0.3, 0.2, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Libro 3D */}
          <div
            className='relative w-full h-full'
            style={{ perspective: "1000px" }}>
            {/* Tapa trasera */}
            <div
              className='absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-xl transform rotate-y-6'
              style={{ transform: "rotateY(-6deg) translateZ(-8px)" }}
            />

            {/* Páginas */}
            <div
              className='absolute inset-0 bg-white rounded-r-lg shadow-md'
              style={{ transform: "translateZ(-4px)", left: "8px" }}
            />

            {/* Tapa frontal */}
            <motion.div
              className='absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/90 rounded-lg shadow-2xl flex flex-col items-center justify-center p-4'
              animate={{ rotateY: phase === "finishing" ? [0, -30, 0] : 0 }}
              transition={{
                duration: 1,
                repeat: phase === "finishing" ? Infinity : 0,
              }}>
              <Book className='w-12 h-12 text-white mb-2' />
              <div className='text-white text-center'>
                <p className='text-sm font-bold truncate max-w-full'>
                  {kidName}
                </p>
                <p className='text-xs opacity-80 truncate max-w-full'>
                  {theme.length > 30 ? theme.substring(0, 30) + "..." : theme}
                </p>
              </div>

              {/* Brillo animado */}
              <motion.div
                className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-lg'
                animate={{ x: [-200, 200] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Fases del proceso */}
      <div className='flex items-center justify-center gap-2 mb-6'>
        {phases.map((p, index) => {
          const Icon = p.icon;
          const isActive = p.id === phase;
          const isPast = phases.findIndex((x) => x.id === phase) > index;

          return (
            <div key={p.id} className='flex items-center'>
              <motion.div
                className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                  isActive
                    ? "bg-primary text-white"
                    : isPast
                    ? "bg-green-500/20 text-green-500"
                    : "bg-surface text-text-muted"
                }`}
                animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}>
                {isPast ? (
                  <Check className='w-4 h-4' />
                ) : isActive ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}>
                    <Loader2 className='w-4 h-4' />
                  </motion.div>
                ) : (
                  <Icon className='w-4 h-4' />
                )}
                <span className='text-sm font-medium hidden sm:inline'>
                  {p.label}
                </span>
              </motion.div>

              {index < phases.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 transition-colors ${
                    isPast ? "bg-green-500" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Barra de progreso */}
      <div className='mb-6'>
        <div className='flex justify-between text-sm mb-2'>
          <span className='text-text-muted'>{status}</span>
          <span className='text-primary font-bold'>{progress}%</span>
        </div>
        <div className='h-3 bg-surface rounded-full overflow-hidden'>
          <motion.div
            className='h-full bg-gradient-to-r from-primary via-primary to-secondary rounded-full relative'
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}>
            {/* Efecto de brillo en la barra */}
            <motion.div
              className='absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent'
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        </div>
      </div>

      {/* Mensaje mágico cambiante */}
      <div className='text-center'>
        <AnimatePresence mode='wait'>
          <motion.p
            key={currentMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className='text-text-muted flex items-center justify-center gap-2'>
            <Sparkles className='w-4 h-4 text-yellow-400' />
            {magicMessages[currentMessage]}
            <Sparkles className='w-4 h-4 text-yellow-400' />
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Tiempo estimado */}
      <p className='text-center text-xs text-text-muted/60 mt-4'>
        Tiempo estimado: 1-2 minutos
      </p>
    </div>
  );
}

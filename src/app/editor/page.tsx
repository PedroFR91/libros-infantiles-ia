"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, Book, CheckCircle, Library, Loader2, Settings2, User, X } from "lucide-react";

import BookViewer from "./BookViewer";
import TextCustomizer from "./TextCustomizer";
import GeneratingOverlay from "./GeneratingOverlay";
import DraftBookOverlay from "./DraftBookOverlay";
import PurchaseSheet from "./PurchaseSheet";
import Wizard, { WizardData } from "./Wizard";
import { ActionBar, PageSheet, ProgressPanel, ResultPanel } from "./BookPanels";
import { BookData, BookPage, CheckoutPrices, PurchaseProduct, ViewMode } from "./types";
import { track } from "@/lib/analytics";

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className='h-screen bg-bg flex items-center justify-center'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      }>
      <EditorContent />
    </Suspense>
  );
}

type Notice = { type: "info" | "success" | "error"; text: string };

function EditorContent() {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  // Usuario y precios
  const [credits, setCredits] = useState(0);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [prices, setPrices] = useState<CheckoutPrices | null>(null);

  // Libro
  const [book, setBook] = useState<BookData | null>(null);
  const [loadingBook, setLoadingBook] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("spread");
  const [editingText, setEditingText] = useState<{ pageNumber: number; text: string } | null>(null);

  // Creación
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [kidNameForProgress, setKidNameForProgress] = useState("");
  const [themeForProgress, setThemeForProgress] = useState("");

  // UI
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseProduct, setPurchaseProduct] = useState<PurchaseProduct>("bundle");
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orderingPrint, setOrderingPrint] = useState(false);
  const [approving, setApproving] = useState(false);
  const [redrawing, setRedrawing] = useState(false);
  const [downloading, setDownloading] = useState<"digital" | "print" | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [dedicationDraft, setDedicationDraft] = useState("");
  // Vuelta de Stripe esperando a que el webhook confirme: no ofrecer pagar otra vez
  const [awaitingPayment, setAwaitingPayment] = useState(false);

  const handledBookIdRef = useRef<string | null>(null);
  const previousStatusRef = useRef<string | undefined>(undefined);

  // ============================================
  // EFECTOS
  // ============================================

  // En móvil la doble página no cabe: empezar en página completa
  useEffect(() => {
    if (window.innerWidth < 768) setViewMode("single");
    // Al volver de Stripe con "atrás" la página puede restaurarse de caché
    // con los botones en "cargando": desbloquearlos
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setPaying(false);
        setOrderingPrint(false);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    fetchUserData();
    fetchPrices();
  }, [sessionStatus, session?.user?.id]);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (searchParams.get("print") === "ok") {
      setNotice({ type: "success", text: "¡Pedido recibido! Te avisaremos por email cuando salga de la imprenta." });
    } else if (searchParams.get("print") === "canceled" || searchParams.get("canceled")) {
      setNotice({ type: "info", text: "Pago cancelado. Tu cuento sigue aquí, guardado." });
    }

    const bookId = searchParams.get("bookId");
    if (!bookId || handledBookIdRef.current === bookId) return;
    handledBookIdRef.current = bookId;

    const paid = searchParams.get("paid") === "1";
    loadExistingBook(bookId).then((loaded) => {
      if (!loaded) return;
      window.history.replaceState(null, "", `/editor?bookId=${bookId}`);
      if (paid) {
        track("pago_completado");
        if (loaded.status === "DRAFT" || loaded.status === "ERROR") waitForPaidIllustrations(loaded);
      }
    });
  }, [searchParams, sessionStatus]);

  // Sondeo mientras se generan la portada de muestra o las ilustraciones
  const pollingBookId = book?.id;
  const shouldPoll = !!book && (book.status === "GENERATING" || !!book.previewPending);
  useEffect(() => {
    if (!pollingBookId || !shouldPoll) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/books/${pollingBookId}`);
        if (!res.ok) return;
        const data = await res.json();
        // Fusionar solo lo que cambia en segundo plano (no pisar textos editados)
        setBook((prev) => {
          if (!prev || prev.id !== data.book.id) return prev;
          const fresh = mapBook(data.book);
          return {
            ...prev,
            status: fresh.status,
            coverPreviewUrl: fresh.coverPreviewUrl,
            previewPending: fresh.previewPending,
            generating: fresh.generating,
            unlockedAt: fresh.unlockedAt,
            printOrders: fresh.printOrders,
            pages: prev.pages.map((page) => {
              const updated = fresh.pages.find((p) => p.pageNumber === page.pageNumber);
              return updated ? { ...page, imageUrl: updated.imageUrl, thumbnailUrl: updated.thumbnailUrl } : page;
            }),
          };
        });
      } catch {
        // siguiente ciclo
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [pollingBookId, shouldPoll]);

  // Avisos al terminar
  useEffect(() => {
    const previous = previousStatusRef.current;
    previousStatusRef.current = book?.status;
    if (previous !== "GENERATING") return;
    if (book?.status === "COMPLETED") {
      track("ilustraciones_generadas");
      fetchUserData();
      setNotice({ type: "success", text: "¡Tu cuento está listo!" });
    } else if (book?.status === "ERROR") {
      fetchUserData();
      setNotice({ type: "error", text: "Algunas ilustraciones no se pudieron terminar. Pulsa «Terminar las ilustraciones»." });
    }
  }, [book?.status]);

  useEffect(() => {
    setDedicationDraft(book?.dedication ?? "");
  }, [book?.id, book?.dedication]);

  // ============================================
  // DATOS
  // ============================================

  const mapBook = (raw: BookData): BookData => ({
    ...raw,
    title: raw.title || `El cuento de ${raw.kidName}`,
    style: raw.style || "watercolor",
    pages: [...raw.pages].sort((a, b) => a.pageNumber - b.pageNumber),
  });

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      setCredits(data.credits || 0);
      setHasPurchased(!!data.hasPurchased);
      setIsAdmin(!!data.isAdmin);
      return data.credits || 0;
    } catch {
      return 0;
    }
  };

  const fetchPrices = async () => {
    try {
      const res = await fetch("/api/stripe/checkout");
      if (res.ok) setPrices(await res.json());
    } catch {
      // la hoja de compra muestra un cargando
    }
  };

  const loadExistingBook = async (bookId: string): Promise<BookData | null> => {
    setLoadingBook(true);
    try {
      const res = await fetch(`/api/books/${bookId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const loaded = mapBook(data.book);
      setBook(loaded);
      return loaded;
    } catch {
      setNotice({
        type: "error",
        text: "No pudimos abrir este cuento en este navegador. Usa el enlace del email o recupéralo en «Mis cuentos».",
      });
      return null;
    } finally {
      setLoadingBook(false);
    }
  };

  // Tras volver de Stripe el webhook ya lanza las ilustraciones; si tarda,
  // el propio navegador las lanza cuando lleguen los libros comprados
  const waitForPaidIllustrations = async (target: BookData) => {
    setAwaitingPayment(true);
    setNotice({ type: "success", text: "¡Pago recibido! Estamos preparando las ilustraciones de tu cuento…" });
    try {
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));
        const res = await fetch(`/api/books/${target.id}`).catch(() => null);
        const data = res?.ok ? await res.json() : null;
        if (data?.book && data.book.status !== "DRAFT" && data.book.status !== "ERROR") {
          setBook(mapBook(data.book));
          return;
        }
        // Si el pago ya abonó el libro pero el webhook no lo lanzó, lanzarlo desde aquí
        if (attempt === 10 && (await fetchUserData()) >= 5) {
          await illustrate(target.id);
          return;
        }
      }
      setNotice({
        type: "info",
        text: "Tu pago se está confirmando. Te enviaremos el enlace por email en cuanto esté; si en unos minutos no llega, escríbenos a hola@iconicospace.com.",
      });
    } finally {
      setAwaitingPayment(false);
    }
  };

  // ============================================
  // ACCIONES
  // ============================================

  const analyzePhoto = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/analyze-photo", { method: "POST", body: formData });
      const data = await res.json();
      return data.success && data.characterDescription ? data.characterDescription : null;
    } catch {
      return null;
    }
  };

  const createBook = async (data: WizardData) => {
    setCreating(true);
    setKidNameForProgress(data.kidName);
    setThemeForProgress(data.theme);
    setCreateProgress(8);
    const progress = setInterval(() => setCreateProgress((p) => (p >= 92 ? p : p + 2)), 1500);
    try {
      const createRes = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kidName: data.kidName,
          theme: data.theme,
          style: data.style,
          ageRange: data.ageRange,
          gender: data.gender,
          companion: data.companion || undefined,
          dedication: data.dedication || undefined,
          characterDescription: data.characterDescription || undefined,
        }),
      });
      const created = await createRes.json();
      if (!created.book) throw new Error(created.error || "No se pudo crear el cuento");

      const storyBody = new FormData();
      if (data.photo) storyBody.append("photo", data.photo);
      const storyRes = await fetch(`/api/books/${created.book.id}/generate-story`, {
        method: "POST",
        ...(data.photo && { body: storyBody }),
      });
      const story = await storyRes.json();
      if (!story.book) throw new Error(story.error || "No se pudo escribir la historia");

      const newBook = mapBook(story.book);
      setBook(newBook);
      setCurrentPage(0);
      handledBookIdRef.current = newBook.id;
      window.history.replaceState(null, "", `/editor?bookId=${newBook.id}`);
      track("borrador_creado", { estilo: data.style, foto: !!data.photo });
      setShowReveal(true);
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error && error.message ? error.message : "No pudimos crear el cuento. Inténtalo de nuevo.",
      });
    } finally {
      clearInterval(progress);
      setCreating(false);
    }
  };

  const illustrate = async (bookId: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/books/${bookId}/generate-images`, { method: "POST" });
      const data = await res.json();
      if (data.needsCredits) {
        openPurchase("bundle");
        return;
      }
      if (res.status === 202 || res.status === 409) {
        setBook((prev) => (prev && prev.id === bookId ? { ...prev, status: "GENERATING" } : prev));
        setNotice(null);
        setShowReveal(false);
        fetchUserData();
        return;
      }
      throw new Error(data.error);
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error && error.message ? error.message : "No pudimos empezar las ilustraciones.",
      });
    } finally {
      setBusy(false);
    }
  };

  const openPurchase = (product: PurchaseProduct) => {
    setPurchaseProduct(product);
    setShowReveal(false);
    setPurchaseOpen(true);
    if (!prices) fetchPrices();
  };

  const pay = async (product: PurchaseProduct, extraCopies: number) => {
    setPaying(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          extraCopies,
          acceptedTerms: true,
          ...(book && { bookId: book.id }),
        }),
      });
      const data = await res.json();
      if (!data.url) throw new Error(data.error);
      track("checkout_iniciado", { producto: product });
      window.location.href = data.url;
      return;
    } catch {
      setPurchaseOpen(false);
      setNotice({ type: "error", text: "No se pudo abrir el pago. Inténtalo de nuevo en unos segundos." });
    }
    setPaying(false);
  };

  const orderPrint = async (extraCopies: number) => {
    if (!book) return;
    setOrderingPrint(true);
    try {
      const res = await fetch("/api/stripe/checkout-print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.id, extraCopies, acceptedTerms: true }),
      });
      const data = await res.json();
      if (!data.url) throw new Error(data.error);
      window.location.href = data.url;
      return;
    } catch {
      setNotice({ type: "error", text: "No se pudo abrir el pago del libro impreso." });
    }
    setOrderingPrint(false);
  };

  const approvePrint = async () => {
    if (!book) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/books/${book.id}/approve-print`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadExistingBook(book.id);
      setNotice({ type: "success", text: "¡Aprobado! Lo mandamos a imprenta y te avisaremos cuando salga." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error && error.message ? error.message : "No se pudo aprobar." });
    } finally {
      setApproving(false);
    }
  };

  const download = async (type: "digital" | "print") => {
    if (!book) return;
    setDownloading(type);
    try {
      const res = await fetch(`/api/books/${book.id}/pdf/download?type=${type}`);
      if (!res.ok) throw new Error();
      track("pdf_descargado", { tipo: type });
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${book.title || "cuento"}${type === "print" ? " - para imprimir" : ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setNotice({ type: "error", text: "No se pudo descargar el PDF. Inténtalo de nuevo." });
    } finally {
      setDownloading(null);
    }
  };

  const patchBook = (body: Record<string, unknown>) =>
    book
      ? fetch(`/api/books/${book.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : Promise.reject(new Error("Sin libro"));

  const savePageText = async (pageNumber: number, text: string) => {
    setBook((prev) => prev && { ...prev, pages: prev.pages.map((p) => (p.pageNumber === pageNumber ? { ...p, text } : p)) });
    await patchBook({ pageNumber, text }).catch(() =>
      setNotice({ type: "error", text: "No se pudo guardar el texto." }),
    );
  };

  const updatePageStyle = async (pageNumber: number, updates: Partial<BookPage>) => {
    setBook((prev) =>
      prev && { ...prev, pages: prev.pages.map((p) => (p.pageNumber === pageNumber ? { ...p, ...updates } : p)) },
    );
    await patchBook({ pageNumber, ...updates }).catch(() => undefined);
  };

  const saveEditingText = async () => {
    if (!editingText) return;
    await savePageText(editingText.pageNumber, editingText.text);
    setEditingText(null);
  };

  const saveDedication = async () => {
    const value = dedicationDraft.trim();
    try {
      const res = await patchBook({ dedication: value || null });
      if (!res.ok) throw new Error();
      setBook((prev) => prev && { ...prev, dedication: value || null });
      setNotice({ type: "success", text: "Dedicatoria guardada." });
    } catch {
      setNotice({ type: "error", text: "No se pudo guardar la dedicatoria." });
    }
  };

  const saveLeadEmail = async (email: string) => {
    try {
      return (await patchBook({ leadEmail: email })).ok;
    } catch {
      return false;
    }
  };

  const redraw = async (pageNumber: number, instruction: string) => {
    if (!book) return;
    setRedrawing(true);
    try {
      const res = await fetch(`/api/books/${book.id}/pages/${pageNumber}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPrompt: instruction, regenerateText: false, regenerateImage: true }),
      });
      const data = await res.json();
      if (data.needsCredits) {
        setNotice({
          type: "info",
          text: "Has usado los dibujos gratis de este cuento. Escríbenos a hola@iconicospace.com y lo vemos contigo.",
        });
        return;
      }
      if (!data.page) throw new Error(data.error);
      setBook((prev) =>
        prev && {
          ...prev,
          freeRedraws: typeof data.freeRedrawsLeft === "number" ? data.freeRedrawsLeft : prev.freeRedraws,
          pages: prev.pages.map((p) => (p.pageNumber === pageNumber ? { ...p, ...data.page } : p)),
        },
      );
      fetchUserData();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error && error.message ? error.message : "No se pudo rehacer el dibujo.",
      });
    } finally {
      setRedrawing(false);
    }
  };

  const newBook = () => {
    setBook(null);
    setNotice(null);
    setSelectedPage(null);
    setOptionsOpen(false);
    handledBookIdRef.current = null;
    window.history.replaceState(null, "", "/editor");
  };

  // ============================================
  // RENDER
  // ============================================

  const selectedPageData = book?.pages.find((p) => p.pageNumber === selectedPage) ?? null;
  // Los administradores ilustran sin pagar (ejemplos y pruebas)
  const hasCredits = credits >= 5 || isAdmin;
  const canRedraw = !!book?.unlockedAt && (book.status === "COMPLETED" || book.status === "ERROR");

  if (loadingBook && !book) {
    return (
      <div className='h-screen bg-bg flex flex-col items-center justify-center gap-4'>
        <Loader2 className='w-10 h-10 animate-spin text-primary' />
        <p className='text-text-muted'>Abriendo tu cuento…</p>
      </div>
    );
  }

  return (
    <div className='h-dvh flex flex-col overflow-hidden bg-bg'>
      {/* Cabecera */}
      <header className='flex-shrink-0 bg-bg-light border-b border-border'>
        <div className='px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2'>
          <Link href='/' className='flex items-center gap-2 font-bold'>
            <span className='w-8 h-8 rounded-lg bg-primary flex items-center justify-center'>
              <Book className='w-5 h-5 text-white' />
            </span>
            <span className='hidden sm:inline'>LibrosIA</span>
          </Link>
          <nav className='flex items-center gap-1 sm:gap-2 text-sm font-semibold'>
            {book && (
              <button
                onClick={() => setOptionsOpen(true)}
                className='lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-strong'>
                <Settings2 className='w-4 h-4' /> Opciones
              </button>
            )}
            <Link href='/mis-libros' className='flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-bg'>
              <Library className='w-4 h-4' /> <span className='hidden sm:inline'>Mis cuentos</span>
            </Link>
            {session?.user ? (
              <Link href='/perfil' className='flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-bg' aria-label='Mi perfil'>
                <User className='w-4 h-4' />
              </Link>
            ) : (
              <Link href='/login' className='px-3 py-2 rounded-xl hover:bg-bg text-text-muted'>
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>

      {notice && (
        <div
          role='status'
          className={`flex-shrink-0 flex items-start gap-2 px-4 py-3 text-sm border-b ${
            notice.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : notice.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-amber-50 border-amber-200 text-amber-900"
          }`}>
          {notice.type === "error" ? (
            <AlertTriangle className='w-4 h-4 mt-0.5 flex-shrink-0' />
          ) : (
            <CheckCircle className='w-4 h-4 mt-0.5 flex-shrink-0' />
          )}
          <p className='flex-1'>{notice.text}</p>
          <button onClick={() => setNotice(null)} aria-label='Cerrar aviso' className='p-1 -m-1 rounded hover:bg-black/5'>
            <X className='w-4 h-4' />
          </button>
        </div>
      )}

      <div className='flex-1 flex overflow-hidden'>
        {/* Opciones (solo con libro): escritorio a la izquierda, móvil en panel */}
        {book && (
          <>
            {optionsOpen && (
              <div className='fixed inset-0 bg-black/40 z-40 lg:hidden' onClick={() => setOptionsOpen(false)} />
            )}
            <aside
              className={`fixed lg:static inset-y-0 left-0 z-50 w-[88vw] max-w-sm lg:w-80 bg-bg-light border-r border-border flex flex-col transition-transform ${
                optionsOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
              }`}>
              <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
                <span className='font-bold'>Opciones del cuento</span>
                <button onClick={() => setOptionsOpen(false)} aria-label='Cerrar' className='lg:hidden p-2 -mr-2 rounded-xl hover:bg-bg'>
                  <X className='w-5 h-5' />
                </button>
              </div>
              <div className='flex-1 overflow-y-auto p-4 space-y-6'>
                <div>
                  <label htmlFor='dedication-edit' className='block font-semibold mb-1.5'>
                    Dedicatoria
                  </label>
                  <textarea
                    id='dedication-edit'
                    value={dedicationDraft}
                    onChange={(e) => setDedicationDraft(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder={`Ej: Para ${book.kidName}, con todo el cariño de los abuelos`}
                    className='w-full px-3 py-2 rounded-xl bg-bg border border-border-strong outline-none focus:border-primary resize-none'
                  />
                  {dedicationDraft.trim() !== (book.dedication ?? "") && (
                    <button onClick={saveDedication} className='mt-2 w-full py-2.5 rounded-xl border-2 border-primary text-primary font-bold'>
                      Guardar dedicatoria
                    </button>
                  )}
                </div>

                <div>
                  <p className='font-semibold mb-1.5'>Aspecto del texto</p>
                  {selectedPageData && selectedPageData.pageNumber !== 1 ? (
                    <TextCustomizer
                      page={selectedPageData}
                      onUpdatePage={(updates) => updatePageStyle(selectedPageData.pageNumber, updates)}
                    />
                  ) : (
                    <p className='text-sm text-text-muted'>
                      Toca una página del cuento para cambiar la posición, el fondo o el color de su texto.
                    </p>
                  )}
                </div>

                <button onClick={newBook} className='w-full py-3 rounded-xl border-2 border-border-strong font-bold'>
                  Crear otro cuento
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Vista principal */}
        <main className='flex-1 flex flex-col overflow-y-auto'>
          {!book ? (
            creating ? (
              <div className='flex-1 flex items-center justify-center p-4'>
                <GeneratingOverlay
                  kidName={kidNameForProgress}
                  theme={themeForProgress}
                  phase='story'
                  progress={createProgress}
                  status='Escribiendo su historia…'
                />
              </div>
            ) : (
              <Wizard
                initialName={searchParams.get("name") ?? ""}
                initialTheme={searchParams.get("theme") ?? ""}
                onSubmit={createBook}
                onAnalyzePhoto={analyzePhoto}
              />
            )
          ) : (
            <>
              {book.status === "GENERATING" && <ProgressPanel book={book} />}
              {book.status === "COMPLETED" && (
                <ResultPanel
                  book={book}
                  prices={prices}
                  downloading={downloading}
                  onDownload={download}
                  orderingPrint={orderingPrint}
                  onOrderPrint={orderPrint}
                  approving={approving}
                  onApprove={approvePrint}
                  onNewBook={newBook}
                />
              )}
              <div className='flex-1 min-h-[70vh] flex flex-col'>
                <BookViewer
                  book={book}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  selectedPage={selectedPage}
                  onSelectPage={setSelectedPage}
                  editingText={editingText}
                  onEditText={setEditingText}
                  onSaveText={saveEditingText}
                  onUpdatePageText={savePageText}
                  credits={credits}
                />
              </div>
              {awaitingPayment && (book.status === "DRAFT" || book.status === "ERROR") && (
                <div className='sticky bottom-0 z-20 border-t border-border bg-bg-light px-4 py-4 flex items-center justify-center gap-2 text-sm font-semibold'>
                  <Loader2 className='w-5 h-5 animate-spin text-primary' /> Confirmando tu pago…
                </div>
              )}
              {!awaitingPayment && (book.status === "DRAFT" || book.status === "ERROR") && (
                <ActionBar
                  book={book}
                  prices={prices}
                  hasCredits={hasCredits}
                  hasPurchased={hasPurchased}
                  busy={busy}
                  onBuy={openPurchase}
                  onIllustrate={() => illustrate(book.id)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {book && selectedPageData && book.status !== "GENERATING" && (
        <PageSheet
          key={selectedPageData.pageNumber}
          page={selectedPageData}
          canRedraw={canRedraw}
          freeRedraws={book.freeRedraws}
          redrawing={redrawing}
          onClose={() => setSelectedPage(null)}
          onSaveText={(text) => savePageText(selectedPageData.pageNumber, text)}
          onRedraw={(instruction) => redraw(selectedPageData.pageNumber, instruction)}
        />
      )}

      <DraftBookOverlay
        isVisible={showReveal && !!book && book.status === "DRAFT"}
        kidName={book?.kidName ?? ""}
        title={book?.title ?? ""}
        firstPageText={book?.pages.find((p) => p.pageNumber === 2)?.text}
        coverPreviewUrl={book?.coverPreviewUrl}
        previewPending={book?.previewPending}
        prices={prices}
        hasCredits={hasCredits}
        hasPurchased={hasPurchased}
        onChoose={openPurchase}
        onIllustrateWithCredits={() => book && illustrate(book.id)}
        onRead={() => setShowReveal(false)}
        onClose={() => setShowReveal(false)}
        onSaveEmail={saveLeadEmail}
      />

      <PurchaseSheet
        key={purchaseOpen ? `open-${purchaseProduct}` : "closed"}
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        kidName={book?.kidName ?? ""}
        prices={prices}
        hasPurchased={hasPurchased}
        initialProduct={purchaseProduct}
        paying={paying}
        onPay={pay}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  Book,
  Sparkles,
  Download,
  CreditCard,
  Palette,
  Wand2,
} from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className='min-h-screen bg-bg'>
      {/* Header */}
      <header className='fixed top-0 left-0 right-0 z-50 glass'>
        <div className='max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between'>
          <Link href='/' className='flex items-center gap-2'>
            <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary flex items-center justify-center'>
              <Book className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
            </div>
            <span className='text-lg sm:text-xl font-bold'>
              <span className='text-primary'>Libros</span>
              <span className='text-secondary'>IA</span>
            </span>
          </Link>

          <nav className='hidden md:flex items-center gap-8'>
            <a
              href='#como-funciona'
              className='text-text-muted hover:text-text transition-colors'>
              Cómo funciona
            </a>
            <a
              href='#precios'
              className='text-text-muted hover:text-text transition-colors'>
              Precios
            </a>
          </nav>

          <Link
            href='/editor'
            className='px-3 sm:px-6 py-2 sm:py-2.5 bg-primary hover:bg-primary-hover text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition-all hover:scale-105'>
            <span className='hidden sm:inline'>Crear mi libro</span>
            <span className='sm:hidden'>Crear</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className='pt-24 sm:pt-32 pb-12 sm:pb-20 px-3 sm:px-4'>
        <div className='max-w-7xl mx-auto'>
          <div className='grid lg:grid-cols-2 gap-8 lg:gap-12 items-center'>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}>
              <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/30 text-primary mb-4 sm:mb-6'>
                <Sparkles className='w-3 h-3 sm:w-4 sm:h-4' />
                <span className='text-xs sm:text-sm font-medium'>
                  Powered by AI
                </span>
              </div>

              <h1 className='text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight'>
                Crea libros infantiles
                <span className='gradient-text'> únicos y mágicos</span>
              </h1>

              <p className='text-base sm:text-xl text-text-muted mb-6 sm:mb-8 max-w-lg'>
                Tu hijo será el protagonista de su propia aventura. Genera
                historias personalizadas con ilustraciones únicas en minutos.
              </p>

              <div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
                <Link
                  href='/editor'
                  className='px-6 sm:px-8 py-3 sm:py-4 bg-primary hover:bg-primary-hover text-white font-bold text-base sm:text-lg rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2 animate-pulse-glow'>
                  <Wand2 className='w-5 h-5' />
                  Crear mi libro
                </Link>
                <a
                  href='#como-funciona'
                  className='px-6 sm:px-8 py-3 sm:py-4 bg-surface hover:bg-border text-text font-semibold rounded-xl transition-colors flex items-center justify-center'>
                  Ver demo
                </a>
              </div>

              <div className='mt-6 sm:mt-8 flex flex-wrap items-center gap-4 sm:gap-6 text-text-muted text-sm sm:text-base'>
                <div className='flex items-center gap-2'>
                  <svg
                    className='w-5 h-5 text-green-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span>12 páginas ilustradas</span>
                </div>
                <div className='flex items-center gap-2'>
                  <svg
                    className='w-5 h-5 text-green-500'
                    fill='currentColor'
                    viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span>PDF descargable</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className='relative'>
              {/* Book Preview Mockup */}
              <div className='relative'>
                <div className='w-full max-w-md mx-auto'>
                  <div className='relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 book-shadow'>
                    <div className='aspect-[3/4] bg-surface rounded-xl overflow-hidden relative'>
                      <div className='absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20' />
                      <div className='absolute inset-0 flex flex-col items-center justify-center p-6'>
                        <div className='w-24 h-24 rounded-full bg-primary/30 flex items-center justify-center mb-4 animate-float'>
                          <span className='text-5xl'>👧</span>
                        </div>
                        <h3 className='text-2xl font-bold text-center mb-2'>
                          La aventura de Sofía
                        </h3>
                        <p className='text-text-muted text-center text-sm'>
                          Un viaje mágico al espacio
                        </p>
                      </div>
                    </div>

                    {/* Floating elements */}
                    <div className='absolute -top-4 -right-4 w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg animate-float'>
                      <span className='text-2xl'>🚀</span>
                    </div>
                    <div
                      className='absolute -bottom-4 -left-4 w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg animate-float'
                      style={{ animationDelay: "0.5s" }}>
                      <span className='text-xl'>⭐</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id='como-funciona'
        className='py-12 sm:py-20 px-3 sm:px-4 bg-bg-light'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-10 sm:mb-16'>
            <h2 className='text-2xl sm:text-4xl font-bold mb-3 sm:mb-4'>
              Cómo funciona
            </h2>
            <p className='text-text-muted text-sm sm:text-lg max-w-2xl mx-auto'>
              Crear un libro personalizado nunca fue tan fácil. En solo 3 pasos
              tendrás una historia única.
            </p>
          </div>

          <div className='grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8'>
            {[
              {
                icon: Palette,
                title: "1. Personaliza",
                description:
                  "Introduce el nombre del niño y elige el tema de la aventura entre decenas de opciones.",
              },
              {
                icon: Sparkles,
                title: "2. Genera con IA",
                description:
                  "Nuestra IA crea una historia única con ilustraciones personalizadas en minutos.",
              },
              {
                icon: Download,
                title: "3. Descarga",
                description:
                  "Descarga tu libro en PDF digital o listo para imprimir en alta calidad.",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className='p-5 sm:p-8 rounded-xl sm:rounded-2xl bg-surface border border-border hover:border-primary/50 transition-colors'>
                <div className='w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center mb-4 sm:mb-6'>
                  <feature.icon className='w-5 h-5 sm:w-7 sm:h-7 text-primary' />
                </div>
                <h3 className='text-lg sm:text-xl font-bold mb-2 sm:mb-3'>
                  {feature.title}
                </h3>
                <p className='text-text-muted text-sm sm:text-base'>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className='py-12 sm:py-20 px-3 sm:px-4'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-8 sm:mb-12'>
            <h2 className='text-2xl sm:text-4xl font-bold mb-3 sm:mb-4'>
              Temas disponibles
            </h2>
            <p className='text-text-muted text-sm sm:text-lg'>
              Elige la aventura perfecta para tu pequeño
            </p>
          </div>

          <div className='flex flex-wrap justify-center gap-2 sm:gap-4'>
            {[
              { emoji: "🚒", label: "Bombero" },
              { emoji: "🚀", label: "Astronauta" },
              { emoji: "🦕", label: "Dinosaurios" },
              { emoji: "👑", label: "Princesa" },
              { emoji: "🏴‍☠️", label: "Pirata" },
              { emoji: "🧚", label: "Hadas" },
              { emoji: "🦸", label: "Superhéroe" },
              { emoji: "🌊", label: "Océano" },
              { emoji: "✨", label: "Magia" },
              { emoji: "🦁", label: "Animales" },
              { emoji: "⚽", label: "Fútbol" },
              { emoji: "🚗", label: "Coches" },
            ].map((cat) => (
              <motion.div
                key={cat.label}
                whileHover={{ scale: 1.05 }}
                className='px-3 sm:px-6 py-2 sm:py-3 rounded-full bg-surface border border-border hover:border-primary transition-colors cursor-pointer flex items-center gap-1 sm:gap-2'>
                <span className='text-lg sm:text-2xl'>{cat.emoji}</span>
                <span className='font-medium text-sm sm:text-base'>
                  {cat.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id='precios' className='py-20 px-4 bg-bg-light'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-10 sm:mb-16'>
            <h2 className='text-2xl sm:text-4xl font-bold mb-3 sm:mb-4'>
              Packs de créditos
            </h2>
            <p className='text-text-muted text-sm sm:text-lg'>
              Compra créditos y crea todos los libros que quieras
            </p>
          </div>

          <div className='grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 max-w-4xl mx-auto'>
            {[
              {
                name: "5 Créditos",
                price: "4.99",
                description: "Genera 1 libro completo",
                credits: 5,
              },
              {
                name: "15 Créditos",
                price: "12.99",
                description: "Genera 3 libros completos",
                credits: 15,
                popular: true,
              },
              {
                name: "30 Créditos",
                price: "22.99",
                description: "Genera 6 libros completos",
                credits: 30,
              },
            ].map((pack) => (
              <motion.div
                key={pack.name}
                whileHover={{ y: -5 }}
                className={`p-5 sm:p-8 rounded-xl sm:rounded-2xl relative ${
                  pack.popular
                    ? "bg-gradient-to-b from-primary/20 to-surface border-2 border-primary"
                    : "bg-surface border border-border"
                }`}>
                {pack.popular && (
                  <div className='absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 bg-primary text-white text-xs sm:text-sm font-bold rounded-full'>
                    Popular
                  </div>
                )}
                <div className='text-center'>
                  <h3 className='text-lg sm:text-xl font-bold mb-2'>
                    {pack.name}
                  </h3>
                  <div className='mb-3 sm:mb-4'>
                    <span className='text-2xl sm:text-4xl font-bold'>
                      €{pack.price}
                    </span>
                  </div>
                  <p className='text-text-muted text-sm sm:text-base mb-4 sm:mb-6'>
                    {pack.description}
                  </p>
                  <Link
                    href='/editor'
                    className={`block w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-colors ${
                      pack.popular
                        ? "bg-primary hover:bg-primary-hover text-white"
                        : "bg-border hover:bg-surface text-text"
                    }`}>
                    Seleccionar
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <div className='mt-8 sm:mt-12 text-center'>
            <div className='inline-flex items-center gap-2 text-text-muted text-sm sm:text-base'>
              <CreditCard className='w-4 h-4 sm:w-5 sm:h-5' />
              <span>Pago seguro con Stripe</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-12 sm:py-20 px-3 sm:px-4'>
        <div className='max-w-4xl mx-auto text-center'>
          <h2 className='text-2xl sm:text-4xl font-bold mb-4 sm:mb-6'>
            ¿Listo para crear magia?
          </h2>
          <p className='text-base sm:text-xl text-text-muted mb-6 sm:mb-8'>
            Dale a tu hijo un regalo único que recordará siempre
          </p>
          <Link
            href='/editor'
            className='inline-flex items-center gap-2 px-6 sm:px-10 py-3 sm:py-5 bg-primary hover:bg-primary-hover text-white font-bold text-base sm:text-xl rounded-xl sm:rounded-2xl transition-all hover:scale-105 animate-pulse-glow'>
            <Book className='w-5 h-5 sm:w-6 sm:h-6' />
            Crear mi libro ahora
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className='py-8 sm:py-12 px-3 sm:px-4 border-t border-border'>
        <div className='max-w-7xl mx-auto'>
          <div className='flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4'>
            <div className='flex items-center gap-2'>
              <div className='w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center'>
                <Book className='w-4 h-4 sm:w-5 sm:h-5 text-white' />
              </div>
              <span className='font-bold text-sm sm:text-base'>
                <span className='text-primary'>Libros</span>
                <span className='text-secondary'>IA</span>
              </span>
              <span className='text-text-muted ml-2 text-xs sm:text-base'>
                by IconicoSpace
              </span>
            </div>

            <div className='text-text-muted text-xs sm:text-sm text-center sm:text-right'>
              © {new Date().getFullYear()} IconicoSpace. Todos los derechos
              reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

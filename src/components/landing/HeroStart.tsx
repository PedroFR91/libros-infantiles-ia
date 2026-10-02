"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Gift } from "lucide-react";
import { BookMockup } from "@/components/BookMockup";

const NAME_MAX = 40;

/**
 * Hero de la landing: titular, campo de nombre y libro de muestra que se
 * actualiza mientras escribes. El botón lleva a /editor?name=<nombre>.
 * Sin JS, el <form method="get"> hace lo mismo de forma nativa.
 */
export function HeroStart() {
  const router = useRouter();
  const [name, setName] = useState("");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = name.trim().slice(0, NAME_MAX);
    router.push(clean ? `/editor?name=${encodeURIComponent(clean)}` : "/editor");
  };

  return (
    <section
      id='empezar'
      aria-labelledby='hero-titulo'
      className='px-4 pt-8 pb-14 sm:pt-14 sm:pb-20 overflow-hidden'>
      <div className='max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center'>
        <div>
          <p className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft text-primary-hover font-bold text-sm mb-5'>
            <Gift className='w-4 h-4' aria-hidden />
            Un regalo para niños de 3 a 8 años
          </p>

          <h1
            id='hero-titulo'
            className='font-display font-semibold text-[2.4rem] leading-[1.08] sm:text-6xl tracking-tight text-text mb-5'>
            Regala un cuento donde el héroe{" "}
            <span className='text-primary'>lleva su nombre</span>
          </h1>

          <p className='text-lg sm:text-xl text-text-muted mb-7 max-w-xl'>
            Escribe su nombre y lo que le gusta. En unos minutos lees su
            historia y ves su portada,{" "}
            <strong className='text-text'>gratis y sin tarjeta</strong>. Si te
            enamora, la ilustramos entera y te llega impresa a casa.
          </p>

          <form
            action='/editor'
            method='get'
            onSubmit={onSubmit}
            className='rounded-2xl bg-bg-light border border-border card-shadow p-4 sm:p-5 max-w-xl'>
            <label htmlFor='hero-name' className='block font-bold mb-2'>
              ¿Cómo se llama el protagonista?
            </label>
            <div className='flex flex-col sm:flex-row gap-3'>
              <input
                id='hero-name'
                name='name'
                type='text'
                inputMode='text'
                autoComplete='off'
                autoCapitalize='words'
                enterKeyHint='go'
                maxLength={NAME_MAX}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Por ejemplo, Sofía'
                className='flex-1 min-w-0 min-h-13 px-4 text-lg rounded-xl bg-surface border-2 border-border-strong text-text placeholder:text-text-muted/80 focus:border-primary focus:outline-none'
              />
              <button
                type='submit'
                className='min-h-13 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-lg transition-colors animate-pulse-glow'>
                Empezar su cuento gratis
                <ArrowRight className='w-5 h-5' aria-hidden />
              </button>
            </div>
            <ul className='mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-text-muted text-[0.95rem]'>
              {["Sin tarjeta", "Sin crear cuenta", "Pagas solo si te gusta"].map((t) => (
                <li key={t} className='inline-flex items-center gap-1.5'>
                  <Check className='w-4 h-4 text-success' aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </form>

          <p className='mt-5 text-text-muted'>
            ¿Ya tienes un cuento?{" "}
            <Link
              href='/mis-libros'
              className='font-semibold text-primary hover:text-primary-hover underline underline-offset-2'>
              Recupéralo con tu email
            </Link>
          </p>
        </div>

        <div className='lg:pl-4'>
          <div className='animate-float'>
            <BookMockup name={name} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Libro abierto dibujado con CSS + SVG (no es una foto ni un libro real).
 * Izquierda: portada de muestra genérica; derecha: primera página de texto.
 * Se etiqueta siempre como "Ilustración orientativa".
 */
export function BookMockup({
  name,
  className = "",
}: {
  /** Nombre del protagonista; si está vacío se muestra "su nombre". */
  name?: string;
  className?: string;
}) {
  const shown = (name ?? "").trim().slice(0, 18) || "su nombre";
  const isPlaceholder = !(name ?? "").trim();
  const titleSize =
    shown.length > 12 ? "text-[0.95rem] sm:text-xl" : "text-lg sm:text-2xl";

  return (
    <figure className={`w-full ${className}`}>
      <div className='relative mx-auto w-full max-w-[560px]'>
        {/* Sombra bajo el libro */}
        <div
          className='absolute inset-x-6 -bottom-3 h-6 rounded-[50%] bg-[#2b2118]/15 blur-md'
          aria-hidden
        />
        {/* Cantos de las páginas */}
        <div
          className='absolute inset-x-1 top-2 -bottom-1.5 rounded-lg bg-[#efe4d2] border border-border-strong'
          aria-hidden
        />
        <div
          className='relative grid grid-cols-2 aspect-[2/1] rounded-lg overflow-hidden book-shadow border border-border-strong bg-[#fffdf8]'
          role='img'
          aria-label={`Ilustración orientativa de un cuento abierto: a la izquierda la portada «La gran aventura de ${shown}», a la derecha la primera página.`}>
          {/* Página izquierda: portada de muestra */}
          <div className='relative h-full min-h-0 overflow-hidden'>
            <svg
              viewBox='0 0 200 200'
              className='absolute inset-0 w-full h-full'
              preserveAspectRatio='xMidYMid slice'
              aria-hidden>
              <defs>
                <linearGradient id='bm-sky' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0' stopColor='#1E3A5F' />
                  <stop offset='0.7' stopColor='#3E5F8A' />
                  <stop offset='1' stopColor='#F2B988' />
                </linearGradient>
                <linearGradient id='bm-hill' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0' stopColor='#E07B3C' />
                  <stop offset='1' stopColor='#C2410C' />
                </linearGradient>
              </defs>
              <rect width='200' height='200' fill='url(#bm-sky)' />
              {/* Estrellas */}
              {[
                [12, 16],
                [188, 14],
                [14, 84],
                [186, 74],
                [62, 92],
                [140, 80],
              ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r='1.6' fill='#FFF3D6' />
              ))}
              {/* Luna */}
              <circle cx='166' cy='104' r='14' fill='#FFE7B0' />
              <circle cx='172' cy='99' r='12' fill='#3A5A84' />
              {/* Colinas */}
              <path d='M0 150 Q50 118 100 140 T200 132 V200 H0Z' fill='#F4C59A' />
              <path d='M0 168 Q60 140 120 162 T200 156 V200 H0Z' fill='url(#bm-hill)' />
              {/* Árbol */}
              <rect x='34' y='134' width='4' height='16' rx='1' fill='#7A3E1D' />
              <circle cx='36' cy='128' r='11' fill='#2F6B4F' />
              {/* Cometa */}
              <path d='M120 100 l9 -11 l9 11 l-9 13Z' fill='#FFF8EE' />
              <path d='M129 89 v24 M120 100 h18' stroke='#C2410C' strokeWidth='1.2' />
              <path
                d='M129 113 q-4 10 -12 15 q-6 4 -11 10'
                stroke='#FFF8EE'
                strokeWidth='1'
                fill='none'
                strokeDasharray='2 2'
              />
              {/* Personaje genérico, de espaldas */}
              <g transform='translate(94 128)'>
                <circle cx='6' cy='0' r='6' fill='#5A3A26' />
                <path d='M0 6 h12 l2 16 h-16Z' fill='#FFF8EE' />
                <rect x='1.5' y='22' width='3.5' height='8' rx='1.5' fill='#1E3A5F' />
                <rect x='7' y='22' width='3.5' height='8' rx='1.5' fill='#1E3A5F' />
                <path d='M12 9 l6 -6' stroke='#FFF8EE' strokeWidth='2.4' strokeLinecap='round' />
              </g>
            </svg>
            <div className='absolute inset-x-0 top-0 p-3 sm:p-5 text-center'>
              <p className='text-[0.7rem] sm:text-sm font-semibold text-[#FFE7B0] tracking-wide'>
                La gran aventura de
              </p>
              <p
                className={`font-display font-semibold leading-tight text-white break-words ${titleSize} ${
                  isPlaceholder
                    ? "mt-1 inline-block px-2 rounded-md border-2 border-dashed border-[#FFE7B0]/80"
                    : "mt-0.5"
                }`}>
                {shown}
              </p>
            </div>
          </div>

          {/* Página derecha: primera página de texto */}
          <div className='relative h-full min-h-0 overflow-hidden p-3 sm:p-6 flex flex-col bg-[#fffdf8]'>
            <div
              className='absolute inset-y-0 left-0 w-6 sm:w-8 bg-gradient-to-r from-[#2b2118]/12 to-transparent'
              aria-hidden
            />
            <svg viewBox='0 0 120 56' className='w-full h-auto shrink-0 mb-2 sm:mb-4' aria-hidden>
              <rect width='120' height='56' rx='6' fill='#FDEBDC' />
              <circle cx='96' cy='16' r='8' fill='#F2B988' />
              <path d='M0 44 Q30 30 60 40 T120 36 V56 H0Z' fill='#E9C9A5' />
              <path d='M14 40 l8 -10 l8 10Z' fill='#C2410C' />
              <rect x='16' y='40' width='12' height='9' fill='#FFF8EE' />
            </svg>
            <p className='font-display text-[0.7rem] sm:text-[0.95rem] leading-snug text-text'>
              Aquella noche,{" "}
              <strong className='text-primary font-semibold'>{shown}</strong>{" "}
              miró por la ventana y vio una cometa que brillaba como una
              estrella…
            </p>
            <p className='mt-auto text-right text-[0.65rem] sm:text-xs text-text-muted' aria-hidden>
              1
            </p>
          </div>
        </div>
      </div>
      <figcaption className='mt-4 text-center text-sm text-text-muted'>
        Ilustración orientativa · formato 21×21 cm, portada + 12 páginas
        ilustradas
      </figcaption>
    </figure>
  );
}

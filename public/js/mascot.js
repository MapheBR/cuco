const MASCOT_SVG = `
<svg class="mascot-svg" viewBox="0 0 512 512" role="img" aria-label="Cuco, o pássaro da marca" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="green" x1=".12" y1="0" x2=".88" y2="1"><stop stop-color="#54df79"/><stop offset=".48" stop-color="#19ad59"/><stop offset="1" stop-color="#08743f"/></linearGradient>
    <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4be276"/><stop offset="1" stop-color="#078044"/></linearGradient>
    <linearGradient id="white" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#e8f5ed"/></linearGradient>
    <linearGradient id="orange" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffe16a"/><stop offset=".55" stop-color="#ff9d1b"/><stop offset="1" stop-color="#e96a12"/></linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>
  <ellipse cx="256" cy="465" rx="126" ry="17" fill="#063e2a" opacity=".16" filter="url(#shadow)"/>

  <g class="mascot-body">
    <path d="M151 335 Q91 307 80 345 Q112 383 174 381Z" fill="#087c45" stroke="#075c38" stroke-width="8" stroke-linejoin="round"/>
    <path d="M155 357 Q94 356 94 398 Q143 416 188 384Z" fill="#159b50" stroke="#075c38" stroke-width="8" stroke-linejoin="round"/>
    <path d="M157 270 Q119 325 145 394 Q168 459 256 462 Q348 462 371 391 Q394 320 350 267Z" fill="url(#green)" stroke="#075b38" stroke-width="10" stroke-linejoin="round"/>
    <path d="M177 323 Q157 375 183 419 Q207 449 260 448 Q318 447 340 412 Q363 370 335 322 Q258 347 177 323Z" fill="url(#white)"/>
    <path d="M195 365 Q207 405 237 416" fill="none" stroke="#d8eee0" stroke-width="8" stroke-linecap="round" opacity=".8"/>
    <path d="M157 303 Q103 312 105 366 Q110 415 172 411 Q204 404 223 365 Q197 329 157 303Z" fill="url(#wing)" stroke="#075b38" stroke-width="9" stroke-linejoin="round"/>
    <path d="M129 361 Q154 349 184 367 M132 389 Q163 376 190 386" fill="none" stroke="#8af09d" stroke-width="7" stroke-linecap="round" opacity=".7"/>
    <path d="M215 448 L212 466 M212 464 Q194 465 190 477 Q207 483 221 475 Q234 485 247 477 Q242 465 222 464" fill="none" stroke="#e87917" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M293 448 L296 466 M296 464 Q278 465 274 477 Q291 483 305 475 Q318 485 331 477 Q326 465 306 464" fill="none" stroke="#e87917" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <g class="wave-arm">
    <path d="M347 315 Q389 304 403 337 Q417 371 391 405 Q369 432 337 413 Q316 399 323 373Z" fill="url(#wing)" stroke="#075b38" stroke-width="9" stroke-linejoin="round"/>
    <path d="M355 321 Q348 283 368 253 Q381 235 395 250 Q405 263 394 291 Q422 277 435 294 Q445 310 427 326 Q447 330 445 348 Q443 365 420 369 Q434 386 419 399 Q401 415 381 396 L354 376Z" fill="url(#green)" stroke="#075b38" stroke-width="9" stroke-linejoin="round"/>
    <path d="M391 304 Q405 298 419 306 M397 339 Q413 332 429 340 M389 372 Q403 366 416 375" fill="none" stroke="#a0f5a9" stroke-width="6" stroke-linecap="round" opacity=".8"/>
  </g>

  <g class="mascot-head">
    <path d="M146 215 Q139 127 202 91 Q217 48 247 76 Q269 42 293 83 Q354 91 375 151 Q399 214 365 278 Q335 326 256 326 Q174 326 145 269 Q132 243 146 215Z" fill="url(#green)" stroke="#075b38" stroke-width="10" stroke-linejoin="round"/>
    <path d="M210 94 Q190 54 218 43 Q239 39 251 75 Q262 39 283 50 Q302 62 289 94" fill="#49d96d" stroke="#075b38" stroke-width="8" stroke-linejoin="round"/>
    <path d="M218 57 Q233 59 245 83 M271 62 Q278 73 278 88" fill="none" stroke="#a5f5a9" stroke-width="6" stroke-linecap="round"/>
    <path d="M164 204 Q168 145 216 139 Q241 134 256 159 Q278 131 311 141 Q354 153 358 207 Q365 272 310 291 Q256 311 202 290 Q153 270 164 204Z" fill="url(#white)"/>
    <path d="M190 169 Q210 151 232 166 M280 165 Q304 148 325 165" fill="none" stroke="#075333" stroke-width="9" stroke-linecap="round"/>
    <g class="eye eye-left">
      <ellipse cx="214" cy="207" rx="25" ry="33" fill="#064b36"/>
      <ellipse cx="216" cy="214" rx="16" ry="23" fill="#0b8d58"/>
      <circle cx="208" cy="196" r="9" fill="#fff"/>
      <circle cx="224" cy="220" r="4" fill="#b9ffd0"/>
    </g>
    <g class="eye eye-right">
      <ellipse cx="299" cy="207" rx="25" ry="33" fill="#064b36"/>
      <ellipse cx="297" cy="214" rx="16" ry="23" fill="#0b8d58"/>
      <circle cx="291" cy="196" r="9" fill="#fff"/>
      <circle cx="305" cy="220" r="4" fill="#b9ffd0"/>
    </g>
    <path d="M244 226 Q256 216 269 226 Q290 221 313 231 Q297 250 278 255 Q257 259 239 245 Q231 236 244 226Z" fill="url(#orange)" stroke="#d9680d" stroke-width="5" stroke-linejoin="round"/>
    <path d="M247 231 Q269 235 302 233" fill="none" stroke="#fff0a3" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="178" cy="247" rx="10" ry="5" fill="#f5a5a0" opacity=".45"/><ellipse cx="337" cy="247" rx="10" ry="5" fill="#f5a5a0" opacity=".45"/>
  </g>
</svg>`;

const GRADIENTS = ['green', 'wing', 'white', 'orange', 'shadow'];

export function mascotSvg(state = 'calmo', extraClass = '') {
  const uid = Math.random().toString(36).slice(2, 10);
  let svg = MASCOT_SVG;
  for (const id of GRADIENTS) {
    svg = svg.replaceAll(`id="${id}"`, `id="${id}-${uid}"`).replaceAll(`url(#${id})`, `url(#${id}-${uid})`);
  }
  return svg.replace('mascot-svg"', `mascot-svg mood-${state} ${extraClass}"`);
}

export function mascotMood(summary) {
  if (!summary) return 'calmo';
  if (summary.attention?.length > 0) return 'urgente';
  if (summary.stats?.today > 0) return 'atento';
  if (summary.stats?.completed > 0) return 'comemorando';
  return 'calmo';
}

export const MASCOT_LINES = {
  calmo: 'Tudo tranquilo por aqui. Sua escala está em dia!',
  atento: 'Tem gente escalada hoje. Vamos conferir juntos?',
  urgente: 'Atenção: existem escalas que precisam da sua revisão.',
  comemorando: 'Mandou bem! As escalas concluídas estão no ponto.',
};

export function initMascotInteractions() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { passive: true });

  function tick() {
    if (!document.body.classList.contains('animations-paused')) {
      document.querySelectorAll('.mascot-svg').forEach((svg) => {
      if (!svg.getClientRects().length) return;
      const rect = svg.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (pointer.x - (rect.left + rect.width / 2)) / Math.max(1, window.innerWidth / 2)));
      const dy = Math.max(-1, Math.min(1, (pointer.y - (rect.top + rect.height / 2)) / Math.max(1, window.innerHeight / 2)));
      svg.style.setProperty('--look-x', `${(dx * 8).toFixed(1)}px`);
      svg.style.setProperty('--look-y', `${(dy * 6).toFixed(1)}px`);
      svg.style.setProperty('--tilt', `${(dx * 7).toFixed(1)}deg`);
      svg.style.setProperty('--lean-x', `${(dx * 9).toFixed(1)}px`);
      });
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  const actions = ['blink', 'hop', 'tilt', 'wave', 'peek'];
  function surprise() {
    if (document.body.classList.contains('animations-paused')) {
      setTimeout(surprise, 1500);
      return;
    }
    const visible = [...document.querySelectorAll('.mascot-svg')].filter((svg) => svg.getClientRects().length);
    if (visible.length) {
      const svg = visible[Math.floor(Math.random() * visible.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      svg.classList.add(`do-${action}`);
      setTimeout(() => svg.classList.remove(`do-${action}`), 650 + Math.random() * 550);
    }
    setTimeout(surprise, 1800 + Math.random() * 4200);
  }
  setTimeout(surprise, 1400);
}

/* ================================================================
 * DOMSentinel v2.1 — All Possible Use Case Examples
 *
 * Every example builds on the previous one by adding one option.
 * Min = only required params. Max = every option used together.
 *
 * SECTIONS
 *   A  relation: 'target'  (A-1 … A-12)
 *   B  relation: 'parent'  (B-1 … B-12)
 *   C  relation: 'child'   (C-1 … C-12)
 *   D  Lifecycle & runtime API
 *
 * OPTION MATRIX (end of file)
 * ================================================================ */

const sentinel = new DOMSentinel({ debug: false });


/* ================================================================
 * A — relation: 'target'
 *
 * The .card-product element ITSELF was added, removed,
 * or had its own attribute / text content changed.
 * ================================================================ */

/* ----------------------------------------------------------------
 * A-1 | MINIMUM  (selector + eventName only)
 * Listen for the event separately on document.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'target',       // default — can be omitted
  eventName: 'card:a1',
});
document.addEventListener('card:a1', ({ detail }) => {
  console.log('[A-1] card mutated:', detail.element);
});


/* ----------------------------------------------------------------
 * A-2 | + callback
 * Inline function — no separate addEventListener needed.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'target',
  eventName: 'card:a2',
  callback:  ({ element }) => {
    console.log('[A-2] card mutated (inline):', element);
  },
});


/* ----------------------------------------------------------------
 * A-3 | + relationSelector
 * Only fire when the card was added/removed inside .product-grid.
 * Cards injected into a recommendations sidebar are ignored.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'target',
  relationSelector: '.product-grid',
  eventName:        'card:a3',
  callback:         ({ element }) => {
    console.log('[A-3] card mutated inside .product-grid:', element);
  },
});


/* ----------------------------------------------------------------
 * A-4 | + filter
 * Only fire for featured cards (data-product-type="featured").
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'target',
  eventName: 'card:a4',
  filter:    (card) => card.dataset.productType === 'featured',
  callback:  ({ element }) => {
    console.log('[A-4] featured card appeared:', element.dataset.productId);
  },
});


/* ----------------------------------------------------------------
 * A-5 | + debounce
 * AJAX filter adds 24 cards at once — wait 100 ms for burst to end.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'target',
  eventName: 'card:a5',
  debounce:  100,
  callback:  ({ element }) => {
    console.log('[A-5] card settled after burst:', element);
  },
});


/* ----------------------------------------------------------------
 * A-6 | + once
 * Fire only for the very first card that appears, then stop.
 * Useful for one-time initialization that needs a card present.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'target',
  eventName: 'card:a6',
  once:      true,
  callback:  () => {
    console.log('[A-6] first card ever — init tooltips');
    // initTooltips();
  },
});


/* ----------------------------------------------------------------
 * A-7 | + maxTriggers
 * Track only the first 5 card impressions, then auto-remove.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:    '.card-product',
  relation:    'target',
  eventName:   'card:a7',
  maxTriggers: 5,
  callback:    ({ element }) => {
    window.analytics?.track('card_impression', {
      productId: element.dataset.productId,
    });
  },
});


/* ----------------------------------------------------------------
 * A-8 | + relationSelector + filter
 * Inside .product-grid only — AND card must not be already loaded.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'target',
  relationSelector: '.product-grid',
  eventName:        'card:a8',
  filter:           (card) => card.dataset.reviewLoaded !== 'true',
  callback:         ({ element: card }) => {
    console.log('[A-8] unloaded card appeared in grid:', card.dataset.productId);
  },
});


/* ----------------------------------------------------------------
 * A-9 | + filter + debounce
 * Only unloaded cards, debounced — safe to call a slow API.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'target',
  eventName: 'card:a9',
  filter:    (card) => card.dataset.reviewLoaded !== 'true',
  debounce:  80,
  callback:  async ({ element: card, added, removed }) => {
    if (removed.length && !added.length) return; // card left DOM — skip

    card.dataset.reviewLoaded = 'true';
    try {
      const res  = await fetch(`/apps/reviews/api?product_id=${card.dataset.productId}`);
      const data = await res.json();
      const el   = card.querySelector('.card-product__review');
      if (el) el.innerHTML = `★ ${data.rating} (${data.count})`;
    } catch {
      card.dataset.reviewLoaded = 'false'; // allow retry
    }
  },
});


/* ----------------------------------------------------------------
 * A-10 | + filter + once + debounce
 * Fire once when the first sale card appears in the grid, debounced.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'target',
  relationSelector: '.product-grid',
  eventName:        'card:a10',
  filter:           (card) => card.querySelector('.badge--sale') !== null,
  debounce:         60,
  once:             true,
  callback:         ({ element }) => {
    console.log('[A-10] first sale card in grid:', element.dataset.productId);
  },
});


/* ----------------------------------------------------------------
 * A-11 | + filter + maxTriggers + debounce
 * Track up to 3 new-arrival impressions, debounced.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:    '.card-product',
  relation:    'target',
  eventName:   'card:a11',
  filter:      (card) => card.dataset.badge === 'new',
  debounce:    60,
  maxTriggers: 3,
  callback:    ({ element }) => {
    window.analytics?.track('new_arrival_impression', {
      productId: element.dataset.productId,
    });
  },
});


/* ----------------------------------------------------------------
 * A-12 | MAXIMUM — all options combined
 * In-stock cards inside .product-grid, debounced, fire up to 10×,
 * event + callback both active.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'target',
  relationSelector: '.product-grid',
  eventName:        'card:a12',
  filter:           (card) => card.dataset.inStock === 'true',
  debounce:         150,
  once:             false,
  maxTriggers:      10,
  callback:         ({ element, timestamp }) => {
    console.log('[A-12] in-stock card at', timestamp, element.dataset.productId);
  },
});
document.addEventListener('card:a12', ({ detail }) => {
  window.analytics?.track('instock_card_appeared', {
    productId: detail.element.dataset.productId,
  });
});


/* ================================================================
 * B — relation: 'parent'
 *
 * A PARENT of .card-product had children added or removed —
 * i.e. cards entered or left a container element.
 * ================================================================ */

/* ----------------------------------------------------------------
 * B-1 | MINIMUM
 * Any parent of any .card-product that receives a childList mutation.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'parent',
  eventName: 'grid:b1',
});
document.addEventListener('grid:b1', ({ detail }) => {
  console.log('[B-1] a card parent changed:', detail.element);
});


/* ----------------------------------------------------------------
 * B-2 | + callback
 * Update a "Showing N results" counter whenever the grid changes.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'parent',
  eventName: 'grid:b2',
  callback:  ({ element: parent }) => {
    const count   = parent.querySelectorAll('.card-product').length;
    const counter = document.querySelector('.results-count');
    if (counter) counter.textContent = `Showing ${count} products`;
  },
});


/* ----------------------------------------------------------------
 * B-3 | + relationSelector
 * Narrow to .product-grid — ignore cards added to other containers
 * like a quick-view modal or recommendations widget.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'parent',
  relationSelector: '.product-grid',
  eventName:        'grid:b3',
  callback:         ({ element: grid }) => {
    console.log('[B-3] .product-grid changed:', grid);
  },
});


/* ----------------------------------------------------------------
 * B-4 | + filter
 * Only fire when the grid still has cards — skip the "all removed" case.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'parent',
  eventName: 'grid:b4',
  filter:    (grid) => grid.querySelectorAll('.card-product').length > 0,
  callback:  ({ element: grid }) => {
    console.log('[B-4] grid non-empty:', grid.querySelectorAll('.card-product').length);
  },
});


/* ----------------------------------------------------------------
 * B-5 | + debounce
 * AJAX filter replaces all cards rapidly — batch into one callback.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'parent',
  eventName: 'grid:b5',
  debounce:  200,
  callback:  ({ element: parent }) => {
    console.log('[B-5] grid settled:', parent.querySelectorAll('.card-product').length, 'cards');
  },
});


/* ----------------------------------------------------------------
 * B-6 | + once
 * Detect the first time any cards are loaded into any container.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'parent',
  eventName: 'grid:b6',
  once:      true,
  callback:  ({ element: parent }) => {
    console.log('[B-6] cards loaded for first time into:', parent);
  },
});


/* ----------------------------------------------------------------
 * B-7 | + maxTriggers
 * Allow exactly 2 grid mutations — initial load + first filter only.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:    '.card-product',
  relation:    'parent',
  eventName:   'grid:b7',
  maxTriggers: 2,
  callback:    ({ element: parent }) => {
    console.log('[B-7] grid update (tracked ≤2):', parent);
  },
});


/* ----------------------------------------------------------------
 * B-8 | + relationSelector + filter
 * Show/hide empty state — only for .product-grid, only when needed.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'parent',
  relationSelector: '.product-grid',
  eventName:        'grid:b8',
  filter:           (_grid, { added, removed }) =>
    added.length > 0 || removed.length > 0,
  callback:         ({ element: grid }) => {
    const remaining = grid.querySelectorAll('.card-product').length;
    const emptyMsg  = document.querySelector('.product-grid__empty');
    if (emptyMsg) emptyMsg.hidden = remaining > 0;
  },
});


/* ----------------------------------------------------------------
 * B-9 | + relationSelector + debounce
 * Hide the loading spinner only after .product-grid settles.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'parent',
  relationSelector: '.product-grid',
  eventName:        'grid:b9',
  debounce:         150,
  callback:         () => {
    const spinner = document.querySelector('.grid-spinner');
    if (spinner) spinner.hidden = true;
  },
});


/* ----------------------------------------------------------------
 * B-10 | + filter + debounce + callback
 * Analytics: send result count only when it actually changed.
 * ---------------------------------------------------------------- */
let lastSentCount = -1;
sentinel.watch({
  selector:         '.card-product',
  relation:         'parent',
  relationSelector: '.product-grid',
  eventName:        'grid:b10',
  debounce:         300,
  filter:           (grid) => {
    const count = grid.querySelectorAll('.card-product').length;
    return count !== lastSentCount;
  },
  callback: ({ element: grid }) => {
    const count  = grid.querySelectorAll('.card-product').length;
    lastSentCount = count;
    window.analytics?.track('filter_results_updated', { count, url: location.href });
  },
});


/* ----------------------------------------------------------------
 * B-11 | + filter + once + debounce
 * Fire once when the grid first becomes non-empty after a filter.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'parent',
  relationSelector: '.product-grid',
  eventName:        'grid:b11',
  filter:           (grid) => grid.querySelectorAll('.card-product').length > 0,
  debounce:         100,
  once:             true,
  callback:         ({ element: grid }) => {
    console.log('[B-11] grid populated for first time:', grid);
  },
});


/* ----------------------------------------------------------------
 * B-12 | MAXIMUM — all options combined
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'parent',
  relationSelector: '.product-grid',
  eventName:        'grid:b12',
  filter:           (grid) => grid.querySelectorAll('.card-product').length > 0,
  debounce:         200,
  once:             false,
  maxTriggers:      20,
  callback:         ({ element: grid, added, removed }) => {
    const a = added.filter(n => n.nodeType === Node.ELEMENT_NODE).length;
    const r = removed.filter(n => n.nodeType === Node.ELEMENT_NODE).length;
    console.log(`[B-12] +${a} -${r}`);
  },
});
document.addEventListener('grid:b12', ({ detail }) => {
  console.log('[B-12 event] fired at', detail.timestamp);
});


/* ================================================================
 * C — relation: 'child'
 *
 * Something INSIDE a .card-product was mutated —
 * attribute change, text update, or inner node add / remove.
 * ================================================================ */

/* ----------------------------------------------------------------
 * C-1 | MINIMUM
 * Any mutation anywhere inside any card.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'child',
  eventName: 'card:c1',
});
document.addEventListener('card:c1', ({ detail }) => {
  console.log('[C-1] something changed inside card:', detail.element);
});


/* ----------------------------------------------------------------
 * C-2 | + callback
 * Normalize markup injected by a third-party review app.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'child',
  eventName: 'card:c2',
  callback:  ({ element: card, added }) => {
    added.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.classList.contains('third-party-stars')) {
        node.classList.add('card-product__stars');
      }
    });
  },
});


/* ----------------------------------------------------------------
 * C-3 | + relationSelector
 * Only fire when the mutation is inside .card-product__price.
 * All other inner changes (image swap, badge, button) are ignored.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'child',
  relationSelector: '.card-product__price',
  eventName:        'card:c3',
  callback:         ({ element: card, oldValue }) => {
    const newPrice = card.querySelector('.card-product__price')?.textContent.trim();
    console.log('[C-3] price changed:', oldValue, '→', newPrice);
  },
});


/* ----------------------------------------------------------------
 * C-4 | + filter
 * Only fire when the wishlist button carries the --active modifier.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'child',
  eventName: 'card:c4',
  filter:    (card) => card.querySelector('.wishlist-btn--active') !== null,
  callback:  ({ element: card }) => {
    window.analytics?.track('wishlist_add', { productId: card.dataset.productId });
  },
});


/* ----------------------------------------------------------------
 * C-5 | + debounce
 * Quantity input fires characterData on every keystroke — debounce.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'child',
  eventName: 'card:c5',
  debounce:  400,
  callback:  ({ element: card }) => {
    const qty = card.querySelector('.qty-input')?.value;
    console.log('[C-5] qty settled:', qty, 'for', card.dataset.productId);
  },
});


/* ----------------------------------------------------------------
 * C-6 | + once
 * Detect the first time a card's "Add to cart" button is disabled
 * (went out of stock), mark the card, then stop.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'child',
  eventName: 'card:c6',
  once:      true,
  filter:    (card) => card.querySelector('.add-to-cart[disabled]') !== null,
  callback:  ({ element: card }) => {
    card.classList.add('card-product--oos');
  },
});


/* ----------------------------------------------------------------
 * C-7 | + maxTriggers
 * Allow the low-stock badge to update at most 3× before giving up.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'child',
  relationSelector: '.low-stock-badge',
  eventName:        'card:c7',
  maxTriggers:      3,
  callback:         ({ element: card }) => {
    console.log('[C-7] low-stock updated:', card.querySelector('.low-stock-badge')?.textContent);
  },
});


/* ----------------------------------------------------------------
 * C-8 | + relationSelector + filter
 * Variant image swap: only fire when .card-product__image src changes.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'child',
  relationSelector: '.card-product__image',
  eventName:        'card:c8',
  filter:           (_card, { attributeName }) => attributeName === 'src',
  callback:         ({ element: card, oldValue }) => {
    const newSrc = card.querySelector('.card-product__image')?.getAttribute('src');
    console.log('[C-8] image swapped:', oldValue, '→', newSrc);
  },
});


/* ----------------------------------------------------------------
 * C-9 | + relationSelector + debounce
 * Stock message updates rapidly during live inventory polling —
 * debounce so analytics only fires once per settled value.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'child',
  relationSelector: '.card-product__stock-msg',
  eventName:        'card:c9',
  debounce:         250,
  callback:         ({ element: card }) => {
    const msg = card.querySelector('.card-product__stock-msg')?.textContent.trim();
    window.analytics?.track('stock_message_shown', {
      productId: card.dataset.productId,
      message:   msg,
    });
  },
});


/* ----------------------------------------------------------------
 * C-10 | + filter + once + debounce
 * Detect when a card's video starts playing (autoplay attr added
 * by a lazy-load script). Fire once per page.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:  '.card-product',
  relation:  'child',
  eventName: 'card:c10',
  debounce:  50,
  once:      true,
  filter:    (card) => {
    const video = card.querySelector('video');
    return video !== null && !video.paused;
  },
  callback:  ({ element: card }) => {
    console.log('[C-10] video autoplay on:', card.dataset.productId);
  },
});


/* ----------------------------------------------------------------
 * C-11 | + relationSelector + filter + debounce + maxTriggers
 * Price changes inside .card-product__price, only positive values,
 * debounced, tracked up to 50 times.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'child',
  relationSelector: '.card-product__price',
  eventName:        'card:c11',
  filter:           (card) => {
    const text  = card.querySelector('.card-product__price')?.textContent ?? '';
    const value = parseFloat(text.replace(/[^0-9.]/g, ''));
    return value > 0;
  },
  debounce:    100,
  maxTriggers: 50,
  callback:    ({ element: card, oldValue }) => {
    const newPrice = card.querySelector('.card-product__price')?.textContent.trim();
    window.analytics?.track('price_change', {
      productId: card.dataset.productId,
      oldValue,
      newPrice,
    });
  },
});


/* ----------------------------------------------------------------
 * C-12 | MAXIMUM — all options combined
 * event + callback both active.
 * ---------------------------------------------------------------- */
sentinel.watch({
  selector:         '.card-product',
  relation:         'child',
  relationSelector: '.card-product__price',
  eventName:        'card:c12',
  filter:           (card) => {
    const price = card.querySelector('.card-product__price')?.textContent ?? '';
    return parseFloat(price.replace(/[^0-9.]/g, '')) > 0;
  },
  debounce:    100,
  once:        false,
  maxTriggers: 50,
  callback:    ({ element: card, oldValue, timestamp }) => {
    const newPrice = card.querySelector('.card-product__price')?.textContent.trim();
    console.log(`[C-12] ${card.dataset.productId}: "${oldValue}" → "${newPrice}" @${timestamp}`);
  },
});
document.addEventListener('card:c12', ({ detail }) => {
  console.log('[C-12 event]', detail.element.dataset.productId);
});


/* ================================================================
 * D — Lifecycle & runtime API
 * ================================================================ */

/* ----------------------------------------------------------------
 * D-1 | unwatch — remove a specific watcher after N seconds
 * ---------------------------------------------------------------- */
const tempId = sentinel.watch({
  selector:  '.card-product',
  relation:  'target',
  eventName: 'card:temp',
  callback:  ({ element }) => console.log('[D-1] temp:', element),
});
setTimeout(() => sentinel.unwatch(tempId), 5000);


/* ----------------------------------------------------------------
 * D-2 | pause + resume — suppress reactions during our own writes
 * ---------------------------------------------------------------- */
function replaceGridCards(html) {
  sentinel.pause();
  const grid = document.querySelector('.product-grid');
  if (grid) grid.innerHTML = html;
  sentinel.resume();
}


/* ----------------------------------------------------------------
 * D-3 | isPaused — guard before doing expensive work
 * ---------------------------------------------------------------- */
function maybeDoWork() {
  if (sentinel.isPaused) return;
  // safe to proceed
}


/* ----------------------------------------------------------------
 * D-4 | listWatchers — runtime debugging
 * ---------------------------------------------------------------- */
console.table(sentinel.listWatchers());


/* ----------------------------------------------------------------
 * D-5 | destroy — full teardown on page unload or SPA route change
 * ---------------------------------------------------------------- */
window.addEventListener('beforeunload', () => sentinel.destroy());
// SPA teardown example (Shopify):
// document.addEventListener('shopify:section:unload', () => sentinel.destroy());


/* ================================================================
 * OPTION MATRIX
 *
 * rel     = relation
 * relSel  = relationSelector
 * fil     = filter
 * cb      = callback
 * deb     = debounce
 * once    = once
 * maxT    = maxTriggers
 *
 *  #    rel      relSel  fil   cb   deb   once  maxT
 * ─────────────────────────────────────────────────
 *  A-1  target     —      —    —    —     —     —
 *  A-2  target     —      —    ✓    —     —     —
 *  A-3  target     ✓      —    ✓    —     —     —
 *  A-4  target     —      ✓    ✓    —     —     —
 *  A-5  target     —      —    ✓    ✓     —     —
 *  A-6  target     —      —    ✓    —     ✓     —
 *  A-7  target     —      —    ✓    —     —     ✓
 *  A-8  target     ✓      ✓    ✓    —     —     —
 *  A-9  target     —      ✓    ✓    ✓     —     —
 *  A-10 target     ✓      ✓    ✓    ✓     ✓     —
 *  A-11 target     —      ✓    ✓    ✓     —     ✓
 *  A-12 target     ✓      ✓    ✓    ✓     —     ✓   ← MAX
 *
 *  B-1  parent     —      —    —    —     —     —
 *  B-2  parent     —      —    ✓    —     —     —
 *  B-3  parent     ✓      —    ✓    —     —     —
 *  B-4  parent     —      ✓    ✓    —     —     —
 *  B-5  parent     —      —    ✓    ✓     —     —
 *  B-6  parent     —      —    ✓    —     ✓     —
 *  B-7  parent     —      —    ✓    —     —     ✓
 *  B-8  parent     ✓      ✓    ✓    —     —     —
 *  B-9  parent     ✓      —    ✓    ✓     —     —
 *  B-10 parent     ✓      ✓    ✓    ✓     —     —
 *  B-11 parent     ✓      ✓    ✓    ✓     ✓     —
 *  B-12 parent     ✓      ✓    ✓    ✓     —     ✓   ← MAX
 *
 *  C-1  child      —      —    —    —     —     —
 *  C-2  child      —      —    ✓    —     —     —
 *  C-3  child      ✓      —    ✓    —     —     —
 *  C-4  child      —      ✓    ✓    —     —     —
 *  C-5  child      —      —    ✓    ✓     —     —
 *  C-6  child      —      ✓    ✓    —     ✓     —
 *  C-7  child      ✓      —    ✓    —     —     ✓
 *  C-8  child      ✓      ✓    ✓    —     —     —
 *  C-9  child      ✓      —    ✓    ✓     —     —
 *  C-10 child      —      ✓    ✓    ✓     ✓     —
 *  C-11 child      ✓      ✓    ✓    ✓     —     ✓
 *  C-12 child      ✓      ✓    ✓    ✓     —     ✓   ← MAX
 * ================================================================ */

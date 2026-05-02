/* ============================================================
 * DOMSentinel v2.1
 * Production-grade DOM mutation detection system.
 *
 * One MutationObserver watches the entire document.
 * Any number of watchers can be registered independently,
 * each with its own matching rules, filters, and lifecycle.
 *
 * HOW IT WORKS
 * ─────────────
 *  1. A single MutationObserver fires on every DOM change.
 *  2. Each registered watcher runs its match strategy.
 *  3. On a match, an optional filter predicate is applied.
 *  4. If the match passes, debounce → fire → lifecycle checks.
 *  5. Firing dispatches a CustomEvent AND calls an inline callback.
 *
 * RELATION VALUES
 * ───────────────
 *  'target'  The selector element itself was added / removed / changed.
 *  'parent'  A parent of the selector had children added or removed.
 *  'child'   Something inside the selector element was mutated.
 *
 * RELATION SELECTOR (optional, all three relations)
 * ──────────────────────────────────────────────────
 *  'target'  The mutation must originate inside this container.
 *  'parent'  The parent element must match this selector.
 *  'child'   The mutation must originate inside this child subtree.
 * ============================================================ */

class DOMSentinel {

  /* ── private state ────────────────────────────────────────── */

  #observer       = null;      // shared MutationObserver instance
  #watchers       = [];        // active WatchConfig objects
  #debounceTimers = new Map(); // watchId → setTimeout handle
  #triggerCounts  = new Map(); // watchId → fire count
  #paused         = false;     // true  → skip all mutation processing
  #idCounter      = 0;         // monotonic id assigned to each watcher
  #debug          = false;     // true  → verbose console output

  /* ── constructor ──────────────────────────────────────────── */

  /**
   * @param {object}  [options]
   * @param {boolean} [options.debug=false]
   *   Log every mutation match and lifecycle event to the console.
   */
  constructor({ debug = false } = {}) {
    this.#debug = debug;

    this.#observer = new MutationObserver(this.#onMutations.bind(this));

    // One observe call covers the whole document.
    // Per-watcher filtering is done in JS — far cheaper than
    // creating a separate MutationObserver for every watcher.
    this.#observer.observe(document.documentElement, {
      childList:              true,  // node add / remove
      subtree:                true,  // all descendants, not just direct children
      attributes:             true,  // attribute value changes
      characterData:          true,  // text node content changes
      attributeOldValue:      true,  // expose previous attribute value
      characterDataOldValue:  true,  // expose previous text value
    });

    this.#log('initialized');
  }

  /* ══════════════════════════════════════════════════════════
   * PRIVATE — mutation pipeline
   * ══════════════════════════════════════════════════════════ */

  /* ── entry point ────────────────────────────────────────── */

  /**
   * Called by MutationObserver with a batch of records.
   * Skipped in full when paused.
   * Each watcher is tried independently; a throw in one never
   * disrupts the rest of the batch.
   *
   * @param {MutationRecord[]} mutations
   */
  #onMutations(mutations) {
    if (this.#paused) return;

    for (const mutation of mutations) {
      for (const watcher of this.#watchers) {
        try {
          const matched = this.#resolveMatch(mutation, watcher);
          if (matched) this.#handleMatch(matched, mutation, watcher);
        } catch (err) {
          console.error(`[DOMSentinel] Watcher #${watcher.id} threw:`, err);
        }
      }
    }
  }

  /* ── step 1 — route to the correct match strategy ───────── */

  /**
   * Selects the match function based on watcher.relation and
   * forwards all required arguments.
   *
   * @param  {MutationRecord} mutation
   * @param  {object}         watcher
   * @returns {Element|null}
   */
  #resolveMatch(mutation, watcher) {
    const { selector, relation, relationSelector } = watcher;

    switch (relation) {
      case 'target': return this.#matchTarget(mutation, selector, relationSelector);
      case 'parent': return this.#matchParent(mutation, selector, relationSelector);
      case 'child':  return this.#matchChild (mutation, selector, relationSelector);
      default:       return null;
    }
  }

  /* ── step 2a — 'target' match strategy ─────────────────── */

  /**
   * Succeeds when an added or removed node IS the selector element,
   * or when the selector element's own attribute / text changes.
   *
   * relationSelector (optional):
   *   The mutation.target (the container where add/remove happened)
   *   must be, or be inside, this selector.
   *   This lets you restrict target detection to a specific subtree
   *   (e.g. only .product-grid, not a recommendations sidebar).
   *
   * @param  {MutationRecord} mutation
   * @param  {string}         selector
   * @param  {string|null}    relationSelector
   * @returns {Element|null}
   */
  #matchTarget(mutation, selector, relationSelector) {

    if (mutation.type === 'childList') {
      // If a container constraint is given, bail early when the
      // mutation's parent element is outside that container.
      if (
        relationSelector &&
        mutation.target.nodeType === Node.ELEMENT_NODE &&
        !mutation.target.closest(relationSelector)
      ) return null;

      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];

      for (const node of nodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        // Direct hit — the node itself matches.
        if (node.matches(selector)) return node;

        // Indirect hit — the node is a wrapper that contains the target.
        // Happens when Shopify re-renders a whole section wrapper.
        const inner = node.querySelector?.(selector);
        if (inner) return inner;
      }
    }

    // Attribute or text change — check if it happened on the target itself.
    if (mutation.type === 'attributes' || mutation.type === 'characterData') {
      const el = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target
        : mutation.target.parentElement;

      if (el?.matches(selector)) return el;
    }

    return null;
  }

  /* ── step 2b — 'parent' match strategy ─────────────────── */

  /**
   * Succeeds when the direct parent of a matching element
   * received a childList mutation (cards added / removed from a grid).
   *
   * relationSelector (optional):
   *   The parent element must match this selector.
   *   Prevents reacting to the same card class being inserted into
   *   unrelated containers (e.g. a quick-view modal).
   *
   * @param  {MutationRecord} mutation
   * @param  {string}         selector
   * @param  {string|null}    relationSelector
   * @returns {Element|null}
   */
  #matchParent(mutation, selector, relationSelector) {
    // 'parent' only cares about structural changes, not attribute/text.
    if (mutation.type !== 'childList') return null;

    const parent = mutation.target;
    if (parent.nodeType !== Node.ELEMENT_NODE) return null;

    // Container constraint — bail if this isn't the right parent.
    if (relationSelector && !parent.matches(relationSelector)) return null;

    const nodes = [...mutation.addedNodes, ...mutation.removedNodes];

    for (const node of nodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      // The added/removed node is the target, or wraps it.
      if (node.matches(selector) || node.querySelector?.(selector)) {
        return parent; // Return the parent — that is the "matched" element.
      }
    }

    return null;
  }

  /* ── step 2c — 'child' match strategy ──────────────────── */

  /**
   * Succeeds when a mutation originates anywhere inside a matching
   * element. Uses Element.closest() to walk up from the mutation
   * origin and find the enclosing target.
   *
   * relationSelector (optional):
   *   The mutation origin must be inside this child subtree.
   *   Use to react only to changes within a specific part of the
   *   target (e.g. only the .card-product__price region).
   *
   * @param  {MutationRecord} mutation
   * @param  {string}         selector
   * @param  {string|null}    relationSelector
   * @returns {Element|null}
   */
  #matchChild(mutation, selector, relationSelector) {
    // Resolve origin: prefer the element itself, fall back to its parent.
    const origin = mutation.target.nodeType === Node.ELEMENT_NODE
      ? mutation.target
      : mutation.target.parentElement;

    // Walk up to find the enclosing selector element.
    const target = origin?.closest(selector) ?? null;
    if (!target) return null;

    // Child subtree constraint — origin must live inside the given selector.
    if (relationSelector && !origin.closest(relationSelector)) return null;

    return target;
  }

  /* ── step 3 — apply filter, then debounce or fire ──────── */

  /**
   * Applies the optional filter predicate.
   * If debounce is configured, defers firing; otherwise fires immediately.
   *
   * @param {Element}        element  Matched DOM element.
   * @param {MutationRecord} mutation Raw mutation record.
   * @param {object}         watcher  Active watcher config.
   */
  #handleMatch(element, mutation, watcher) {
    const detail = this.#buildDetail(element, mutation, watcher);

    // Custom filter — return false to silently drop this match.
    if (watcher.filter && !watcher.filter(element, detail)) {
      this.#log(`watcher #${watcher.id} — filter rejected`, element);
      return;
    }

    if (watcher.debounce > 0) {
      // Cancel any pending fire for this watcher, then reschedule.
      clearTimeout(this.#debounceTimers.get(watcher.id));

      const timer = setTimeout(() => {
        this.#debounceTimers.delete(watcher.id);
        this.#fire(element, detail, watcher);
      }, watcher.debounce);

      this.#debounceTimers.set(watcher.id, timer);
    } else {
      this.#fire(element, detail, watcher);
    }
  }

  /* ── step 4 — fire: dispatch event + call callback ──────── */

  /**
   * Increments the trigger count, dispatches the CustomEvent,
   * calls the inline callback, then enforces once / maxTriggers.
   *
   * Both the CustomEvent and the callback always receive the same
   * detail object — no duplication of logic.
   *
   * @param {Element} element
   * @param {object}  detail
   * @param {object}  watcher
   */
  #fire(element, detail, watcher) {
    const count = (this.#triggerCounts.get(watcher.id) ?? 0) + 1;
    this.#triggerCounts.set(watcher.id, count);

    this.#log(`watcher #${watcher.id} fired ×${count}`, detail.mutationType, element);

    // Dispatch CustomEvent — caught by document.addEventListener.
    try {
      document.dispatchEvent(
        new CustomEvent(watcher.eventName, { bubbles: false, detail })
      );
    } catch (err) {
      console.error(`[DOMSentinel] dispatch failed for "${watcher.eventName}":`, err);
    }

    // Inline callback — runs after the event, in the same tick.
    if (typeof watcher.callback === 'function') {
      try {
        watcher.callback(detail);
      } catch (err) {
        console.error(`[DOMSentinel] callback error in watcher #${watcher.id}:`, err);
      }
    }

    // Lifecycle — auto-remove when limits are reached.
    const limitReached = watcher.maxTriggers > 0 && count >= watcher.maxTriggers;
    if (watcher.once || limitReached) {
      this.#log(`watcher #${watcher.id} auto-removed (once=${watcher.once} triggers=${count})`);
      this.unwatch(watcher.id);
    }
  }

  /* ── detail builder ─────────────────────────────────────── */

  /**
   * Builds the payload attached to every CustomEvent and callback.
   * Keeping construction in one place ensures event and callback
   * always receive identical data.
   *
   * @returns {object}
   */
  #buildDetail(element, mutation, watcher) {
    return {
      element,                                      // matched Element
      watcherId:        watcher.id,                 // which watcher fired
      relation:         watcher.relation,           // 'target' | 'parent' | 'child'
      relationSelector: watcher.relationSelector,   // narrowing selector (or null)
      mutationType:     mutation.type,              // 'childList' | 'attributes' | 'characterData'
      added:            [...(mutation.addedNodes   ?? [])], // newly inserted nodes
      removed:          [...(mutation.removedNodes ?? [])], // removed nodes
      attributeName:    mutation.attributeName  ?? null,    // changed attribute name
      oldValue:         mutation.oldValue       ?? null,    // previous value
      timestamp:        Date.now(),
    };
  }

  /* ── logger ─────────────────────────────────────────────── */

  #log(...args) {
    if (this.#debug) console.log('[DOMSentinel]', ...args);
  }

  /* ══════════════════════════════════════════════════════════
   * PUBLIC API
   * ══════════════════════════════════════════════════════════ */

  /**
   * Register a new watcher.
   *
   * ┌─────────────────────────────────────────────────────────┐
   * │  PARAM             TYPE              DEFAULT  REQUIRED  │
   * │  selector          string                —       yes     │
   * │  relation          target|parent|child  target   no      │
   * │  relationSelector  string|null          null     no      │
   * │  eventName         string                —       yes     │
   * │  callback          function|null        null     no      │
   * │  filter            function|null        null     no      │
   * │  debounce          number (ms)          0        no      │
   * │  once              boolean              false    no      │
   * │  maxTriggers       number               0        no      │
   * └─────────────────────────────────────────────────────────┘
   *
   * @param {string} selector
   *   CSS selector for the element of interest.
   *
   * @param {'target'|'parent'|'child'} [relation='target']
   *   'target' — the element itself was added / removed / changed.
   *   'parent' — a parent of the element had children mutated.
   *   'child'  — something inside the element was mutated.
   *
   * @param {string|null} [relationSelector=null]
   *   Narrows the relation to a specific element.
   *   'target' → the add/remove must happen inside this container.
   *   'parent' → the parent must match this selector.
   *   'child'  → the mutation must originate inside this subtree.
   *
   * @param {string} eventName
   *   CustomEvent name dispatched on document when a match fires.
   *
   * @param {function|null} [callback=null]
   *   Inline function called alongside (not instead of) the event.
   *   Receives the same detail object. (detail) => void
   *
   * @param {function|null} [filter=null]
   *   Predicate applied after the relation match.
   *   Return false to drop the match silently.
   *   (element, detail) => boolean
   *
   * @param {number} [debounce=0]
   *   Collapse rapid mutations into one fire after N milliseconds.
   *   0 = disabled (fire immediately).
   *
   * @param {boolean} [once=false]
   *   Auto-remove the watcher after its first successful fire.
   *
   * @param {number} [maxTriggers=0]
   *   Auto-remove after firing this many times. 0 = unlimited.
   *
   * @returns {number} watchId  Pass to unwatch() to remove manually.
   */
  watch({
    selector,
    relation         = 'target',
    relationSelector = null,
    eventName,
    callback         = null,
    filter           = null,
    debounce         = 0,
    once             = false,
    maxTriggers      = 0,
  } = {}) {
    /* ── validation ── */
    if (!selector || typeof selector !== 'string') {
      throw new TypeError('[DOMSentinel] "selector" must be a non-empty string.');
    }
    if (!eventName || typeof eventName !== 'string') {
      throw new TypeError('[DOMSentinel] "eventName" must be a non-empty string.');
    }
    if (!['target', 'parent', 'child'].includes(relation)) {
      throw new TypeError('[DOMSentinel] "relation" must be: target | parent | child');
    }
    if (filter !== null && typeof filter !== 'function') {
      throw new TypeError('[DOMSentinel] "filter" must be a function or null.');
    }
    if (callback !== null && typeof callback !== 'function') {
      throw new TypeError('[DOMSentinel] "callback" must be a function or null.');
    }

    const id = ++this.#idCounter;

    this.#watchers.push({
      id,
      selector,
      relation,
      relationSelector,
      eventName,
      callback,
      filter,
      debounce:    Math.max(0, Number(debounce)    || 0),
      once:        Boolean(once),
      maxTriggers: Math.max(0, Number(maxTriggers) || 0),
    });

    this.#log(`watcher #${id} registered`, { selector, relation, relationSelector, eventName });

    return id;
  }

  /**
   * Remove a watcher by id.
   * Cancels any pending debounce timer for it.
   *
   * @param {number} watchId  Returned by watch().
   */
  unwatch(watchId) {
    clearTimeout(this.#debounceTimers.get(watchId));
    this.#debounceTimers.delete(watchId);
    this.#triggerCounts.delete(watchId);
    this.#watchers = this.#watchers.filter(w => w.id !== watchId);
    this.#log(`watcher #${watchId} removed`);
  }

  /**
   * Pause all mutation processing.
   * Mutations that arrive while paused are permanently discarded.
   * Use pause() before making programmatic DOM writes that should
   * not trigger any watchers, then call resume() when done.
   */
  pause() {
    this.#paused = true;
    this.#log('paused');
  }

  /**
   * Resume mutation processing after pause().
   */
  resume() {
    this.#paused = false;
    this.#log('resumed');
  }

  /**
   * True if the sentinel is currently paused.
   * @returns {boolean}
   */
  get isPaused() {
    return this.#paused;
  }

  /**
   * Snapshot of all active watchers with their trigger counts.
   * Useful for runtime debugging: console.table(sentinel.listWatchers())
   *
   * @returns {object[]}
   */
  listWatchers() {
    return this.#watchers.map(w => ({
      id:               w.id,
      selector:         w.selector,
      relation:         w.relation,
      relationSelector: w.relationSelector,
      eventName:        w.eventName,
      debounce:         w.debounce,
      once:             w.once,
      maxTriggers:      w.maxTriggers,
      triggerCount:     this.#triggerCounts.get(w.id) ?? 0,
    }));
  }

  /**
   * Disconnect the observer and clear all watchers, timers, and state.
   * Call on page unload or SPA route teardown to prevent memory leaks.
   */
  destroy() {
    this.#observer.disconnect();
    this.#debounceTimers.forEach(clearTimeout);
    this.#debounceTimers.clear();
    this.#triggerCounts.clear();
    this.#watchers = [];
    this.#log('destroyed');
  }
}

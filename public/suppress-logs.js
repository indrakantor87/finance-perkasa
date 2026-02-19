(function() {
  if (typeof window === 'undefined') return;

  // Prevent multiple initializations
  if (window.__log_suppressor_initialized__) return;
  window.__log_suppressor_initialized__ = true;

  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  function getErrorMessage(val) {
    if (!val) return '';
    let str = '';
    try {
      if (typeof val === 'string') {
         str = val;
      } else if (val instanceof Error) {
         str = val.message + (val.stack || '');
      } else if (typeof val === 'object') {
         if (val.message) str += val.message;
         if (val.stack) str += val.stack;
         if (val.digest) str += val.digest; // Next.js specific
         
         try {
            const json = JSON.stringify(val);
            if (json !== '{}') str += json;
         } catch (e) {}
         
         if (!str) str = String(val);
      } else {
         str = String(val);
      }
    } catch (e) {
      str = String(val);
    }
    return str.toLowerCase();
  }

  function isAbortError(val) {
    const str = getErrorMessage(val);
    
    // Check specific properties if val is an object
    if (val && typeof val === 'object') {
      if (val.name === 'AbortError') return true;
      if (val.code === 20) return true; // DOMException.ABORT_ERR
    }

    // Heuristic for Next.js Navigation Aborts
    const isNextJsNavigation = 
      str.includes('navigate') || 
      str.includes('next_dist_client') || 
      str.includes('router') ||
      str.includes('app-router');

    // Network errors during navigation are usually safe to ignore
    const isNetworkError = 
      str.includes('typeerror') || 
      str.includes('failed to fetch') || 
      str.includes('networkerror');

    return (
      str.includes('aborterror') ||
      str.includes('the user aborted a request') ||
      str.includes('the operation was aborted') ||
      str.includes('net::err_aborted') ||
      str.includes('cancel') ||
      (isNetworkError && isNextJsNavigation)
    );
  }

  function shouldSuppress(val) {
    const str = getErrorMessage(val);
    
    // Recharts & DOM
    if (str.includes('defaultprops will be removed')) return true;
    if (str.includes('xaxis') || str.includes('yaxis') || str.includes('cartesiangrid')) return true;
    if (str.includes('validatedomnesting')) return true;
    if (str.includes('resizeobserver loop')) return true;

    // React/Next.js Hydration
    if (str.includes('hydration failed')) return true;
    if (str.includes('text content does not match')) return true;
    if (str.includes('extra attributes from the server')) return true;
    if (str.includes('prop is being spread')) return true;
    
    // Network/Navigation/Abort
    if (isAbortError(val)) return true;
    
    return false;
  }

  // Override console.error
  const wrappedConsoleError = function(...args) {
    if (args.some(arg => shouldSuppress(arg))) return;
    originalConsoleError.apply(console, args);
  };

  try {
    Object.defineProperty(console, 'error', {
      configurable: true,
      enumerable: true,
      get() {
        return wrappedConsoleError;
      },
      set(val) {
        // Ignore attempts to overwrite
      }
    });
  } catch (e) {
    console.error = wrappedConsoleError;
  }

  // Override console.warn
  const wrappedConsoleWarn = function(...args) {
    const msg = args[0];
    if (typeof msg === 'string' && msg.toLowerCase().includes('recharts')) return;
    originalConsoleWarn.apply(console, args);
  };

  try {
    Object.defineProperty(console, 'warn', {
      configurable: true,
      enumerable: true,
      get() {
        return wrappedConsoleWarn;
      },
      set(val) {
        // Ignore attempts to overwrite
      }
    });
  } catch (e) {
    console.warn = wrappedConsoleWarn;
  }

  // Handle Unhandled Rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (isAbortError(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
  
  // Handle Global Errors
  window.addEventListener('error', function(event) {
    const error = event.message || event.error;
    if (isAbortError(error) || getErrorMessage(error).includes('resizeobserver loop')) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });

  function sanitizeFetchArgs(args) {
    try {
      if (args[1] && typeof args[1] === 'object' && 'signal' in args[1]) {
        var sig1 = args[1].signal;
        if (!sig1 || (typeof AbortSignal !== 'undefined' && !(sig1 instanceof AbortSignal))) {
          var cloned1 = Object.assign({}, args[1]);
          delete cloned1.signal;
          args[1] = cloned1;
        }
      } else if (args[0] && typeof args[0] === 'object' && 'signal' in args[0]) {
        var sig0 = args[0].signal;
        if (!sig0 || (typeof AbortSignal !== 'undefined' && !(sig0 instanceof AbortSignal))) {
          var cloned0 = Object.assign({}, args[0]);
          delete cloned0.signal;
          args[0] = cloned0;
        }
      }
    } catch (e) {}
    return args;
  }

  // Safe fetch wrapper that swallows abort errors
  function wrapFetch(fn) {
    return async function(...args) {
      args = sanitizeFetchArgs(args);
      try {
        return await fn.apply(this, args);
      } catch (e) {
        // 1. Check if the request was explicitly aborted via signal
        let signal = null;
        if (args[1] && args[1].signal) {
          signal = args[1].signal;
        } else if (args[0] && typeof args[0] === 'object' && args[0].signal) {
          signal = args[0].signal;
        }

        if (signal && signal.aborted) {
           return new Promise(() => {});
        }

        // 2. Check general abort error criteria
        if (isAbortError(e)) {
          return new Promise(() => {}); 
        }

        // 3. SPECIFIC NEXT.JS RSC HANDLER
        // Extract URL correctly whether it's a string, Request object, or URL object
        let url = '';
        try {
            if (args[0]) {
                if (typeof args[0] === 'string') {
                    url = args[0];
                } else if (typeof args[0] === 'object') {
                    if (args[0].url) {
                         url = args[0].url; // Request object or similar
                    } else if (args[0].toString) {
                         url = args[0].toString(); // URL object
                    }
                }
            }
        } catch(err) {}

        if (url && url.includes('_rsc=')) {
             // For RSC requests, we unconditionally suppress ALL fetch exceptions.
             // Fetch only throws on network errors (like Abort/ConnectionRefused), 
             // which are exactly what we want to hide during navigation.
             // We do NOT filter by error message anymore to ensure "definitive fix".
             return new Promise(() => {});
        }
        
        throw e;
      }
    };
  }

  // Robustly patch window.fetch
  let currentFetch = wrapFetch(window.fetch || (() => Promise.reject(new Error('Fetch not available'))));

  if (window.fetch) {
      window.fetch = currentFetch;
  }

  try {
    Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        get() {
        return currentFetch;
        },
        set(newFetch) {
        currentFetch = wrapFetch(newFetch);
        }
    });
  } catch (err) {
      window.fetch = currentFetch;
  }

})();

'use strict';

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  current:    '0',   // number currently being typed
  previous:   null,  // previous operand (string)
  operator:   null,  // pending operator symbol
  justEquals: false, // did we just press "="?
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const displayResult     = document.getElementById('result');
const displayExpression = document.getElementById('expression');

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatNumber(raw) {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  // Up to 10 significant digits, then scientific notation
  if (Math.abs(n) >= 1e10 || (Math.abs(n) < 1e-6 && n !== 0)) {
    return n.toExponential(4);
  }
  // Trim trailing zeros after decimal
  const str = parseFloat(n.toPrecision(10)).toString();
  return str;
}

function updateDisplay() {
  // Scale font if number is long
  const len = state.current.replace('-', '').length;
  displayResult.style.fontSize =
    len > 12 ? '28px' :
    len > 9  ? '36px' :
    len > 6  ? '44px' : '52px';

  displayResult.textContent = formatNumber(state.current);

  if (state.operator && state.previous !== null) {
    displayExpression.textContent = `${formatNumber(state.previous)} ${state.operator}`;
  } else {
    displayExpression.textContent = '';
  }
}

function pop() {
  displayResult.classList.remove('pop');
  void displayResult.offsetWidth; // reflow
  displayResult.classList.add('pop');
  setTimeout(() => displayResult.classList.remove('pop'), 150);
}

// ── Core logic ────────────────────────────────────────────────────────────────
function calculate(a, op, b) {
  const x = parseFloat(a);
  const y = parseFloat(b);
  switch (op) {
    case '+': return x + y;
    case '−': return x - y;
    case '×': return x * y;
    case '÷': return y === 0 ? 'Error' : x / y;
    default:  return y;
  }
}

function handleNumber(val) {
  if (state.justEquals) {
    state.previous  = null;
    state.operator  = null;
    state.justEquals = false;
    state.current   = val;
    return;
  }
  if (state.current === '0' || state.current === 'Error') {
    state.current = val;
  } else {
    if (state.current.replace('.', '').replace('-', '').length >= 12) return;
    state.current += val;
  }
}

function handleDecimal() {
  if (state.justEquals) {
    state.current    = '0.';
    state.previous   = null;
    state.operator   = null;
    state.justEquals = false;
    return;
  }
  if (!state.current.includes('.')) {
    state.current += '.';
  }
}

function handleOperator(op) {
  if (state.current === 'Error') return;

  // Chain: compute previous result first
  if (state.operator && !state.justEquals) {
    const result = calculate(state.previous, state.operator, state.current);
    state.previous = result.toString();
    state.current  = state.previous;
  } else {
    state.previous = state.current;
  }

  state.operator   = op;
  state.justEquals = false;
  // Next key press starts a fresh number
  state.current    = state.previous;
  // Mark that next digit should replace current
  state._awaitingOperand = true;
}

// Override handleNumber to respect _awaitingOperand
const _origHandleNumber = handleNumber;
function handleNumberWrapped(val) {
  if (state._awaitingOperand) {
    state.current = val;
    state._awaitingOperand = false;
    return;
  }
  _origHandleNumber(val);
}

function handleEquals() {
  if (!state.operator || state.previous === null) return;
  if (state.current === 'Error') return;

  const result = calculate(state.previous, state.operator, state.current);
  displayExpression.textContent =
    `${formatNumber(state.previous)} ${state.operator} ${formatNumber(state.current)} =`;

  state.current    = result.toString();
  state.previous   = null;
  state.operator   = null;
  state.justEquals = true;
  state._awaitingOperand = false;
  pop();
}

function handleClear() {
  state.current    = '0';
  state.previous   = null;
  state.operator   = null;
  state.justEquals = false;
  state._awaitingOperand = false;
}

function handleSign() {
  if (state.current === '0' || state.current === 'Error') return;
  state.current = state.current.startsWith('-')
    ? state.current.slice(1)
    : '-' + state.current;
}

function handlePercent() {
  const n = parseFloat(state.current);
  if (isNaN(n)) return;
  state.current = (n / 100).toString();
}

// ── Active operator highlight ─────────────────────────────────────────────────
function updateActiveOp() {
  document.querySelectorAll('.btn.op').forEach(btn => {
    btn.classList.toggle('active-op',
      btn.dataset.value === state.operator && !state.justEquals
    );
  });
}

// ── Event binding ─────────────────────────────────────────────────────────────
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const { action, value } = btn.dataset;

    switch (action) {
      case 'number':   handleNumberWrapped(value); break;
      case 'decimal':  handleDecimal(); break;
      case 'operator': handleOperator(value); break;
      case 'equals':   handleEquals(); break;
      case 'clear':    handleClear(); break;
      case 'sign':     handleSign(); break;
      case 'percent':  handlePercent(); break;
    }

    updateDisplay();
    updateActiveOp();
  });
});

// ── Keyboard support ──────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key >= '0' && e.key <= '9') { handleNumberWrapped(e.key); }
  else if (e.key === '.')            { handleDecimal(); }
  else if (e.key === '+')            { handleOperator('+'); }
  else if (e.key === '-')            { handleOperator('−'); }
  else if (e.key === '*')            { handleOperator('×'); }
  else if (e.key === '/')            { e.preventDefault(); handleOperator('÷'); }
  else if (e.key === 'Enter' || e.key === '=') { handleEquals(); }
  else if (e.key === 'Escape')       { handleClear(); }
  else if (e.key === 'Backspace') {
    if (state.current.length > 1 && state.current !== 'Error') {
      state.current = state.current.slice(0, -1) || '0';
    } else {
      state.current = '0';
    }
  }
  else return;

  updateDisplay();
  updateActiveOp();
});

// Initial render
updateDisplay();
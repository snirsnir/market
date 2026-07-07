/* =====================================================
   CONFIG & INIT
===================================================== */
var firebaseConfig = {
  apiKey: "AIzaSyDNy5LNznYZv-8zDjjqoOhOMNDzHmVaVnc",
  authDomain: "market-ddfe6.firebaseapp.com",
  projectId: "market-ddfe6",
  storageBucket: "market-ddfe6.firebasestorage.app",
  messagingSenderId: "206448884373",
  appId: "1:206448884373:web:5193af078826df8e15f99c",
  databaseURL: "https://market-ddfe6-default-rtdb.europe-west1.firebasedatabase.app/"
};

var ADMIN_WHITELIST = [
  "papasnir@gmail.com",
  "emilygolan1@gmail.com",
  "zrihaneli@gmail.com",
  "maayan.schvartzer@gmail.com"
];

var DEFAULT_PROMPT = "אתה מנתח תזונה ידידותי לילדים. דבר בעברית פשוטה, מעודדת וחיובית. היה משעשע אבל מדויק.";

firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db   = firebase.database();

/* =====================================================
   SECURITY UTILS
===================================================== */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* =====================================================
   DOM REFS
===================================================== */
var authScreen      = document.getElementById('auth-screen');
var adminPanel      = document.getElementById('admin-panel');
var authError       = document.getElementById('auth-error');
var authSpinner     = document.getElementById('auth-spinner');
var headerUserEmail = document.getElementById('header-user-email');
var productsTbody   = document.getElementById('products-tbody');
var productsCount   = document.getElementById('products-count');
var productModal    = document.getElementById('product-modal-overlay');

/* =====================================================
   AUTH
===================================================== */
auth.onAuthStateChanged(function(user) {
  authSpinner.style.display = 'none';
  if (!user) {
    showAuthScreen();
    return;
  }
  if (ADMIN_WHITELIST.indexOf(user.email) === -1) {
    authError.style.display = 'block';
    authError.textContent = 'אין הרשאה: ' + user.email;
    auth.signOut();
    showAuthScreen();
    return;
  }
  showAdminPanel(user);
});

document.getElementById('btn-google-signin').addEventListener('click', function() {
  authError.style.display = 'none';
  authSpinner.style.display = 'block';
  var provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(function(err) {
    authSpinner.style.display = 'none';
    authError.style.display = 'block';
    authError.textContent = 'שגיאה בהתחברות: ' + err.message;
  });
});

document.getElementById('btn-signout').addEventListener('click', function() {
  auth.signOut();
});

function showAuthScreen() {
  authScreen.style.display = 'flex';
  adminPanel.style.display = 'none';
}

function showAdminPanel(user) {
  authScreen.style.display = 'none';
  adminPanel.style.display = 'block';
  headerUserEmail.textContent = user.email;
  initAdmin();
}

/* =====================================================
   NAVIGATION
===================================================== */
function activateTab(tabId) {
  document.querySelectorAll('.sidebar-nav a').forEach(function(a) {
    a.classList.toggle('active', a.dataset.tab === tabId);
  });
  document.querySelectorAll('.mobile-tab-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-section').forEach(function(s) {
    s.classList.toggle('active', s.id === 'tab-' + tabId);
  });
}

document.querySelectorAll('.sidebar-nav a, .mobile-tab-btn').forEach(function(el) {
  el.addEventListener('click', function(e) {
    e.preventDefault();
    activateTab(el.dataset.tab);
  });
});

/* =====================================================
   TOAST
===================================================== */
function showToast(message, type, duration) {
  if (!type) type = 'success';
  if (!duration) duration = 3500;
  var container = document.getElementById('toast-container');
  var toast = document.createElement('div');
  var icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.className = 'toast toast-' + type;
  toast.textContent = (icons[type] || '') + ' ' + message;
  container.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(function() { toast.remove(); }, 300);
  }, duration);
}

/* =====================================================
   CONFIRM DIALOG
===================================================== */
var confirmResolve = null;

function showConfirm(title, message) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-overlay').classList.add('open');
  return new Promise(function(resolve) { confirmResolve = resolve; });
}

document.getElementById('confirm-yes').addEventListener('click', function() {
  document.getElementById('confirm-overlay').classList.remove('open');
  if (confirmResolve) confirmResolve(true);
});

document.getElementById('confirm-no').addEventListener('click', function() {
  document.getElementById('confirm-overlay').classList.remove('open');
  if (confirmResolve) confirmResolve(false);
});

/* =====================================================
   IMAGE UPLOAD
===================================================== */
var pendingImageBase64 = null;
var pendingImageUrl    = null;

function renderIcon(p, size) {
  if (!size) size = 28;
  if (p && p.image) {
    return '<img src="' + escAttr(p.image) + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;vertical-align:middle;" alt="" />';
  }
  return escHtml(p && p.emoji ? p.emoji : '🛒');
}

document.getElementById('f-image-upload').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  if (file.size > 512000) {
    showToast('התמונה גדולה מדי – מקסימום 500KB', 'error');
    this.value = '';
    return;
  }
  var reader = new FileReader();
  reader.onload = function(ev) {
    pendingImageBase64 = ev.target.result;
    document.getElementById('img-preview').src = pendingImageBase64;
    document.getElementById('image-preview-area').style.display = '';
  };
  reader.readAsDataURL(file);
});

document.getElementById('f-image-url').addEventListener('input', function() {
  var url = this.value.trim();
  if (url) {
    pendingImageUrl    = url;
    pendingImageBase64 = null;
    document.getElementById('img-preview').src = url;
    document.getElementById('image-preview-area').style.display = '';
  } else {
    pendingImageUrl = null;
    if (!pendingImageBase64) {
      document.getElementById('img-preview').src = '';
      document.getElementById('image-preview-area').style.display = 'none';
    }
  }
});

document.getElementById('btn-clear-image').addEventListener('click', function() {
  pendingImageBase64 = null;
  pendingImageUrl    = null;
  document.getElementById('img-preview').src = '';
  document.getElementById('image-preview-area').style.display = 'none';
  document.getElementById('f-image-upload').value = '';
  document.getElementById('f-image-url').value = '';
});

/* =====================================================
   EMOJI PICKER
===================================================== */
var EMOJIS = [
  '🍎','🍊','🍋','🍇','🍓','🫐','🍌','🍉','🥝','🍑',
  '🥦','🥕','🧅','🥔','🌽','🥬','🍞','🥐','🥨','🥞',
  '🧆','🧀','🥚','🍳','🥓','🥩','🍗','🐟','🥛','🧃',
  '🍵','☕','🥤','🧋','🍫','🍬','🍭','🧁','🍰','🥗',
  '🥙','🌮','🌯','🍱','🍜','🍚','🥟','🧂'
];

function buildEmojiGrid() {
  var grid = document.getElementById('emoji-grid');
  grid.innerHTML = '';
  EMOJIS.forEach(function(emoji) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-btn';
    btn.textContent = emoji;
    btn.setAttribute('aria-label', emoji);
    btn.addEventListener('click', function() {
      document.querySelectorAll('.emoji-btn').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      document.getElementById('f-emoji').value = emoji;
      document.getElementById('emoji-preview').textContent = emoji;
    });
    grid.appendChild(btn);
  });
}

function setEmojiPicker(emoji) {
  document.getElementById('f-emoji').value = emoji;
  document.getElementById('emoji-preview').textContent = emoji;
  document.querySelectorAll('.emoji-btn').forEach(function(b) {
    b.classList.toggle('selected', b.textContent === emoji);
  });
}

/* =====================================================
   PRODUCTS
===================================================== */
var productsCache = {};

function initAdmin() {
  buildEmojiGrid();
  listenProducts();
  loadAiPrompt();
  listenSessions();
}

function listenProducts() {
  db.ref('products').on('value', function(snapshot) {
    productsCache = snapshot.val() || {};
    renderProductsTable(productsCache);
    renderStickerList(productsCache);
  }, function(err) {
    console.error('Products load error:', err);
    showToast('שגיאה בטעינת מוצרים: ' + err.message, 'error');
    productsTbody.innerHTML = '<tr><td colspan="8"><div class="loading-placeholder">שגיאה בטעינת נתונים</div></td></tr>';
  });
}

function renderProductsTable(products) {
  var entries = Object.entries(products);
  productsCount.textContent = entries.length + ' מוצרים';

  if (entries.length === 0) {
    var emptyHtml = '<tr><td colspan="8">';
    emptyHtml += '<div class="empty-state">';
    emptyHtml += '<div class="empty-icon">📭</div>';
    emptyHtml += '<p>אין מוצרים עדיין. לחץ "הוסף מוצר חדש" להתחלה.</p>';
    emptyHtml += '</div>';
    emptyHtml += '</td></tr>';
    productsTbody.innerHTML = emptyHtml;
    return;
  }

  var html = '';
  entries.forEach(function(entry) {
    var barcode = entry[0];
    var p = entry[1];
    var carbsVal = (p.carbs !== undefined && p.carbs !== null) ? p.carbs : '–';
    var proteinVal = (p.protein !== undefined && p.protein !== null) ? p.protein : '–';
    var fatVal = (p.fat !== undefined && p.fat !== null) ? p.fat : '–';
    html += '<tr data-barcode="' + escAttr(barcode) + '">';
    html += '<td class="emoji-cell">' + renderIcon(p, 32) + '</td>';
    html += '<td><strong>' + escHtml(p.name || '') + '</strong></td>';
    html += '<td><code style="background:#f0f1f3;padding:.15rem .4rem;border-radius:4px;font-size:.8rem;">' + escHtml(barcode) + '</code></td>';
    html += '<td>' + escHtml(String(carbsVal)) + '</td>';
    html += '<td>' + escHtml(String(proteinVal)) + '</td>';
    html += '<td>' + escHtml(String(fatVal)) + '</td>';
    html += '<td>' + renderVitaminsBadge(p.vitamins) + '</td>';
    html += '<td><strong style="color:#662D91">' + (p.score !== undefined ? p.score : '–') + '</strong></td>';
    html += '<td><div class="td-actions">';
    html += '<button class="btn btn-primary btn-icon" onclick="openEditModal(\'' + escAttr(barcode) + '\')" title="ערוך">✏️</button>';
    html += '<button class="btn btn-danger btn-icon" onclick="deleteProduct(\'' + escAttr(barcode) + '\')" title="מחק">🗑️</button>';
    html += '</div></td>';
    html += '</tr>';
  });
  productsTbody.innerHTML = html;
}

function renderVitaminsBadge(v) {
  if (v === undefined || v === null || v === '') return '–';
  var n = Number(v);
  if (n >= 7) return '<span class="badge badge-green">' + n + '/10</span>';
  if (n >= 4) return '<span class="badge badge-orange">' + n + '/10</span>';
  return '<span class="badge badge-blue">' + n + '/10</span>';
}

function deleteProduct(barcode) {
  var product = productsCache[barcode];
  var productName = product ? product.name : barcode;
  showConfirm('מחיקת מוצר', 'האם למחוק את "' + productName + '" לצמיתות?').then(function(confirmed) {
    if (!confirmed) return;
    db.ref('products/' + barcode).remove().then(function() {
      showToast('המוצר נמחק בהצלחה', 'success');
    }).catch(function(err) {
      console.error('Delete error:', err);
      showToast('שגיאה במחיקה: ' + err.message, 'error');
    });
  });
}

/* =====================================================
   PRODUCT MODAL
===================================================== */
function openAddModal() {
  document.getElementById('modal-title').textContent = '➕ הוסף מוצר';
  document.getElementById('product-form').reset();
  document.getElementById('edit-original-barcode').value = '';
  document.getElementById('f-barcode').removeAttribute('readonly');
  setEmojiPicker('🛒');
  pendingImageBase64 = null;
  pendingImageUrl    = null;
  document.getElementById('img-preview').src = '';
  document.getElementById('image-preview-area').style.display = 'none';
  document.getElementById('f-image-upload').value = '';
  document.getElementById('f-image-url').value = '';
  document.getElementById('f-carbs-range')._refresh(0);
  document.getElementById('f-protein-range')._refresh(0);
  document.getElementById('f-fat-range')._refresh(0);
  document.getElementById('f-score-range')._refresh(0);
  productModal.classList.add('open');
  document.getElementById('f-name').focus();
}

function openEditModal(barcode) {
  var p = productsCache[barcode];
  if (!p) return;
  document.getElementById('modal-title').textContent = '✏️ ערוך מוצר';
  document.getElementById('edit-original-barcode').value = barcode;
  document.getElementById('f-name').value    = p.name    || '';
  document.getElementById('f-barcode').value = barcode;
  document.getElementById('f-barcode').setAttribute('readonly', 'true');
  var carbsVal   = (p.carbs   !== undefined && p.carbs   !== null) ? Math.round(p.carbs)   : 0;
  var proteinVal = (p.protein !== undefined && p.protein !== null) ? Math.round(p.protein) : 0;
  var fatVal     = (p.fat     !== undefined && p.fat     !== null) ? Math.round(p.fat)     : 0;
  document.getElementById('f-carbs-range')._refresh(carbsVal);
  document.getElementById('f-protein-range')._refresh(proteinVal);
  document.getElementById('f-fat-range')._refresh(fatVal);
  document.getElementById('f-vitamins').value = (p.vitamins !== undefined && p.vitamins !== null) ? p.vitamins : '';
  document.getElementById('f-score-range')._refresh((p.score !== undefined && p.score !== null) ? p.score : 0);
  document.getElementById('f-ai-fact').value  = p.aiFact  || '';
  setEmojiPicker(p.emoji || '🛒');
  var isBase64 = p.image && p.image.startsWith('data:');
  pendingImageBase64 = isBase64 ? p.image : null;
  pendingImageUrl    = (!isBase64 && p.image) ? p.image : null;
  document.getElementById('f-image-upload').value = '';
  document.getElementById('f-image-url').value = pendingImageUrl || '';
  if (p.image) {
    document.getElementById('img-preview').src = p.image;
    document.getElementById('image-preview-area').style.display = '';
  } else {
    document.getElementById('img-preview').src = '';
    document.getElementById('image-preview-area').style.display = 'none';
  }
  productModal.classList.add('open');
}

function closeModal() {
  productModal.classList.remove('open');
}

document.getElementById('btn-add-product').addEventListener('click', openAddModal);
document.getElementById('btn-close-modal').addEventListener('click', closeModal);
document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
productModal.addEventListener('click', function(e) { if (e.target === productModal) closeModal(); });

document.getElementById('product-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var name    = document.getElementById('f-name').value.trim();
  var barcode = document.getElementById('f-barcode').value.trim();
  var emoji   = document.getElementById('f-emoji').value;
  var carbs   = parseFloat(document.getElementById('f-carbs').value)   || 0;
  var protein = parseFloat(document.getElementById('f-protein').value) || 0;
  var fat     = parseFloat(document.getElementById('f-fat').value)     || 0;
  var vitamins = parseInt(document.getElementById('f-vitamins').value, 10) || 0;
  var score   = parseInt(document.getElementById('f-score').value, 10) || 0;
  var aiFact  = document.getElementById('f-ai-fact').value.trim();

  if (!name)    { showToast('שם מוצר הוא שדה חובה', 'error'); return; }
  if (!barcode) { showToast('ברקוד/מזהה הוא שדה חובה', 'error'); return; }

  if (!/^[A-Za-z0-9_\-.]+$/.test(barcode)) {
    showToast('מזהה יכול להכיל רק אותיות לועזיות, ספרות, מקף ונקודה', 'error');
    return;
  }

  var vitaminsClamp = Math.max(0, Math.min(10, vitamins));
  var scoreClamp    = Math.max(0, Math.min(20, score));
  var productData = {
    name: name,
    emoji: emoji,
    image: pendingImageBase64 || pendingImageUrl || null,
    carbs: carbs,
    protein: protein,
    fat: fat,
    vitamins: vitaminsClamp,
    score: scoreClamp,
    aiFact: aiFact
  };

  var saveBtn = document.getElementById('btn-save-product');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner-sm-white"></span> שומר…';

  db.ref('products/' + barcode).set(productData).then(function() {
    showToast('המוצר נשמר בהצלחה', 'success');
    closeModal();
  }).catch(function(err) {
    console.error('Save product error:', err);
    showToast('שגיאה בשמירה: ' + err.message, 'error');
  }).finally(function() {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '💾 שמור מוצר';
  });
});

/* =====================================================
   AI SETTINGS
===================================================== */
function loadAiPrompt() {
  db.ref('settings/aiPrompt').once('value').then(function(snapshot) {
    var val = snapshot.val();
    document.getElementById('ai-prompt-textarea').value = val || DEFAULT_PROMPT;
  }).catch(function(err) {
    console.error('Load AI prompt error:', err);
    document.getElementById('ai-prompt-textarea').value = DEFAULT_PROMPT;
  });
}

document.getElementById('btn-save-ai-prompt').addEventListener('click', function() {
  var prompt = document.getElementById('ai-prompt-textarea').value.trim();
  if (!prompt) { showToast('הפרומפט לא יכול להיות ריק', 'error'); return; }

  var btn = document.getElementById('btn-save-ai-prompt');
  var feedback = document.getElementById('ai-save-feedback');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-sm-white"></span> שומר…';
  feedback.style.display = 'none';

  db.ref('settings/aiPrompt').set(prompt).then(function() {
    feedback.style.display = 'inline';
    setTimeout(function() { feedback.style.display = 'none'; }, 3000);
    showToast('הפרומפט נשמר בהצלחה', 'success');
  }).catch(function(err) {
    console.error('Save AI prompt error:', err);
    showToast('שגיאה בשמירת פרומפט: ' + err.message, 'error');
  }).finally(function() {
    btn.disabled = false;
    btn.innerHTML = '💾 שמור פרומפט';
  });
});

/* =====================================================
   QR STICKERS
===================================================== */
function renderStickerList(products) {
  var list = document.getElementById('sticker-product-list');
  var entries = Object.entries(products);

  if (entries.length === 0) {
    list.innerHTML = '<div class="loading-placeholder">אין מוצרים עדיין</div>';
    return;
  }

  var html = '';
  entries.forEach(function(entry) {
    var barcode = entry[0];
    var p = entry[1];
    html += '<label class="product-check-item">';
    html += '<input type="checkbox" class="sticker-check" value="' + escAttr(barcode) + '" />';
    html += '<span style="display:inline-flex;align-items:center;">' + renderIcon(p, 24) + '</span>';
    html += '<span>' + escHtml(p.name || barcode) + '</span>';
    html += '</label>';
  });
  list.innerHTML = html;
}

document.getElementById('btn-select-all-stickers').addEventListener('click', function() {
  document.querySelectorAll('.sticker-check').forEach(function(c) { c.checked = true; });
});

document.getElementById('btn-clear-all-stickers').addEventListener('click', function() {
  document.querySelectorAll('.sticker-check').forEach(function(c) { c.checked = false; });
});

document.getElementById('btn-print-stickers').addEventListener('click', function() {
  var checked = Array.from(document.querySelectorAll('.sticker-check:checked'));
  if (checked.length === 0) {
    showToast('אנא בחר לפחות מוצר אחד', 'info');
    return;
  }

  var selected = checked.map(function(c) {
    var barcode = c.value;
    var p = productsCache[barcode] || { name: barcode, emoji: '🛒' };
    return { barcode: barcode, name: p.name, emoji: p.emoji || '🛒', image: p.image || '' };
  });

  generatePrintPage(selected);
});

function generatePrintPage(selectedProducts) {
  var win = window.open('', '_blank');
  if (!win) { showToast('חסום חלונות קופצים – אנא אשר ובצע שוב', 'error'); return; }

  var html = '<!DOCTYPE html>';
  html += '<html lang="he" dir="rtl">';
  html += '<head>';
  html += '<meta charset="UTF-8">';
  html += '<title>מדבקות QR</title>';
  html += '<style>';
  html += '* { box-sizing: border-box; margin:0; padding:0; }';
  html += 'body { font-family: Arial, sans-serif; direction: rtl; background:#fff; }';
  html += '.page-controls { padding: .75rem 1rem; background: #f5f5f5; border-bottom: 1px solid #ddd; display: flex; gap: .75rem; align-items: center; }';
  html += '.page-controls button { padding: .45rem 1.1rem; background: #29ABE2; color:#fff; border:none; border-radius:6px; font-size:.9rem; cursor:pointer; font-weight:600; }';
  html += '.sticker-grid { padding: 8mm; display: grid; grid-template-columns: repeat(3, 164px); gap: 6mm; justify-content: start; }';
  html += '.sticker { width:164px; border:1.5px dashed #bbb; border-radius:6px; display:flex; flex-direction:column; align-items:center; overflow:hidden; background:#fff; }';
  html += '.sticker-top { width:100%; display:flex; align-items:center; gap:4px; padding:4px 6px; border-bottom:1px solid #eee; background:#fafafa; }';
  html += '.sticker-top img { width:22px; height:22px; object-fit:contain; flex-shrink:0; }';
  html += '.sticker-top .s-emoji { font-size:1.1rem; flex-shrink:0; }';
  html += '.sticker-top .s-name { font-size:7.5pt; font-weight:700; color:#222; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }';
  html += '.sticker-qr { padding:5px; display:flex; justify-content:center; align-items:center; }';
  html += '.sticker-qr canvas { display:block; }';
  html += '.sticker-footer { width:100%; text-align:center; font-size:6pt; color:#999; border-top:1px solid #eee; padding:3px 0; letter-spacing:.3px; }';
  html += '@media print { .page-controls{display:none!important;} body{margin:0;} .sticker-grid{padding:5mm;} }';
  html += '</style>';
  html += '</head>';
  html += '<body>';
  html += '<div class="page-controls">';
  html += '<button onclick="window.print()">🖨️ הדפס</button>';
  html += '<button onclick="window.close()">סגור</button>';
  html += '<span style="font-size:.85rem;color:#666;">' + selectedProducts.length + ' מדבקות</span>';
  html += '</div>';
  html += '<div class="sticker-grid" id="stickerGrid">';

  for (var i = 0; i < selectedProducts.length; i++) {
    var p = selectedProducts[i];
    html += '<div class="sticker">';
    html += '<div class="sticker-top">';
    if (p.image) {
      html += '<img src="' + p.image + '" />';
    } else {
      html += '<span class="s-emoji">' + (p.emoji || '📦') + '</span>';
    }
    html += '<span class="s-name">' + p.name + '</span>';
    html += '</div>';
    html += '<div class="sticker-qr" id="qr' + i + '"></div>';
    html += '<div class="sticker-footer">הסופר של הטכנודע</div>';
    html += '</div>';
  }

  html += '</div>';
  html += '<scr' + 'ipt src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><' + '/script>';
  html += '<scr' + 'ipt>';
  html += 'var data = ' + JSON.stringify(selectedProducts.map(function(p) { return p.barcode; })) + ';';
  html += 'data.forEach(function(barcode, i) {';
  html += '  var el = document.getElementById("qr" + i);';
  html += '  if (!el) return;';
  html += '  try { new QRCode(el, { text: barcode, width: 154, height: 154, colorDark: "#000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M }); }';
  html += '  catch(e) { el.textContent = barcode; el.style.fontSize = "7pt"; }';
  html += '});';
  html += '<' + '/script>';
  html += '</body></html>';

  win.document.write(html);
  win.document.close();
}

/* =====================================================
   SESSIONS
===================================================== */
var sessionsListener = null;

function listenSessions() {
  if (sessionsListener) {
    db.ref('sessions').off('value', sessionsListener);
  }
  sessionsListener = db.ref('sessions').on('value', function(snapshot) {
    var data = snapshot.val() || {};
    renderSessions(data);
  }, function(err) {
    console.error('Sessions error:', err);
    document.getElementById('sessions-container').innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚠️</div><p>שגיאה בטעינת סשנים: ' + err.message + '</p></div>';
  });
}

function renderSessions(sessionsData) {
  var container = document.getElementById('sessions-container');
  var summary = document.getElementById('sessions-summary');
  var entries = Object.entries(sessionsData || {});

  if (entries.length === 0) {
    summary.textContent = '';
    var emptyHtml = '<div class="empty-state">';
    emptyHtml += '<div class="empty-icon">💤</div>';
    emptyHtml += '<p>אין סשנים פעילים כרגע</p>';
    emptyHtml += '</div>';
    container.innerHTML = emptyHtml;
    return;
  }

  var doneCount = 0;
  entries.forEach(function(entry) {
    if (entry[1].status === 'done') doneCount++;
  });
  summary.textContent = entries.length + ' סשנים סה"כ | ' + doneCount + ' סיימו';

  var html = '';
  entries.forEach(function(entry) {
    var id = entry[0];
    var s = entry[1];
    var statusClass = s.status === 'done' ? 'done' : (s.status === 'idle' ? 'idle' : '');
    var statusBadge = getStatusBadge(s.status);
    var elapsed = s.startTime ? formatElapsed(s.startTime) : '–';
    var itemCount = s.items ? Object.keys(s.items).length : (s.itemCount || 0);
    var scoreHtml = (s.score !== undefined) ? '<span>ניקוד: ' + escHtml(String(s.score)) + '</span>' : '';

    html += '<div class="session-card ' + statusClass + '" id="session-' + escAttr(id) + '">';
    html += '<div class="session-info">';
    html += '<div class="session-name">👤 ' + escHtml(s.name || 'אנונימי') + ' ' + statusBadge + '</div>';
    html += '<div class="session-meta">';
    html += '<span>🆔 ' + escHtml(id.slice(0, 12)) + '…</span>';
    html += '<span>🛒 ' + itemCount + ' פריטים</span>';
    html += '<span>⏱️ ' + elapsed + '</span>';
    html += scoreHtml;
    html += '</div>';
    html += '</div>';
    html += '<button class="btn btn-danger btn-icon" onclick="deleteSession(\'' + escAttr(id) + '\')" title="מחק סשן">🗑️ מחק</button>';
    html += '</div>';
  });
  container.innerHTML = html;
}

function getStatusBadge(status) {
  if (status === 'done')    return '<span class="badge badge-green">סיים</span>';
  if (status === 'active')  return '<span class="badge badge-blue">פעיל</span>';
  if (status === 'idle')    return '<span class="badge badge-orange">לא פעיל</span>';
  if (status === 'waiting') return '<span class="badge badge-purple">ממתין</span>';
  return '<span class="badge badge-blue">' + escHtml(status || '–') + '</span>';
}

function formatElapsed(startTime) {
  try {
    var start = new Date(startTime);
    var now = new Date();
    var diffMs = now - start;
    if (isNaN(diffMs) || diffMs < 0) return '–';
    var mins = Math.floor(diffMs / 60000);
    var hrs  = Math.floor(mins / 60);
    if (hrs > 0)  return hrs + 'ש׳ ' + (mins % 60) + 'ד׳';
    if (mins > 0) return mins + ' דק׳';
    return 'זה עתה';
  } catch (e) { return '–'; }
}

function deleteSession(id) {
  showConfirm('מחיקת סשן', 'האם למחוק את הסשן לצמיתות?').then(function(confirmed) {
    if (!confirmed) return;
    db.ref('sessions/' + id).remove().then(function() {
      showToast('הסשן נמחק', 'success');
    }).catch(function(err) {
      showToast('שגיאה במחיקת סשן: ' + err.message, 'error');
    });
  });
}

document.getElementById('btn-clean-done').addEventListener('click', function() {
  db.ref('sessions').once('value').then(function(snapshot) {
    var sessions = snapshot.val() || {};
    var doneIds = [];
    Object.entries(sessions).forEach(function(entry) {
      if (entry[1].status === 'done') doneIds.push(entry[0]);
    });

    if (doneIds.length === 0) {
      showToast('אין סשנים שסיימו לניקוי', 'info');
      return;
    }

    showConfirm('ניקוי סשנים', 'למחוק ' + doneIds.length + ' סשנים שסיימו?').then(function(confirmed) {
      if (!confirmed) return;
      var updates = {};
      doneIds.forEach(function(id) { updates['sessions/' + id] = null; });
      db.ref().update(updates).then(function() {
        showToast(doneIds.length + ' סשנים נמחקו', 'success');
      }).catch(function(err) {
        showToast('שגיאה בניקוי: ' + err.message, 'error');
      });
    });
  });
});

/* =====================================================
   NUTRIENT SLIDERS
===================================================== */
function bindNutrientSlider(numberId, rangeId, color) {
  var numEl   = document.getElementById(numberId);
  var rangeEl = document.getElementById(rangeId);
  if (!numEl || !rangeEl) return;

  function updateTrack() {
    var min = parseFloat(rangeEl.min) || 0;
    var max = parseFloat(rangeEl.max) || 100;
    var val = parseFloat(rangeEl.value) || 0;
    var pct = ((val - min) / (max - min)) * 100;
    rangeEl.style.background =
      'linear-gradient(to left, ' + color + ' 0%, ' + color + ' ' + pct + '%, #e0e0e0 ' + pct + '%, #e0e0e0 100%)';
    rangeEl.style.color = color;
    numEl.style.borderColor = pct > 0 ? color : '#e0e0e0';
  }

  rangeEl.addEventListener('input', function() {
    numEl.value = rangeEl.value;
    updateTrack();
  });

  numEl.addEventListener('input', function() {
    var v = Math.round(Math.max(0, Math.min(100, parseFloat(numEl.value) || 0)));
    rangeEl.value = v;
    numEl.value   = v;
    updateTrack();
  });

  rangeEl._refresh = function(val) {
    if (val !== undefined) { rangeEl.value = val; numEl.value = val; }
    updateTrack();
  };

  updateTrack();
}

bindNutrientSlider('f-carbs',   'f-carbs-range',   '#F7941D');
bindNutrientSlider('f-protein', 'f-protein-range', '#29ABE2');
bindNutrientSlider('f-fat',     'f-fat-range',     '#8DC63F');
bindNutrientSlider('f-score',   'f-score-range',   '#662D91');

/* =====================================================
   KEYBOARD
===================================================== */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (productModal.classList.contains('open')) closeModal();
    var confirmOverlay = document.getElementById('confirm-overlay');
    if (confirmOverlay.classList.contains('open')) {
      confirmOverlay.classList.remove('open');
      if (confirmResolve) confirmResolve(false);
    }
  }
});

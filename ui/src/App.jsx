import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

/** 메뉴별 스톡 이미지 URL(표시용) */
const MENU_ITEMS = [
  {
    id: 'americano-ice',
    name: '아메리카노(ICE)',
    price: 4000,
    description: '에스프레소에 차가운 물을 더해 깔끔하게 마시는 커피.',
    image:
      'https://images.pexels.com/photos/1191639/pexels-photo-1191639.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&fit=crop',
  },
  {
    id: 'americano-hot',
    name: '아메리카노(HOT)',
    price: 4000,
    description: '따뜻한 물과 에스프레소의 조화, 기본에 충실한 한 잔.',
    image:
      'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=640&h=480&fit=crop',
  },
  {
    id: 'cafe-latte',
    name: '카페라떼',
    price: 5000,
    description: '부드러운 스팀 밀크와 에스프레소의 밸런스.',
    image:
      'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=640&q=80',
  },
]

const EXTRA_OPTIONS = [
  { id: 'shot', label: '샷 추가', extra: 500 },
  { id: 'syrup', label: '시럽 추가', extra: 0 },
]

/** 주문 상태: 신규는 주문 접수 → 제조 시작 → 제조 중 → 제조 완료 */
const ORDER_STATUS = {
  RECEIVED: 'RECEIVED',
  PREPARING: 'PREPARING',
  DONE: 'DONE',
}

function formatWon(value) {
  return `${value.toLocaleString('ko-KR')}원`
}

function optionsKey(selection) {
  return EXTRA_OPTIONS.map((o) => (selection[o.id] ? '1' : '0')).join('')
}

function unitPrice(menu, selection) {
  const extras = EXTRA_OPTIONS.reduce(
    (sum, o) => sum + (selection[o.id] ? o.extra : 0),
    0,
  )
  return menu.price + extras
}

function optionSummaryLabels(selection) {
  const parts = EXTRA_OPTIONS.filter((o) => selection[o.id]).map((o) => o.label)
  return parts
}

function cartLineDescription(menu, selection) {
  const opts = optionSummaryLabels(selection)
  const optText = opts.length ? ` (${opts.join(', ')})` : ''
  return `${menu.name}${optText}`
}

function createEmptySelections() {
  const init = {}
  for (const m of MENU_ITEMS) {
    init[m.id] = Object.fromEntries(EXTRA_OPTIONS.map((o) => [o.id, false]))
  }
  return init
}

function initialInventory() {
  return Object.fromEntries(MENU_ITEMS.map((m) => [m.id, 10]))
}

function stockLevelLabel(qty) {
  if (qty <= 0) return { text: '품절', className: 'stock-out' }
  if (qty < 5) return { text: '주의', className: 'stock-warn' }
  return { text: '정상', className: 'stock-ok' }
}

function formatOrderDateTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function orderLinesSummary(order) {
  return order.lines.map((l) => `${l.label} x ${l.qty}`).join(', ')
}

function orderStatusLabel(status) {
  if (status === ORDER_STATUS.RECEIVED) return '주문 접수'
  if (status === ORDER_STATUS.PREPARING) return '제조 중'
  if (status === ORDER_STATUS.DONE) return '제조 완료'
  return status
}

function buildOrderFromCart(cart) {
  const id = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const lines = cart.map((line) => {
    const menu = MENU_ITEMS.find((m) => m.id === line.menuId)
    const label = menu ? cartLineDescription(menu, line.selection) : line.menuId
    return {
      key: line.key,
      menuId: line.menuId,
      selection: { ...line.selection },
      qty: line.qty,
      unitPrice: line.unitPrice,
      label,
    }
  })
  const total = cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
  return {
    id,
    createdAt: new Date().toISOString(),
    lines,
    total,
    status: ORDER_STATUS.RECEIVED,
  }
}

function canFulfillCart(cart, inventory) {
  const need = {}
  for (const line of cart) {
    need[line.menuId] = (need[line.menuId] || 0) + line.qty
  }
  for (const [menuId, qty] of Object.entries(need)) {
    if ((inventory[menuId] ?? 0) < qty) return false
  }
  return true
}

function inventoryAfterDeduction(cart, inventory) {
  const next = { ...inventory }
  for (const line of cart) {
    next[line.menuId] = (next[line.menuId] ?? 0) - line.qty
  }
  return next
}

/** 주문 성공·재고 부족 등 — `alert` 대신 인라인 토스트 */
function ToastBanner({ toast, onDismiss }) {
  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div className="toast-container">
      <div
        className={`toast-banner toast-banner--${toast.type}`}
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        <p className="toast-banner__text">{toast.message}</p>
        <button
          type="button"
          className="toast-banner__close"
          onClick={onDismiss}
          aria-label="알림 닫기"
        >
          닫기
        </button>
      </div>
    </div>
  )
}

function AppHeader({ active, onGoOrder, onGoAdmin }) {
  return (
    <header className="app-header">
      <span className="brand">COZY</span>
      <nav className="nav-tabs" aria-label="주요 메뉴">
        {active === 'order' ? (
          <span className="nav-tab nav-tab-active" aria-current="page">
            주문하기
          </span>
        ) : (
          <button type="button" className="nav-tab nav-tab-link" onClick={onGoOrder}>
            주문하기
          </button>
        )}
        {active === 'admin' ? (
          <span className="nav-tab nav-tab-active" aria-current="page">
            관리자
          </span>
        ) : (
          <button type="button" className="nav-tab nav-tab-link" onClick={onGoAdmin}>
            관리자
          </button>
        )}
      </nav>
    </header>
  )
}

function OrderPage({ onGoAdmin, onPlaceOrder }) {
  const [selections, setSelections] = useState(createEmptySelections)
  const [cart, setCart] = useState([])

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
    [cart],
  )

  function toggleOption(menuId, optionId) {
    setSelections((prev) => ({
      ...prev,
      [menuId]: { ...prev[menuId], [optionId]: !prev[menuId][optionId] },
    }))
  }

  function addToCart(menuId) {
    const menu = MENU_ITEMS.find((m) => m.id === menuId)
    if (!menu) return
    const sel = selections[menuId]
    const key = `${menuId}:${optionsKey(sel)}`
    const price = unitPrice(menu, sel)

    setCart((prev) => {
      const idx = prev.findIndex((l) => l.key === key)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, { key, menuId, selection: { ...sel }, unitPrice: price, qty: 1 }]
    })
  }

  function setCartLineQty(lineKey, nextQty) {
    setCart((prev) => {
      if (nextQty <= 0) return prev.filter((l) => l.key !== lineKey)
      return prev.map((l) => (l.key === lineKey ? { ...l, qty: nextQty } : l))
    })
  }

  function placeOrder() {
    if (cart.length === 0) return
    const ok = onPlaceOrder(cart)
    if (ok) setCart([])
  }

  return (
    <>
      <AppHeader active="order" onGoOrder={() => {}} onGoAdmin={onGoAdmin} />

      <main className="order-main">
        <section className="menu-section" aria-labelledby="menu-heading">
          <h2 id="menu-heading" className="visually-hidden">
            메뉴
          </h2>
          <ul className="menu-grid">
            {MENU_ITEMS.map((item) => (
              <li key={item.id} className="menu-card">
                <div className="menu-card-image">
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={480}
                  />
                </div>
                <h3 className="menu-card-title">{item.name}</h3>
                <p className="menu-card-price">{formatWon(item.price)}</p>
                <p className="menu-card-desc">{item.description}</p>
                <ul className="menu-card-options">
                  {EXTRA_OPTIONS.map((opt) => (
                    <li key={opt.id}>
                      <label className="option-row">
                        <input
                          type="checkbox"
                          checked={selections[item.id][opt.id]}
                          onChange={() => toggleOption(item.id, opt.id)}
                        />
                        <span>
                          {opt.label} (+{formatWon(opt.extra)})
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => addToCart(item.id)}
                >
                  담기
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="cart-section" aria-labelledby="cart-heading">
          <h2 id="cart-heading" className="cart-title">
            장바구니
          </h2>
          <div className="cart-layout">
            <div className="cart-col cart-col-lines">
              <h3 className="cart-subheading">주문 내역</h3>
              {cart.length === 0 ? (
                <p className="cart-empty">담긴 상품이 없습니다.</p>
              ) : (
                <ul className="cart-lines">
                  {cart.map((line) => {
                    const menu = MENU_ITEMS.find((m) => m.id === line.menuId)
                    if (!menu) return null
                    const desc = cartLineDescription(menu, line.selection)
                    return (
                      <li key={line.key} className="cart-line">
                        <span className="cart-line-label" title={desc}>
                          {desc}
                        </span>
                        <div className="cart-line-qty" role="group" aria-label={`${desc} 수량`}>
                          <button
                            type="button"
                            className="btn btn-qty"
                            aria-label="수량 한 개 빼기"
                            onClick={() => setCartLineQty(line.key, line.qty - 1)}
                          >
                            −
                          </button>
                          <span className="cart-line-qty-value" aria-live="polite">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            className="btn btn-qty"
                            aria-label="수량 한 개 더하기"
                            onClick={() => setCartLineQty(line.key, line.qty + 1)}
                          >
                            +
                          </button>
                        </div>
                        <span className="cart-line-price">
                          {formatWon(line.unitPrice * line.qty)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <aside className="cart-col cart-col-summary" aria-label="결제 요약">
              <p className="cart-total">
                <span>총 금액</span>
                <strong>{formatWon(total)}</strong>
              </p>
              <button
                type="button"
                className="btn btn-primary btn-order"
                disabled={cart.length === 0}
                onClick={placeOrder}
              >
                주문하기
              </button>
            </aside>
          </div>
        </section>
      </main>
    </>
  )
}

function AdminPage({ onGoOrder, orders, onAdvanceOrder, inventory, onAdjustStock }) {
  const totalCount = orders.length
  const receivedCount = orders.filter((o) => o.status === ORDER_STATUS.RECEIVED).length
  const preparingCount = orders.filter((o) => o.status === ORDER_STATUS.PREPARING).length
  const doneCount = orders.filter((o) => o.status === ORDER_STATUS.DONE).length

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders],
  )

  return (
    <>
      <AppHeader active="admin" onGoOrder={onGoOrder} onGoAdmin={() => {}} />

      <main className="admin-main">
        <section className="admin-section" aria-labelledby="dash-heading">
          <h2 id="dash-heading" className="admin-section-title">
            관리자 대시보드
          </h2>
          <div className="admin-dashboard-grid">
            <section className="admin-stat-box" aria-labelledby="stat-total">
              <h3 id="stat-total" className="admin-stat-label">
                총 주문
              </h3>
              <p className="admin-stat-value">{totalCount}</p>
            </section>
            <section className="admin-stat-box" aria-labelledby="stat-received">
              <h3 id="stat-received" className="admin-stat-label">
                주문 접수
              </h3>
              <p className="admin-stat-value">{receivedCount}</p>
            </section>
            <section className="admin-stat-box" aria-labelledby="stat-preparing">
              <h3 id="stat-preparing" className="admin-stat-label">
                제조 중
              </h3>
              <p className="admin-stat-value">{preparingCount}</p>
            </section>
            <section className="admin-stat-box" aria-labelledby="stat-done">
              <h3 id="stat-done" className="admin-stat-label">
                제조 완료
              </h3>
              <p className="admin-stat-value">{doneCount}</p>
            </section>
          </div>
        </section>

        <section className="admin-section" aria-labelledby="inv-heading">
          <h2 id="inv-heading" className="admin-section-title">
            재고 현황
          </h2>
          <ul className="admin-inventory-grid">
            {MENU_ITEMS.map((item) => {
              const qty = inventory[item.id] ?? 0
              const level = stockLevelLabel(qty)
              return (
                <li key={item.id} className="admin-inv-card">
                  <p className="admin-inv-name">{item.name}</p>
                  <p className="admin-inv-qty">
                    <strong>{qty}</strong>개
                  </p>
                  <p className={`stock-status ${level.className}`}>{level.text}</p>
                  <div className="admin-inv-actions">
                    <button
                      type="button"
                      className="btn btn-qty"
                      aria-label={`${item.name} 재고 줄이기`}
                      onClick={() => onAdjustStock(item.id, -1)}
                      disabled={qty <= 0}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="btn btn-qty"
                      aria-label={`${item.name} 재고 늘리기`}
                      onClick={() => onAdjustStock(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="admin-section" aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="admin-section-title">
            주문 현황
          </h2>
          {sortedOrders.length === 0 ? (
            <p className="admin-orders-empty">접수된 주문이 없습니다.</p>
          ) : (
            <ul className="admin-orders-list">
              {sortedOrders.map((order) => (
                <li key={order.id} className="admin-order-row">
                  <div className="admin-order-meta">
                    <time dateTime={order.createdAt}>{formatOrderDateTime(order.createdAt)}</time>
                    <span className="admin-order-status">{orderStatusLabel(order.status)}</span>
                  </div>
                  <p className="admin-order-lines">{orderLinesSummary(order)}</p>
                  <p className="admin-order-total">{formatWon(order.total)}</p>
                  <div className="admin-order-action">
                    {order.status === ORDER_STATUS.RECEIVED && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onAdvanceOrder(order.id)}
                      >
                        제조 시작
                      </button>
                    )}
                    {order.status === ORDER_STATUS.PREPARING && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onAdvanceOrder(order.id)}
                      >
                        제조 완료
                      </button>
                    )}
                    {order.status === ORDER_STATUS.DONE && (
                      <span className="admin-order-done">처리 완료</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  )
}

export default function App() {
  const [screen, setScreen] = useState('order')
  const [orders, setOrders] = useState([])
  const [inventory, setInventory] = useState(initialInventory)
  const [toast, setToast] = useState(null)

  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (!toast) return undefined
    const id = window.setTimeout(() => setToast(null), 5200)
    return () => window.clearTimeout(id)
  }, [toast])

  const handlePlaceOrder = useCallback((cart) => {
    if (!canFulfillCart(cart, inventory)) {
      setToast({
        type: 'error',
        message: '재고가 부족하여 주문할 수 없습니다. 재고를 확인해 주세요.',
      })
      return false
    }
    const order = buildOrderFromCart(cart)
    setOrders((prev) => [order, ...prev])
    setInventory((prev) => inventoryAfterDeduction(cart, prev))
    setToast({ type: 'success', message: '주문이 접수되었습니다.' })
    return true
  }, [inventory])

  const handleAdvanceOrder = useCallback((orderId) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        if (o.status === ORDER_STATUS.RECEIVED) return { ...o, status: ORDER_STATUS.PREPARING }
        if (o.status === ORDER_STATUS.PREPARING) return { ...o, status: ORDER_STATUS.DONE }
        return o
      }),
    )
  }, [])

  const handleAdjustStock = useCallback((menuId, delta) => {
    setInventory((prev) => ({
      ...prev,
      [menuId]: Math.max(0, (prev[menuId] ?? 0) + delta),
    }))
  }, [])

  return (
    <div className="app">
      <ToastBanner toast={toast} onDismiss={dismissToast} />
      {screen === 'admin' ? (
        <AdminPage
          onGoOrder={() => setScreen('order')}
          orders={orders}
          onAdvanceOrder={handleAdvanceOrder}
          inventory={inventory}
          onAdjustStock={handleAdjustStock}
        />
      ) : (
        <OrderPage onGoAdmin={() => setScreen('admin')} onPlaceOrder={handlePlaceOrder} />
      )}
    </div>
  )
}

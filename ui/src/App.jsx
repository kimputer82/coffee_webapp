import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = 'http://127.0.0.1:4000/api'

/** 주문 상태: 신규는 주문 접수 → 제조 시작 → 제조 중 → 제조 완료 */
const ORDER_STATUS = {
  RECEIVED: '주문 접수',
  PREPARING: '제조 중',
  DONE: '제조 완료',
}

function formatWon(value) {
  return `${value.toLocaleString('ko-KR')}원`
}

function optionsKey(selection) {
  // selection is an object of {optionId: true/false}
  return Object.entries(selection)
    .filter(([_, checked]) => checked)
    .map(([id, _]) => id)
    .sort()
    .join(',')
}

function unitPrice(menu, selection) {
  const extras = menu.options.reduce(
    (sum, o) => sum + (selection[o.id] ? o.price : 0),
    0,
  )
  return menu.price + extras
}

function optionSummaryLabels(menu, selection) {
  const parts = menu.options.filter((o) => selection[o.id]).map((o) => o.name)
  return parts
}

function cartLineDescription(menu, selection) {
  const opts = optionSummaryLabels(menu, selection)
  const optText = opts.length ? ` (${opts.join(', ')})` : ''
  return `${menu.name}${optText}`
}

function createInitialSelections(menus) {
  const init = {}
  for (const m of menus) {
    init[m.id] = Object.fromEntries(m.options.map((o) => [o.id, false]))
  }
  return init
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

function OrderPage({ menus, onGoAdmin, onPlaceOrder }) {
  const [selections, setSelections] = useState({})
  const [cart, setCart] = useState([])

  useEffect(() => {
    if (menus.length > 0) {
      setSelections(createInitialSelections(menus))
    }
  }, [menus])

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
    const menu = menus.find((m) => m.id === menuId)
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

  async function placeOrder() {
    if (cart.length === 0) return
    const ok = await onPlaceOrder(cart)
    if (ok) setCart([])
  }

  if (menus.length === 0) return <div className="loading">메뉴를 불러오는 중...</div>

  return (
    <>
      <AppHeader active="order" onGoOrder={() => {}} onGoAdmin={onGoAdmin} />

      <main className="order-main">
        <section className="menu-section" aria-labelledby="menu-heading">
          <h2 id="menu-heading" className="visually-hidden">
            메뉴
          </h2>
          <ul className="menu-grid">
            {menus.map((item) => (
              <li key={item.id} className="menu-card">
                <div className="menu-card-image">
                  <img
                    src={item.image || 'https://via.placeholder.com/640x480?text=No+Image'}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={480}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/640x480?text=Image+Not+Found'
                    }}
                  />
                </div>
                <h3 className="menu-card-title">{item.name}</h3>
                <p className="menu-card-price">{formatWon(item.price)}</p>
                <p className="menu-card-desc">{item.description}</p>
                <ul className="menu-card-options">
                  {item.options.map((opt) => (
                    <li key={opt.id}>
                      <label className="option-row">
                        <input
                          type="checkbox"
                          checked={selections[item.id]?.[opt.id] || false}
                          onChange={() => toggleOption(item.id, opt.id)}
                        />
                        <span>
                          {opt.name} (+{formatWon(opt.price)})
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
                    const menu = menus.find((m) => m.id === line.menuId)
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

function AdminPage({ onGoOrder, orders, onAdvanceOrder, menus, onAdjustStock }) {
  const totalCount = orders.length
  const receivedCount = orders.filter((o) => o.status === ORDER_STATUS.RECEIVED).length
  const preparingCount = orders.filter((o) => o.status === ORDER_STATUS.PREPARING).length
  const doneCount = orders.filter((o) => o.status === ORDER_STATUS.DONE).length

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
            {menus.map((item) => {
              const qty = item.stock_quantity ?? 0
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
          {orders.length === 0 ? (
            <p className="admin-orders-empty">접수된 주문이 없습니다.</p>
          ) : (
            <ul className="admin-orders-list">
              {orders.map((order) => (
                <li key={order.id} className="admin-order-row">
                  <div className="admin-order-meta">
                    <time dateTime={order.created_at}>{formatOrderDateTime(order.created_at)}</time>
                    <span className="admin-order-status">{order.status}</span>
                  </div>
                  <p className="admin-order-lines">{order.lines.map(l => `${l.label} x ${l.qty}`).join(', ')}</p>
                  <p className="admin-order-total">{formatWon(order.total_amount)}</p>
                  <div className="admin-order-action">
                    {order.status === ORDER_STATUS.RECEIVED && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onAdvanceOrder(order.id, ORDER_STATUS.PREPARING)}
                      >
                        제조 시작
                      </button>
                    )}
                    {order.status === ORDER_STATUS.PREPARING && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onAdvanceOrder(order.id, ORDER_STATUS.DONE)}
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
  const [menus, setMenus] = useState([])
  const [orders, setOrders] = useState([])
  const [toast, setToast] = useState(null)

  const fetchMenus = useCallback(async () => {
    try {
      const endpoint = screen === 'admin' ? '/admin/menus' : '/menus'
      const res = await fetch(`${API_BASE_URL}${endpoint}`)
      const data = await res.json()
      setMenus(data)
    } catch (err) {
      console.error('Failed to fetch menus:', err)
      setToast({ type: 'error', message: '메뉴를 불러오는 데 실패했습니다. 서버 상태를 확인해 주세요.' })
    }
  }, [screen])

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`)
      const data = await res.json()
      setOrders(data)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    }
  }, [])

  useEffect(() => {
    fetchMenus()
    if (screen === 'admin') {
      fetchOrders()
    }
  }, [screen, fetchMenus, fetchOrders])

  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (!toast) return undefined
    const id = window.setTimeout(() => setToast(null), 5200)
    return () => window.clearTimeout(id)
  }, [toast])

  const handlePlaceOrder = useCallback(async (cart) => {
    const totalAmount = cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
    const orderItems = cart.map(line => {
      const menu = menus.find(m => m.id === line.menuId)
      const selectedOptions = menu.options.filter(o => line.selection[o.id])
      return {
        menuId: line.menuId,
        quantity: line.qty,
        amount: line.unitPrice * line.qty,
        options: selectedOptions
      }
    })

    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderItems, total_amount: totalAmount })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setToast({ type: 'error', message: data.error || '주문에 실패했습니다.' })
        return false
      }

      setToast({ type: 'success', message: '주문이 접수되었습니다.' })
      fetchMenus() // Update stock levels
      return true
    } catch (err) {
      setToast({ type: 'error', message: '서버 통신 오류가 발생했습니다.' })
      return false
    }
  }, [menus, fetchMenus])

  const handleAdvanceOrder = useCallback(async (orderId, nextStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      })
      if (res.ok) {
        fetchOrders()
      }
    } catch (err) {
      console.error('Failed to update order status:', err)
    }
  }, [fetchOrders])

  const handleAdjustStock = useCallback(async (menuId, delta) => {
    try {
      const res = await fetch(`${API_BASE_URL}/menus/${menuId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
      })
      if (res.ok) {
        fetchMenus()
      }
    } catch (err) {
      console.error('Failed to adjust stock:', err)
    }
  }, [fetchMenus])

  return (
    <div className="app">
      <ToastBanner toast={toast} onDismiss={dismissToast} />
      {screen === 'admin' ? (
        <AdminPage
          onGoOrder={() => setScreen('order')}
          orders={orders}
          onAdvanceOrder={handleAdvanceOrder}
          menus={menus}
          onAdjustStock={handleAdjustStock}
        />
      ) : (
        <OrderPage 
          menus={menus} 
          onGoAdmin={() => setScreen('admin')} 
          onPlaceOrder={handlePlaceOrder} 
        />
      )}
    </div>
  )
}

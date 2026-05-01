import { useMemo, useState } from 'react'
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

function AdminPlaceholder({ onGoOrder }) {
  return (
    <div className="page-placeholder">
      <p>관리자 화면은 이후 단계에서 구현됩니다.</p>
      <button type="button" className="btn btn-primary" onClick={onGoOrder}>
        주문하기로 돌아가기
      </button>
    </div>
  )
}

function OrderPage({ onGoAdmin }) {
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
    window.alert('주문이 접수되었습니다. (데모)')
    setCart([])
  }

  return (
    <>
      <header className="app-header">
        <span className="brand">COZY</span>
        <nav className="nav-tabs" aria-label="주요 메뉴">
          <span className="nav-tab nav-tab-active" aria-current="page">
            주문하기
          </span>
          <button type="button" className="nav-tab nav-tab-link" onClick={onGoAdmin}>
            관리자
          </button>
        </nav>
      </header>

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

export default function App() {
  const [screen, setScreen] = useState('order')

  if (screen === 'admin') {
    return (
      <div className="app">
        <header className="app-header">
          <span className="brand">COZY</span>
          <nav className="nav-tabs" aria-label="주요 메뉴">
            <button type="button" className="nav-tab nav-tab-link" onClick={() => setScreen('order')}>
              주문하기
            </button>
            <span className="nav-tab nav-tab-active" aria-current="page">
              관리자
            </span>
          </nav>
        </header>
        <AdminPlaceholder onGoOrder={() => setScreen('order')} />
      </div>
    )
  }

  return (
    <div className="app">
      <OrderPage onGoAdmin={() => setScreen('admin')} />
    </div>
  )
}

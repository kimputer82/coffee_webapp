const express = require('express')
const router = express.Router()
const { query } = require('./db')

// GET /api/menus - List menus for customers
router.get('/menus', async (req, res) => {
  try {
    const menusResult = await query('SELECT id, name, description, price, image FROM menus ORDER BY id')
    const optionsResult = await query('SELECT id, name, price, menu_id FROM options')

    const menus = menusResult.rows.map(menu => ({
      ...menu,
      options: optionsResult.rows.filter(opt => opt.menu_id === menu.id)
    }))

    res.json(menus)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/admin/menus - List menus with stock for admin
router.get('/admin/menus', async (req, res) => {
  try {
    const menusResult = await query('SELECT * FROM menus ORDER BY id')
    const optionsResult = await query('SELECT id, name, price, menu_id FROM options')

    const menus = menusResult.rows.map(menu => ({
      ...menu,
      options: optionsResult.rows.filter(opt => opt.menu_id === menu.id)
    }))

    res.json(menus)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/orders - Create order and deduct stock
router.post('/orders', async (req, res) => {
  const { items, total_amount } = req.body // items: [{menuId, quantity, amount, options: [{id, name, price}]}]

  try {
    // Start transaction (manually using query because we don't have a transaction helper)
    await query('BEGIN')

    // 1. Create order
    const orderResult = await query(
      'INSERT INTO orders (total_amount) VALUES ($1) RETURNING id, created_at, status, total_amount',
      [total_amount]
    )
    const orderId = orderResult.rows[0].id

    // 2. Process items and deduct stock
    for (const item of items) {
      // Check stock
      const menuResult = await query('SELECT stock_quantity, name FROM menus WHERE id = $1', [item.menuId])
      if (menuResult.rows.length === 0) {
        throw new Error(`Menu item ${item.menuId} not found`)
      }
      
      const currentStock = menuResult.rows[0].stock_quantity
      if (currentStock < item.quantity) {
        throw new Error(`재고가 부족합니다: ${menuResult.rows[0].name}`)
      }

      // Deduct stock
      await query(
        'UPDATE menus SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.menuId]
      )

      // Insert order item
      await query(
        'INSERT INTO order_items (order_id, menu_id, quantity, amount, options) VALUES ($1, $2, $3, $4, $5)',
        [orderId, item.menuId, item.quantity, item.amount, JSON.stringify(item.options)]
      )
    }

    await query('COMMIT')
    res.status(201).json(orderResult.rows[0])
  } catch (error) {
    await query('ROLLBACK')
    res.status(400).json({ error: error.message })
  }
})

// GET /api/orders - List orders for admin
router.get('/orders', async (req, res) => {
  try {
    const ordersResult = await query('SELECT * FROM orders ORDER BY created_at DESC')
    const orderItemsResult = await query(`
      SELECT oi.*, m.name as menu_name 
      FROM order_items oi 
      JOIN menus m ON oi.menu_id = m.id
    `)

    const orders = ordersResult.rows.map(order => ({
      ...order,
      lines: orderItemsResult.rows
        .filter(item => item.order_id === order.id)
        .map(item => ({
          id: item.id,
          menuId: item.menu_id,
          menuName: item.menu_name,
          qty: item.quantity,
          amount: item.amount,
          options: item.options,
          label: `${item.menu_name}${item.options.length ? ` (${item.options.map(o => o.name).join(', ')})` : ''}`
        }))
    }))

    res.json(orders)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/orders/:id/status - Update order status
router.patch('/orders/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  try {
    const result = await query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/menus/:id/stock - Update stock manually
router.patch('/menus/:id/stock', async (req, res) => {
  const { id } = req.params
  const { delta } = req.body // e.g., +1 or -1

  try {
    const result = await query(
      'UPDATE menus SET stock_quantity = GREATEST(0, stock_quantity + $1) WHERE id = $2 RETURNING *',
      [delta, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router

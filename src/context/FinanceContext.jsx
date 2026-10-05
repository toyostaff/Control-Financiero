import { useEffect, useState } from 'react'
import FinanceContext from './FinanceContextBase'

const STORAGE_KEY = 'control-financiero-data-v1'

const initialData = {
  accounts: [
    {
      id: 'account-cash',
      name: 'Efectivo',
      type: 'Efectivo',
      balance: 500,
      active: true,
    },
    {
      id: 'account-yape',
      name: 'Yape',
      type: 'Billetera digital',
      balance: 350,
      active: true,
    },
    {
      id: 'account-bcp',
      name: 'Cuenta BCP',
      type: 'Cuenta bancaria',
      balance: 2500,
      active: true,
    },
  ],

  categories: [
    { id: 'cat-1', name: 'Alimentación', type: 'expense', active: true },
    { id: 'cat-2', name: 'Transporte', type: 'expense', active: true },
    { id: 'cat-3', name: 'Vivienda', type: 'expense', active: true },
    { id: 'cat-4', name: 'Servicios', type: 'expense', active: true },
    { id: 'cat-5', name: 'Salud', type: 'expense', active: true },
    { id: 'cat-6', name: 'Educación', type: 'expense', active: true },
    { id: 'cat-7', name: 'Entretenimiento', type: 'expense', active: true },
    { id: 'cat-8', name: 'Otros', type: 'expense', active: true },

    { id: 'cat-9', name: 'Sueldo', type: 'income', active: true },
    { id: 'cat-10', name: 'Honorarios', type: 'income', active: true },
    { id: 'cat-11', name: 'Ventas', type: 'income', active: true },
    { id: 'cat-12', name: 'Bonos', type: 'income', active: true },
    {
      id: 'cat-13',
      name: 'Otros ingresos',
      type: 'income',
      active: true,
    },
  ],

  transactions: [],

  budgets: [
    {
      id: 'budget-1',
      category: 'Alimentación',
      limit: 800,
    },
    {
      id: 'budget-2',
      category: 'Transporte',
      limit: 400,
    },
    {
      id: 'budget-3',
      category: 'Servicios',
      limit: 500,
    },
  ],

  goals: [
    {
      id: 'goal-1',
      name: 'Fondo de emergencia',
      target: 5000,
      saved: 1800,
      deadline: '2027-03-31',
    },
    {
      id: 'goal-2',
      name: 'Viaje',
      target: 3000,
      saved: 750,
      deadline: '2027-07-31',
    },
  ],
}

function loadInitialData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return initialData
    }

    const parsed = JSON.parse(stored)

    return {
      accounts: Array.isArray(parsed.accounts)
        ? parsed.accounts
        : initialData.accounts,

      categories: Array.isArray(parsed.categories)
        ? parsed.categories
        : initialData.categories,

      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions
        : [],

      budgets: Array.isArray(parsed.budgets)
        ? parsed.budgets
        : initialData.budgets,

      goals: Array.isArray(parsed.goals)
        ? parsed.goals
        : initialData.goals,
    }
  } catch {
    return initialData
  }
}

export function FinanceProvider({ children }) {
  const [data, setData] = useState(loadInitialData)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  function addAccount(account) {
    setData((previous) => ({
      ...previous,

      accounts: [
        ...previous.accounts,
        {
          id: crypto.randomUUID(),
          name: account.name,
          type: account.type,
          balance: Number(account.balance),
          active: true,
        },
      ],
    }))
  }

  function toggleAccount(id) {
    setData((previous) => ({
      ...previous,

      accounts: previous.accounts.map((account) =>
        account.id === id
          ? {
              ...account,
              active: !account.active,
            }
          : account
      ),
    }))
  }

  function deleteAccount(id) {
    const hasTransactions = data.transactions.some(
      (transaction) => transaction.accountId === id
    )

    if (hasTransactions) {
      alert(
        'Esta cuenta tiene movimientos registrados. Desactívala en lugar de eliminarla.'
      )
      return
    }

    setData((previous) => ({
      ...previous,

      accounts: previous.accounts.filter(
        (account) => account.id !== id
      ),
    }))
  }

  function addCategory(category) {
    setData((previous) => ({
      ...previous,

      categories: [
        ...previous.categories,
        {
          id: crypto.randomUUID(),
          name: category.name,
          type: category.type,
          active: true,
        },
      ],
    }))
  }

  function toggleCategory(id) {
    setData((previous) => ({
      ...previous,

      categories: previous.categories.map((category) =>
        category.id === id
          ? {
              ...category,
              active: !category.active,
            }
          : category
      ),
    }))
  }

  function deleteCategory(id) {
    const category = data.categories.find(
      (item) => item.id === id
    )

    if (!category) {
      return
    }

    const hasTransactions = data.transactions.some(
      (transaction) =>
        transaction.category === category.name
    )

    const hasBudget = data.budgets.some(
      (budget) => budget.category === category.name
    )

    if (hasTransactions || hasBudget) {
      alert(
        'Esta categoría está siendo utilizada. Desactívala en lugar de eliminarla.'
      )
      return
    }

    setData((previous) => ({
      ...previous,

      categories: previous.categories.filter(
        (item) => item.id !== id
      ),
    }))
  }

  function addTransaction(transaction) {
    const amount = Number(transaction.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        message: 'Ingresa un importe válido.',
      }
    }

    if (
      !transaction.description?.trim() ||
      !transaction.category ||
      !transaction.accountId ||
      !transaction.date
    ) {
      return {
        ok: false,
        message: 'Completa todos los campos correctamente.',
      }
    }

    const account = data.accounts.find(
      (item) => item.id === transaction.accountId
    )

    if (!account || !account.active) {
      return {
        ok: false,
        message: 'Selecciona una cuenta activa.',
      }
    }

    if (
      transaction.type === 'expense' &&
      account.balance < amount
    ) {
      return {
        ok: false,
        message:
          'La cuenta seleccionada no tiene saldo suficiente.',
      }
    }

    const newTransaction = {
      id: crypto.randomUUID(),
      description: transaction.description.trim(),
      amount,
      category: transaction.category,
      accountId: transaction.accountId,
      account: account.name,
      date: transaction.date,
      type: transaction.type,
    }

    setData((previous) => ({
      ...previous,

      transactions: [
        newTransaction,
        ...previous.transactions,
      ],

      accounts: previous.accounts.map((item) => {
        if (item.id !== transaction.accountId) {
          return item
        }

        return {
          ...item,

          balance:
            transaction.type === 'income'
              ? item.balance + amount
              : item.balance - amount,
        }
      }),
    }))

    return {
      ok: true,
    }
  }

  function deleteTransaction(id) {
    setData((previous) => {
      const transaction = previous.transactions.find(
        (item) => item.id === id
      )

      if (!transaction) {
        return previous
      }

      return {
        ...previous,

        transactions: previous.transactions.filter(
          (item) => item.id !== id
        ),

        accounts: previous.accounts.map((account) => {
          if (account.id !== transaction.accountId) {
            return account
          }

          return {
            ...account,

            balance:
              transaction.type === 'income'
                ? account.balance - transaction.amount
                : account.balance + transaction.amount,
          }
        }),
      }
    })
  }

  function addBudget(budget) {
    setData((previous) => ({
      ...previous,

      budgets: [
        ...previous.budgets,
        {
          id: crypto.randomUUID(),
          category: budget.category,
          limit: Number(budget.limit),
        },
      ],
    }))
  }

  function deleteBudget(id) {
    setData((previous) => ({
      ...previous,

      budgets: previous.budgets.filter(
        (budget) => budget.id !== id
      ),
    }))
  }

  function addGoal(goal) {
    setData((previous) => ({
      ...previous,

      goals: [
        ...previous.goals,
        {
          id: crypto.randomUUID(),
          name: goal.name,
          target: Number(goal.target),
          saved: 0,
          deadline: goal.deadline,
        },
      ],
    }))
  }

  function addGoalContribution(id, amount) {
    const numericAmount = Number(amount)

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return false
    }

    setData((previous) => ({
      ...previous,

      goals: previous.goals.map((goal) =>
        goal.id === id
          ? {
              ...goal,

              saved: Math.min(
                goal.saved + numericAmount,
                goal.target
              ),
            }
          : goal
      ),
    }))

    return true
  }

  function deleteGoal(id) {
    setData((previous) => ({
      ...previous,

      goals: previous.goals.filter(
        (goal) => goal.id !== id
      ),
    }))
  }

  const value = {
    ...data,

    addAccount,
    toggleAccount,
    deleteAccount,

    addCategory,
    toggleCategory,
    deleteCategory,

    addTransaction,
    deleteTransaction,

    addBudget,
    deleteBudget,

    addGoal,
    addGoalContribution,
    deleteGoal,
  }

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  )
}
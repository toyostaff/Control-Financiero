import { useContext } from 'react'
import FinanceContext from '../context/FinanceContextBase'

export default function useFinance() {
  const context = useContext(FinanceContext)

  if (!context) {
    throw new Error(
      'useFinance debe utilizarse dentro de FinanceProvider.'
    )
  }

  return context
}